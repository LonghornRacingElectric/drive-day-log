import { useState } from 'react'
import { Loader2, Flag, Users } from 'lucide-react'

interface Props {
  onCreate: () => Promise<string>
  onJoin:   (code: string) => Promise<boolean>
}

export default function SessionGate({ onCreate, onJoin }: Props) {
  const [joinCode, setJoinCode]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

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
          <span>or join existing</span>
        </div>

        {/* Join existing session */}
        <div className="session-gate-join-row">
          <input
            className="session-code-input"
            placeholder="Session code (e.g. AB3X7K)"
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
      </div>
    </div>
  )
}
