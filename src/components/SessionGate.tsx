import { useState, useEffect } from 'react'
import { Loader2, Flag, Users, Clock } from 'lucide-react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'

interface Props {
  onCreate: () => Promise<string>
  onJoin:   (code: string) => Promise<boolean>
}

export default function SessionGate({ onCreate, onJoin }: Props) {
  const [joinCode, setJoinCode]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [recentSessions, setRecentSessions] = useState<{code: string, date: string, event: string}[]>([])

  useEffect(() => {
    async function fetchRecent() {
      try {
        const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(20))
        const snap = await getDocs(q)
        
        const validSessions = snap.docs
          .filter(doc => {
            const data = doc.data()
            // If the event name was never filled out, it's a dead/abandoned test session
            return data.meta && data.meta.event && data.meta.event.trim() !== ''
          })
          .slice(0, 5) // Keep only top 5 real sessions
          .map(doc => {
            const data = doc.data()
            return {
              code: doc.id,
              date: data.meta.date || 'Unknown Date',
              event: data.meta.event
            }
          })
          
        setRecentSessions(validSessions)
      } catch(err) {
        // Fail silently for recent sessions
      }
    }
    fetchRecent()
  }, [])

  async function handleCreate() {
    setError('')
    setLoading(true)
    try {
      await onCreate()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setError('Permission denied. Set Firestore rules to allow read/write and try again.')
      } else {
        setError(`Failed to create session: ${msg}`)
      }
      setLoading(false)
    }
  }

  async function handleJoin() {
    setError('')
    if (!joinCode.trim()) return
    setLoading(true)
    try {
      const ok = await onJoin(joinCode)
      if (!ok) setError('Session not found. Check the code and try again.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Failed to join: ${msg}`)
    }
    setLoading(false)
  }

  return (
    <div className="session-gate">
      <div className="session-gate-card">
        {/* Branding */}
        <div className="session-gate-brand">
          <img
            src="/lhr_logo.png"
            alt="Longhorn Racing"
            style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)', marginBottom: 12 }}
          />
          <h1 className="session-gate-title">Drive Day Log</h1>
          <p className="session-gate-sub">LONGHORN RACING ELECTRIC</p>
        </div>

        <div className="session-gate-divider" />

        {/* Start new session */}
        <button
          className="btn btn-primary session-gate-create"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Flag size={16} />}
          Start New Session
        </button>

        <div className="session-gate-or">
          <span>or join existing with code</span>
        </div>

        {/* Join existing session */}
        <div className="session-gate-join-row">
          <input
            className="session-code-input"
            placeholder="(e.g. CPBONER)"
            value={joinCode}
            maxLength={6}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase())
              setError('')
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
          />
          <button
            className="btn btn-ghost"
            onClick={handleJoin}
            disabled={loading || !joinCode.trim()}
          >
            <Users size={15} />
            Join
          </button>
        </div>

        {error && <p className="session-gate-error">{error}</p>}

        {recentSessions.length > 0 && (
          <>
            <div className="session-gate-divider" style={{ marginTop: 12, marginBottom: 12 }} />
            <div style={{ textAlign: 'left', width: '100%' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Recent Drive Days
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.map(sess => (
                  <button
                    key={sess.code}
                    className="btn btn-ghost"
                    disabled={loading}
                    onClick={async () => {
                      setJoinCode(sess.code)
                      setError('')
                      setLoading(true)
                      try {
                        const ok = await onJoin(sess.code)
                        if (!ok) setError('Session expired or deleted.')
                      } catch (err: unknown) {
                        setError('Failed to join session.')
                      }
                      setLoading(false)
                    }}
                    style={{ justifyContent: 'flex-start', border: '1px solid var(--border-subtle)', padding: '8px 12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 600, color: 'var(--orange-light)' }}>{sess.code}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{sess.date} — {sess.event}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
