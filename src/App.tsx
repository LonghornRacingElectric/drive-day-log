// React
import { useState, useEffect, useRef, useCallback } from 'react'

// Third party
import {
  Trash2,
  Pencil,
  Plus,
  MapPin,
  RotateCcw,
  Upload,
  Flag,
  Timer,
  Zap,
  Download,
  Trophy,
  BarChart2,
  LogOut,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react'

// Internal utilities
import {
  getBestTime,
  getAverageTime,
  getTotalPenalties,
  getPenaltiesPerLap,
  getStdDev,
  getFinalTime,
} from './calculations'
import type { Lap } from './calculations'

// Internal components
import LapTable from './components/LapTable'
import ConfirmModal from './components/ConfirmModal'
import ExportModal from './components/ExportModal'
import SessionGate from './components/SessionGate'

// Internal types
import type { Driver, SOCData, SessionMetadata } from './types/driveDay'
import { exportDriveDayPDF } from './exportPDF'
import { exportDriveDayXLSX } from './exportXLSX'
import { useSession, defaultMeta } from './hooks/useSession'

// ── MarshalTimerControls ───────────────────────────────────────────────────
// Standalone component that derives elapsed time from the live lap's
// startTimestamp stored in Firestore — works on any device, not just the
// one that pressed Start.
function MarshalTimerControls({
  driverId,
  liveLap,
  isRunning,
  onStart,
  onStop,
}: {
  driverId: string
  liveLap: Lap | undefined
  isRunning: boolean
  onStart: () => void
  onStop: (elapsedSeconds: number) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<number | null>(null)
  // Optimistic: flip to Start immediately on press; Firestore will confirm
  const [localStopped, setLocalStopped] = useState(false)

  // When Firestore confirms the lap is no longer live, reset optimistic state
  useEffect(() => {
    if (!isRunning) setLocalStopped(false)
  }, [isRunning])

  const effectivelyRunning = isRunning && !localStopped

  useEffect(() => {
    if (effectivelyRunning && liveLap?.startTimestamp) {
      // Kick off a local interval seeded from the Firestore timestamp
      setElapsed((Date.now() - liveLap.startTimestamp) / 1000)
      intervalRef.current = window.setInterval(() => {
        setElapsed((Date.now() - liveLap.startTimestamp!) / 1000)
      }, 50)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (!effectivelyRunning) setElapsed(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [effectivelyRunning, liveLap?.startTimestamp])

  return (
    <div className="timer-controls">
      <Timer size={16} style={{ color: 'var(--text-muted)' }} />
      {effectivelyRunning && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--orange-light)',
            letterSpacing: '-0.02em',
            minWidth: 80,
          }}
        >
          {elapsed.toFixed(2)}s
        </span>
      )}
      {effectivelyRunning && <span className="badge badge-live">● LIVE</span>}
      <div style={{ flex: 1 }} />
      {!effectivelyRunning ? (
        <button
          id={`marshal-start-${driverId}`}
          className="btn btn-start"
          onClick={onStart}
        >
          Start
        </button>
      ) : (
        <button
          id={`marshal-stop-${driverId}`}
          className="btn btn-stop"
          onClick={() => {
            setLocalStopped(true)   // optimistic: flip UI immediately
            onStop(elapsed)         // async Firestore write in background
          }}
        >
          Stop
        </button>
      )}
    </div>
  )
}

// ── SkidpadTimerControls ───────────────────────────────────────────────────
// Two-phase (Sector 1 → Sector 2) timer for Skidpad events.
// Phase is derived entirely from the live lap in Firestore so any device works.
function SkidpadTimerControls({
  driverId,
  liveLap,
  elapsed,
  onStartSection1,
  onStopSection1,
  onStartSection2,
  onStopSection2,
}: {
  driverId: string
  liveLap: Lap | undefined
  elapsed: number
  onStartSection1: () => void
  onStopSection1: (e: number) => void
  onStartSection2: () => void
  onStopSection2: (e: number) => void
}) {
  const isS1Running = !!liveLap?.startTimestamp && liveLap.time1 === null
  const isBetween   = !!liveLap && !liveLap.startTimestamp && liveLap.time1 != null && liveLap.time2 === null
  const isS2Running = !!liveLap?.startTimestamp && liveLap.time1 != null

  // Derive a stable string phase — avoids object-reference churn in useEffect deps
  const firestorePhase = isS1Running ? 's1' : isBetween ? 'between' : isS2Running ? 's2' : 'idle'

  // Optimistic override so Stop feels instant (Firestore confirm clears it)
  const [opt, setOpt] = useState<null | 'between' | 'idle'>(null)
  useEffect(() => {
    if (opt === 'between' && firestorePhase === 'between') setOpt(null)
    if (opt === 'idle'    && firestorePhase === 'idle')    setOpt(null)
  }, [firestorePhase, opt]) // string dep — only fires when phase actually changes

  const phase   = opt ?? firestorePhase
  const running = phase === 's1' || phase === 's2'

  return (
    <div className="timer-controls">
      <Timer size={16} style={{ color: 'var(--text-muted)' }} />
      {running && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700,
                       color: 'var(--orange-light)', letterSpacing: '-0.02em', minWidth: 80 }}>
          {elapsed.toFixed(2)}s
        </span>
      )}
      {running && <span className="badge badge-live">● LIVE</span>}
      <div style={{ flex: 1 }} />
      {phase === 'idle'    && <button id={`skidpad-s1-${driverId}`}    className="btn btn-start" onClick={onStartSection1}>Start Sector 1</button>}
      {phase === 's1'      && <button id={`skidpad-stop1-${driverId}`} className="btn btn-stop"  onClick={() => { setOpt('between'); onStopSection1(elapsed) }}>Stop</button>}
      {phase === 'between' && <button id={`skidpad-s2-${driverId}`}    className="btn btn-start" onClick={onStartSection2}>Start Sector 2</button>}
      {phase === 's2'      && <button id={`skidpad-stop2-${driverId}`} className="btn btn-stop"  onClick={() => { setOpt('idle');    onStopSection2(elapsed) }}>Stop</button>}
    </div>
  )
}

export default function App() {
  // ── Firestore session ────────────────────────────────────────────────────
  const session = useSession()
  const isMarshal = session.role === 'marshal'
  const [copied, setCopied] = useState(false)

  // ── Live timer state (local only — never written to Firestore) ────────────
  const [activeTimers, setActiveTimers] = useState<
    Record<
      string,
      { startTime: number; elapsed: number; intervalId: number | null }
    >
  >({})

  const startRef = useRef<Record<string, number>>({})
  // Always-current mirror of activeTimers — lets effects read the latest value
  // without adding activeTimers to their dependency arrays (which would cause loops)
  const activeTimersRef = useRef(activeTimers)
  activeTimersRef.current = activeTimers

  // ── Local UI state ────────────────────────────────────────────────────────
  const [newDriverName, setNewDriverName] = useState('')
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('driveDayLightMode') === 'true'
  })

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
    } else {
      document.documentElement.classList.remove('light-mode')
    }
    localStorage.setItem('driveDayLightMode', String(isLightMode))
  }, [isLightMode])

  // sessionMeta + trackImage — Firestore is the source of truth.
  // We keep local state for smooth editing and sync bidirectionally.
  const [sessionMeta, setSessionMeta] = useState<SessionMetadata>(defaultMeta)
  const [trackImage, setTrackImage] = useState<string | null>(null)
  const metaInitialized = useRef(false) // true once we've pulled from Firestore
  const metaDebounceTimer = useRef<number | null>(null)

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    onConfirm: () => {},
  })

  // Export modal
  const [exportModalOpen, setExportModalOpen] = useState(false)

  function openConfirm(opts: {
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => void
  }) {
    setConfirmModal({ open: true, confirmLabel: 'Delete', ...opts })
  }
  function closeConfirm() {
    setConfirmModal((m) => ({ ...m, open: false }))
  }

  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // ── Local comments state — prevents cursor-jump caused by Firestore round-trips
  const [localComments, setLocalComments] = useState<Record<string, string>>({})
  const commentFocused = useRef<Record<string, boolean>>({})

  const drivers = session.drivers

  // ── Firestore ↔ local sync ────────────────────────────────────────────────

  // 1. On first connect (or session change), pull meta + trackImage from Firestore
  //    and seed localComments for all drivers
  useEffect(() => {
    if (session.connected) {
      setSessionMeta(session.sessionMeta)
      setTrackImage(session.trackImage)
      metaInitialized.current = true
      const initial: Record<string, string> = {}
      session.drivers.forEach((d) => { initial[d.id] = d.comments ?? '' })
      setLocalComments(initial)
    }
  }, [session.connected, session.sessionCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // 1b. Sync localComments from Firestore only for drivers that are NOT focused
  useEffect(() => {
    setLocalComments((prev) => {
      const next = { ...prev }
      session.drivers.forEach((d) => {
        if (!commentFocused.current[d.id]) {
          next[d.id] = d.comments ?? ''
        }
      })
      return next
    })
  }, [session.drivers])

  // 2. Marshals: keep in sync whenever host changes meta
  useEffect(() => {
    if (session.role === 'marshal') {
      setSessionMeta(session.sessionMeta)
    }
  }, [session.sessionMeta, session.role])

  // 3. Marshals: keep in sync when host updates track image
  useEffect(() => {
    if (session.role === 'marshal') {
      setTrackImage(session.trackImage)
    }
  }, [session.trackImage, session.role])

  // 4. Host: debounce-write sessionMeta changes to Firestore (600 ms)
  const updateMetaDebounced = useCallback(
    (meta: SessionMetadata) => {
      if (metaDebounceTimer.current) clearTimeout(metaDebounceTimer.current)
      metaDebounceTimer.current = window.setTimeout(() => {
        session.updateMeta(meta)
      }, 600)
    },
    [session]
  )

  useEffect(() => {
    if (!metaInitialized.current) return // skip until we've pulled from Firestore
    if (session.role !== 'host') return
    updateMetaDebounced(sessionMeta)
    return () => {
      if (metaDebounceTimer.current) clearTimeout(metaDebounceTimer.current)
    }
  }, [sessionMeta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textareas
  useEffect(() => {
    session.drivers.forEach((driver) => {
      const el = textAreaRefs.current[driver.id]
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    })
  }, [session.drivers])

  // Sync activeTimers with Firestore — if a marshal (or another device) completed
  // a live lap, clear our local interval so the admin's button flips to Start too
  useEffect(() => {
    setActiveTimers((prev) => {
      const toRemove = Object.keys(prev).filter((driverId) => {
        const driver = session.drivers.find((d) => d.id === driverId)
        if (!driver) return false
        const liveLap = driver.laps.find((l) => l.isLive)
        // Clear when: no live lap at all, OR live lap exists but has no startTimestamp
        // (the latter is the Skidpad between-sections state — the lap stays live
        // but the timer must stop until Sector 2 begins)
        return !liveLap || !liveLap.startTimestamp
      })
      if (!toRemove.length) return prev
      const next = { ...prev }
      toRemove.forEach((id) => {
        if (next[id]?.intervalId !== null) clearInterval(next[id].intervalId!)
        delete next[id]
      })
      return next
    })
  }, [session.drivers])

  // Sync activeTimers with Firestore — if another device started a live lap
  // (marshal or second admin), spin up a local interval so this device also
  // shows Stop + elapsed time without needing to be the one who pressed Start.
  // IMPORTANT: setInterval must be created OUTSIDE any state updater function;
  // calling it inside a functional update causes double-invocation in Strict Mode.
  useEffect(() => {
    session.drivers.forEach((driver) => {
      const liveLap = driver.laps.find((l) => l.isLive)
      if (!liveLap?.startTimestamp) return
      if (activeTimersRef.current[driver.id]) return // already tracking this driver

      const ts = liveLap.startTimestamp
      startRef.current[driver.id] = ts

      const intervalId = window.setInterval(() => {
        setActiveTimers((p) => ({
          ...p,
          [driver.id]: {
            ...p[driver.id],
            elapsed: (Date.now() - ts) / 1000,
          },
        }))
      }, 50)

      setActiveTimers((prev) => ({
        ...prev,
        [driver.id]: {
          startTime: ts,
          elapsed: (Date.now() - ts) / 1000,
          intervalId,
        },
      }))
    })
  }, [session.drivers]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addDriver() {
    if (!newDriverName.trim()) return
    const driver: Driver = {
      id: crypto.randomUUID(),
      name: newDriverName.trim(),
      laps: [],
      sessionStart: '',
      sessionEnd: '',
      vehicle: '',
      comments: '',
      event: sessionMeta.event || '',
    }
    setNewDriverName('')
    await session.addDriver(driver)
  }

  async function updateLap(driverId: string, updatedLap: Lap) {
    const fsDriver = session.drivers.find((d) => d.id === driverId)
    if (!fsDriver) return
    const updated = {
      ...fsDriver,
      laps: fsDriver.laps.map((l) => (l.id === updatedLap.id ? updatedLap : l)),
    }
    await session.updateDriver(driverId, updated)
  }

  function deleteLap(driverId: string, lapId: string, index: number) {
    openConfirm({
      title: `Delete Lap ${index + 1}?`,
      message: 'This lap will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete Lap',
      onConfirm: async () => {
        const fsDriver = session.drivers.find((d) => d.id === driverId)
        if (!fsDriver) return
        await session.updateDriver(driverId, {
          ...fsDriver,
          laps: fsDriver.laps.filter((l) => l.id !== lapId),
        })
      },
    })
  }

  function deleteDriver(driverId: string, driverName: string) {
    openConfirm({
      title: `Delete ${driverName}'s Stint?`,
      message:
        'All laps and data for this stint will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete Stint',
      onConfirm: async () => {
        const t = activeTimers[driverId]
        if (t?.intervalId != null) clearInterval(t.intervalId)
        setActiveTimers((p) => {
          const u = { ...p }
          delete u[driverId]
          return u
        })
        await session.deleteDriver(driverId)
      },
    })
  }

  async function updateDriver(driverId: string, updated: Driver) {
    await session.updateDriver(driverId, updated)
  }

  function updateSOC(updated: SOCData) {
    setSessionMeta((meta) => {
      const updatedRows = meta.stateOfCharge.map((row) =>
        row.id === updated.id ? updated : row
      )

      const lastRow = updatedRows[updatedRows.length - 1]
      const isLast = updated.id === lastRow.id
      const isComplete =
        updated.initialSOC &&
        updated.finalSOC &&
        updated.initialVolts &&
        updated.finalVolts

      if (isLast && isComplete) {
        return {
          ...meta,
          stateOfCharge: [
            ...updatedRows,
            {
              id: crypto.randomUUID(),
              initialSOC: '',
              finalSOC: '',
              initialVolts: '',
              finalVolts: '',
            },
          ],
        }
      }

      return {
        ...meta,
        stateOfCharge: updatedRows,
      }
    })
  }

  function resetSession() {
    openConfirm({
      title: 'Reset Session?',
      message:
        'This will permanently remove all drivers, laps, and session info. This cannot be undone.',
      confirmLabel: 'Reset Everything',
      onConfirm: async () => {
        Object.values(activeTimers).forEach((t) => {
          if (t.intervalId != null) clearInterval(t.intervalId)
        })
        setActiveTimers({})
        setTrackImage(null)
        setSessionMeta(defaultMeta)
        localStorage.removeItem('trackImage')
        localStorage.removeItem('driveDayMeta')
        await session.resetAllDrivers(session.drivers)
      },
    })
  }

  function startTimer(driver: Driver) {
    const now = Date.now()

    // Clear any existing interval for this driver before starting fresh.
    // This prevents leaked intervals when the mirror effect and startTimer
    // both run for the same driver (e.g., admin presses Start right after
    // the Firestore snapshot from a marshal start fires).
    const existing = activeTimersRef.current[driver.id]
    if (existing?.intervalId != null) clearInterval(existing.intervalId)

    startRef.current[driver.id] = now
    const liveLap: Lap = {
      id: crypto.randomUUID(),
      time1: 0,
      time2: null,
      cones: 0,
      offTrack: 0,
      isLive: true,
      startTimestamp: now,
    }
    let sessionStart = driver.sessionStart
    if (!sessionStart || sessionStart.trim() === '') {
      const now2 = new Date()
      const hh = String(now2.getHours()).padStart(2, '0')
      const mm = String(now2.getMinutes()).padStart(2, '0')
      sessionStart = `${hh}:${mm}`
    }

    session.updateDriver(driver.id, {
      ...driver,
      sessionStart,
      laps: [...driver.laps, liveLap],
    })
    const intervalId = window.setInterval(() => {
      setActiveTimers((prev) => ({
        ...prev,
        [driver.id]: {
          ...prev[driver.id],
          elapsed: (Date.now() - startRef.current[driver.id]) / 1000,
        },
      }))
    }, 50)
    setActiveTimers((prev) => ({
      ...prev,
      [driver.id]: { startTime: now, elapsed: 0, intervalId },
    }))
  }

  async function recordLap(driver: Driver) {
    const elapsed = activeTimers[driver.id]?.elapsed ?? 0
    const fsDriver = session.drivers.find((d) => d.id === driver.id)
    if (!fsDriver) return

    const liveLapIndex = fsDriver.laps.findIndex((l) => l.isLive)
    if (liveLapIndex === -1) return

    const completedLap: Lap = {
      ...fsDriver.laps[liveLapIndex],
      time1: parseFloat(elapsed.toFixed(3)),
      isLive: false,
    }

    const newLiveLap: Lap = {
      id: crypto.randomUUID(),
      time1: 0,
      time2: null,
      cones: 0,
      offTrack: 0,
      isLive: true,
    }

    const newLaps = [...fsDriver.laps]
    newLaps[liveLapIndex] = completedLap
    newLaps.push(newLiveLap)

    // Fire off update without awaiting to prevent blocking timer reset on bad connection
    session.updateDriver(driver.id, {
      ...fsDriver,
      laps: newLaps,
    }).catch(console.error)

    startRef.current[driver.id] = Date.now()
    setActiveTimers((prev) => ({
      ...prev,
      [driver.id]: { ...prev[driver.id], startTime: Date.now(), elapsed: 0 },
    }))
  }

  async function stopTimer(driverId: string) {
    const timer = activeTimers[driverId]
    if (!timer) return
    if (timer.intervalId !== null) clearInterval(timer.intervalId)

    const fsDriver = session.drivers.find((d) => d.id === driverId)
    if (fsDriver) {
      const liveLapIndex = fsDriver.laps.findIndex((l) => l.isLive)
      if (liveLapIndex !== -1) {
        const completedLap: Lap = {
          ...fsDriver.laps[liveLapIndex],
          time1: parseFloat((timer.elapsed ?? 0).toFixed(3)),
          isLive: false,
        }
        const newLaps = [...fsDriver.laps]
        newLaps[liveLapIndex] = completedLap
        // Fire off update without awaiting
        session.updateDriver(driverId, {
          ...fsDriver,
          laps: newLaps,
        }).catch(console.error)
      }
    }

    setActiveTimers((prev) => {
      const u = { ...prev }
      delete u[driverId]
      return u
    })
  }

  // Helper: get driver initials
  function getInitials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isTimerActive = (driverId: string) =>
    !!activeTimers[driverId]?.startTime

  // ── Session gate & loading guards ─────────────────────────────────────────
  if (!session.sessionCode) {
    return (
      <SessionGate
        onCreate={session.createSession}
        onJoin={session.joinSession}
      />
    )
  }

  if (session.loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 12,
          color: 'var(--text-muted)',
        }}
      >
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: '0.9rem' }}>Connecting to session…</span>
      </div>
    )
  }

  if (!session.connected) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 16,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <span style={{ fontSize: '0.95rem' }}>
          Unable to connect to session.
        </span>
        <button
          className="btn btn-ghost"
          onClick={session.leaveSession}
          style={{ marginTop: 4 }}
        >
          Back to Session Gate
        </button>
      </div>
    )
  }

  if (isMarshal) {
    return (
      <>
        <header className="app-header">
        <div className="header-inner header-scrollable">
          <div className="header-brand">
            <img
              src="/lhr_logo.png"
              alt="Longhorn Racing"
              style={{
                height: 50,
                width: 'auto',
                filter: isLightMode ? 'brightness(0)' : 'brightness(0) invert(1)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Theme Toggle */}
            <button
              className="btn btn-ghost"
              onClick={() => setIsLightMode(!isLightMode)}
              title="Toggle Light/Dark Mode"
              style={{ padding: '6px' }}
            >
              {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Session code badge */}
            <div
              className="session-code-badge"
              title="Click to copy session code"
              onClick={() => {
                if (session.sessionCode) {
                  navigator.clipboard.writeText(session.sessionCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1000)
                }
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span
                style={{
                  minWidth: '6ch',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                {copied ? 'COPIED' : session.sessionCode}
              </span>
            </div>

            {/* Role badge */}
            <div
              className={`role-badge ${isMarshal ? 'marshal' : 'admin'}`}
              title="User role"
            >
              {isMarshal ? 'MARSHAL' : 'ADMIN'}
            </div>            

            <button
              id="leave-session-btn"
              className="btn btn-ghost"
              onClick={session.leaveSession}
              title="Leave session"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

        <div className="main-panel" style={{ padding: 12 }}>
          {session.drivers.map((driver) => {
            const completedLaps = driver.laps.filter((l) => !l.isLive)
            const best = getBestTime(completedLaps)
            const isAcceleration = driver.event === 'Acceleration'
            const isSkidpad = driver.event === 'Skidpad'
            const liveLap = driver.laps.find((l) => l.isLive)
            const isRunning = !!liveLap
            const activeSection: 1 | 2 | null =
              liveLap?.startTimestamp && liveLap.time1 === null ? 1 :
              liveLap?.startTimestamp && liveLap.time1 != null  ? 2 : null

            return (
              <div key={driver.id} className="driver-card">
                <div className="driver-header">
                  <div className="driver-name">{driver.name}</div>
                  {driver.event && (
                    <div className="driver-vehicle-badge" style={{ marginLeft: 8 }}>
                      {driver.event}
                    </div>
                  )}
                </div>

                <LapTable
                  laps={driver.laps}
                  bestTime={best}
                  activeElapsed={activeTimers[driver.id]?.elapsed ?? 0}
                  activeSection={activeSection}
                  isSkidpad={isSkidpad}
                  onUpdateLap={(lap) => updateLap(driver.id, lap)}
                  onDeleteLap={() => {}}
                  isMarshal={isMarshal}
                  isAcceleration={isAcceleration}
                />

                {!isSkidpad && (
                  <MarshalTimerControls
                    driverId={driver.id}
                    liveLap={liveLap}
                    isRunning={isRunning}
                    onStart={() => startTimer(driver)}
                    onStop={(elapsed) => {
                      session.marshalCompleteLap(driver.id, elapsed).catch(console.error)
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <>
      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={() => {
          confirmModal.onConfirm()
          closeConfirm()
        }}
        onCancel={closeConfirm}
      />

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportPDF={() => exportDriveDayPDF(sessionMeta, drivers)}
        onExportXLSX={() => exportDriveDayXLSX(drivers)}
      />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner header-scrollable">
          <div className="header-brand">
            <img
              src="/lhr_logo.png"
              alt="Longhorn Racing"
              style={{
                height: 44,
                width: 'auto',
                filter: isLightMode ? 'brightness(0)' : 'brightness(0) invert(1)',
              }}
            />
            {!isMarshal && (
              <div className="header-titles">
                <h1>Drive Day Log</h1>
                <div className="subtitle">Longhorn Racing Electric</div>
              </div>
            )}
          </div>


          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Theme Toggle */}
            <button
              className="btn btn-ghost"
              onClick={() => setIsLightMode(!isLightMode)}
              title="Toggle Light/Dark Mode"
              style={{ padding: '6px' }}
            >
              {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Role badge */}
            <div
              className={`role-badge ${isMarshal ? 'marshal' : 'admin'}`}
              title="User role"
            >
              {isMarshal ? 'MARSHAL' : 'ADMIN'}
            </div>

            {/* Session code badge */}
            <div
              className="session-code-badge"
              title="Click to copy session code"
              onClick={() => {
                if (session.sessionCode) {
                  navigator.clipboard.writeText(session.sessionCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1000)
                }
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span
                style={{
                  minWidth: '6ch',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                {copied ? 'COPIED' : session.sessionCode}
              </span>
            </div>

            {!isMarshal && (
              <button
                id="export-pdf-btn"
                className="btn btn-ghost"
                onClick={() => setExportModalOpen(true)}
                title="Export drive day report"
              >
                <Download size={14} />
                Export
              </button>
            )}

            {!isMarshal && (
              <button
                id="reset-session-btn"
                className="btn btn-danger"
                onClick={resetSession}
              >
                <RotateCcw size={14} />
                Reset Session
              </button>
            )}

            <button
              id="leave-session-btn"
              className="btn btn-ghost"
              onClick={session.leaveSession}
              title="Leave session"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="app-layout">
        {/* ===== LEFT / MAIN PANEL ===== */}
        <div className="main-panel">
          {/* Session Info Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Flag
                  size={12}
                  style={{
                    display: 'inline',
                    marginRight: 6,
                    verticalAlign: 'middle',
                    color: 'var(--orange-light)',
                  }}
                />
                Session Info
              </span>
            </div>

            {/* Row 1: Date / Weather / Session Goals */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 240px 280px',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div className="field">
                <label className="field-label" htmlFor="session-date">
                  Date
                </label>
                <input
                  id="session-date"
                  type="date"
                  value={sessionMeta.date}
                  onChange={(e) =>
                    setSessionMeta({ ...sessionMeta, date: e.target.value })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="session-weather">
                  Weather
                </label>
                <input
                  id="session-weather"
                  type="text"
                  placeholder="e.g. Sunny, 75°F"
                  value={sessionMeta.weather}
                  onChange={(e) =>
                    setSessionMeta({ ...sessionMeta, weather: e.target.value })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="session-goals">
                  Session Goals
                </label>
                <input
                  type="text"
                  id="session-goals"
                  value={sessionMeta.sessionGoals}
                  onChange={(e) =>
                    setSessionMeta({ ...sessionMeta, sessionGoals: e.target.value })
                  }
                  placeholder="Enter session objectives…"
                  disabled={isMarshal}
                />
              </div>
            </div>

            {/* Row 2: Day Start / Day End / Total Distance */}
            <div
              className="form-grid"
              style={{
                gridTemplateColumns: 'repeat(4, 1fr)',
                marginBottom: 14,
              }}
            >
              <div className="field">
                <label className="field-label" htmlFor="session-start">
                  Day Start
                </label>
                <input
                  id="session-start"
                  type="time"
                  step={60}
                  value={sessionMeta.startTime}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      startTime: e.target.value,
                    })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="session-end">
                  Day End
                </label>
                <input
                  id="session-end"
                  type="time"
                  step={60}
                  value={sessionMeta.endTime}
                  onChange={(e) =>
                    setSessionMeta({ ...sessionMeta, endTime: e.target.value })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="total-distance">
                  Total Distance
                </label>
                <input
                  id="total-distance"
                  type="number"
                  placeholder="mi"
                  value={sessionMeta.totalDistance}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      totalDistance: e.target.value,
                    })
                  }
                  disabled={isMarshal}
                />
              </div>
            </div>
          </div>

          {/* Track Conditions Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Track Conditions</span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="field-label" htmlFor="cond-wind">
                  Wind (mph)
                </label>
                <input
                  id="cond-wind"
                  type="number"
                  value={sessionMeta.trackConditions.wind}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      trackConditions: {
                        ...sessionMeta.trackConditions,
                        wind: e.target.value,
                      },
                    })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="cond-humidity">
                  Humidity (%)
                </label>
                <input
                  id="cond-humidity"
                  type="number"
                  value={sessionMeta.trackConditions.humidity}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      trackConditions: {
                        ...sessionMeta.trackConditions,
                        humidity: e.target.value,
                      },
                    })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="cond-ambient">
                  Ambient Temp (°F)
                </label>
                <input
                  id="cond-ambient"
                  type="number"
                  value={sessionMeta.trackConditions.ambientTemp}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      trackConditions: {
                        ...sessionMeta.trackConditions,
                        ambientTemp: e.target.value,
                      },
                    })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="cond-track-temp">
                  Track Temp (°F)
                </label>
                <input
                  id="cond-track-temp"
                  type="number"
                  value={sessionMeta.trackConditions.trackTemp}
                  onChange={(e) =>
                    setSessionMeta({
                      ...sessionMeta,
                      trackConditions: {
                        ...sessionMeta.trackConditions,
                        trackTemp: e.target.value,
                      },
                    })
                  }
                  disabled={isMarshal}
                />
              </div>

              <div className="field">
                <label className="field-label">Wet Track (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <input
                    id="cond-wet"
                    type="range"
                    min="0"
                    max="100"
                    value={sessionMeta.trackConditions.wetTrack ?? 0}
                    onChange={(e) =>
                      setSessionMeta({
                        ...sessionMeta,
                        trackConditions: {
                          ...sessionMeta.trackConditions,
                          wetTrack: Number(e.target.value),
                        },
                      })
                    }
                    disabled={isMarshal}
                    style={{ flex: 1, accentColor: 'var(--orange-light)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '40px', fontFamily: 'var(--font-mono)' }}>
                    {sessionMeta.trackConditions.wetTrack ?? 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* State of Charge Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Zap
                  size={12}
                  style={{
                    display: 'inline',
                    marginRight: 6,
                    verticalAlign: 'middle',
                    color: 'var(--orange-light)',
                  }}
                />
                State of Charge
              </span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Initial SOC</th>
                  <th>Final SOC</th>
                  <th>Initial V</th>
                  <th>Final V</th>
                </tr>
              </thead>
              <tbody>
                {sessionMeta.stateOfCharge.map((row, index) => (
                  <tr key={row.id}>
                    <td className="row-num">{index + 1}</td>

                    {(
                      [
                        'initialSOC',
                        'finalSOC',
                        'initialVolts',
                        'finalVolts',
                      ] as const
                    ).map((field) => (
                      <td key={field}>
                        <input
                          className="table-input"
                          value={row[field]}
                          onChange={(e) =>
                            updateSOC({ ...row, [field]: e.target.value })
                          }
                          id={`soc-${index}-${field}`}
                          disabled={isMarshal}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Driver Row */}
          {!isMarshal && (
            <div className="add-driver-row section-gap">
              <Plus
                size={16}
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              />
              <select
                id="new-driver-name"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select driver…</option>
                <option>Viraj Bhalla</option>
                <option>Andrew Cloran</option>
                <option>Luke Ballengee</option>
                <option>Ali Jensen</option>
                <option>Oliver Belforti</option>
                <option>Shreyas Vatts</option>
              </select>
              <button
                id="add-driver-btn"
                className="btn btn-primary"
                onClick={addDriver}
              >
                Add Driver
              </button>
            </div>
          )}

          {/* ── Driver Cards ── */}
          {drivers.map((driver) => {
            const completedLaps = driver.laps.filter((lap) => !lap.isLive)
            const best = getBestTime(completedLaps)
            const avg = getAverageTime(completedLaps)
            const penalties = getTotalPenalties(completedLaps)
            const penPerLap = getPenaltiesPerLap(completedLaps)
            const stdDev = getStdDev(completedLaps)
            const timerActive = isTimerActive(driver.id)
            const isAcceleration = driver.event === 'Acceleration'
            const isSkidpad = driver.event === 'Skidpad'
            const liveLap = driver.laps.find((l) => l.isLive)
            const activeSection: 1 | 2 | null =
              liveLap?.startTimestamp && liveLap.time1 === null ? 1 :
              liveLap?.startTimestamp && liveLap.time1 != null  ? 2 : null

            return (
              <div
                key={driver.id}
                id={`driver-${driver.id}`}
                className="driver-card"
              >
                {/* Driver Header */}
                <div className="driver-header">
                  <div className="driver-avatar">
                    {getInitials(driver.name)}
                  </div>

                  <div className="driver-name-area">
                    {editingDriverId === driver.id ? (
                      <input
                        className="driver-name-input"
                        value={editingName}
                        autoFocus
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                          updateDriver(driver.id, {
                            ...driver,
                            name: editingName.trim() || driver.name,
                          })
                          setEditingDriverId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateDriver(driver.id, {
                              ...driver,
                              name: editingName.trim() || driver.name,
                            })
                            setEditingDriverId(null)
                          }
                        }}
                      />
                    ) : (
                      <div className="driver-name">{driver.name}</div>
                    )}
                    {driver.vehicle && (
                      <div className="driver-vehicle-badge">
                        {driver.vehicle}
                      </div>
                    )}
                  </div>

                  {/* Stats chips */}
                  <div className="driver-stats">
                    <div className="stat-chip">
                      <div className="label">Best Time</div>
                      <div className={`value ${best != null ? 'best' : ''}`}>
                        {best != null ? `${best.toFixed(2)}s` : '—'}
                      </div>
                    </div>
                    <div className="stat-chip">
                      <div className="label">Avg Time </div>
                      <div className="value">
                        {avg != null ? `${avg.toFixed(2)}s` : '—'}
                      </div>
                    </div>
                    <div className="stat-chip">
                      <div className="label">Laps</div>
                      <div className="value">{completedLaps.length}</div>
                    </div>
                    <div className="stat-chip">
                      <div className="label">Penalties</div>
                      <div
                        className={`value ${penalties > 0 ? 'penalty' : ''}`}
                      >
                        {completedLaps.length ? penalties : '—'}
                      </div>
                    </div>
                    <div className="stat-chip">
                      <div className="label">Penalties / Lap</div>
                      <div className="value">
                        {penPerLap != null ? penPerLap.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="stat-chip">
                      <div className="label">Consistency</div>
                      <div className="value">
                        {stdDev != null ? `±${stdDev.toFixed(2)}s` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isMarshal && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                      <button
                        id={`edit-driver-${driver.id}`}
                        className="btn-icon"
                        title="Edit Driver Name"
                        onClick={() => {
                          setEditingDriverId(driver.id)
                          setEditingName(driver.name)
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        id={`delete-driver-${driver.id}`}
                        className="btn-icon danger"
                        title="Delete Stint"
                        onClick={() => deleteDriver(driver.id, driver.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Driver Body — fields */}
                <div className="driver-body">
                  <div className="driver-fields-row">
                    <div className="driver-field-sm field">
                      <label
                        className="field-label"
                        htmlFor={`stint-start-${driver.id}`}
                      >
                        Stint Start
                      </label>
                      <input
                        id={`stint-start-${driver.id}`}
                        type="time"
                        value={driver.sessionStart}
                        onChange={(e) =>
                          updateDriver(driver.id, {
                            ...driver,
                            sessionStart: e.target.value,
                          })
                        }
                        disabled={isMarshal}
                      />
                    </div>

                    <div className="driver-field-sm field">
                      <label
                        className="field-label"
                        htmlFor={`stint-end-${driver.id}`}
                      >
                        Stint End
                      </label>
                      <input
                        id={`stint-end-${driver.id}`}
                        type="time"
                        value={driver.sessionEnd}
                        onChange={(e) =>
                          updateDriver(driver.id, {
                            ...driver,
                            sessionEnd: e.target.value,
                          })
                        }
                        disabled={isMarshal}
                      />
                    </div>

                    <div className="driver-field-sm field">
                      <label
                        className="field-label"
                        htmlFor={`vehicle-${driver.id}`}
                      >
                        Vehicle
                      </label>
                      <select
                        id={`vehicle-${driver.id}`}
                        value={driver.vehicle}
                        onChange={(e) => {
                          const vehicle = e.target.value
                          const isCar =
                            vehicle === 'Angelique' || vehicle === 'Orion'

                          const fsDriver = session.drivers.find(
                            (d) => d.id === driver.id
                          )
                          if (!fsDriver) return

                          const updated: Driver = {
                            ...fsDriver,
                            vehicle,
                            ...(isCar && {
                              tires: fsDriver.tires ?? {
                                frontRight: {
                                  coldP: '',
                                  coldT: '',
                                  hotP: '',
                                  hotT: '',
                                  depth: '',
                                },
                                frontLeft: {
                                  coldP: '',
                                  coldT: '',
                                  hotP: '',
                                  hotT: '',
                                  depth: '',
                                },
                                rearRight: {
                                  coldP: '',
                                  coldT: '',
                                  hotP: '',
                                  hotT: '',
                                  depth: '',
                                },
                                rearLeft: {
                                  coldP: '',
                                  coldT: '',
                                  hotP: '',
                                  hotT: '',
                                  depth: '',
                                },
                              },
                            }),
                          }

                          updateDriver(driver.id, updated)
                        }}
                        disabled={isMarshal}
                      >
                        <option value="">Vehicle</option>
                        <option value="KA 100">KA 100</option>
                        <option value="Rotax">Rotax</option>
                        <option value="Shifter">Shifter</option>
                        <option value="Angelique">Angelique</option>
                        <option value="Orion">Orion</option>
                      </select>
                    </div>

                    <div className="driver-field-sm field">
                      <label
                        className="field-label"
                        htmlFor={`stint-event-${driver.id}`}
                      >
                        Event
                      </label>
                      <select
                        id={`stint-event-${driver.id}`}
                        value={driver.event ?? ''}
                        onChange={(e) =>
                          updateDriver(driver.id, {
                            ...driver,
                            event: e.target.value,
                          })
                        }
                        disabled={isMarshal}
                      >
                        <option value="">Select</option>
                        <option value="Skidpad">Skidpad</option>
                        <option value="Autocross">Autocross</option>
                        <option value="Endurance">Endurance</option>
                        <option value="Acceleration">Acceleration</option>
                      </select>
                    </div>

                    <div className="driver-field-grow field">
                      <label
                        className="field-label"
                        htmlFor={`comments-${driver.id}`}
                      >
                        Comments / Notes
                      </label>
                      <textarea
                        id={`comments-${driver.id}`}
                        ref={(el) => {
                          textAreaRefs.current[driver.id] = el
                        }}
                        value={localComments[driver.id] ?? driver.comments ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setLocalComments((prev) => ({ ...prev, [driver.id]: val }))
                        }}
                        onFocus={() => {
                          commentFocused.current[driver.id] = true
                        }}
                        onBlur={() => {
                          commentFocused.current[driver.id] = false
                          updateDriver(driver.id, {
                            ...driver,
                            comments: localComments[driver.id] ?? '',
                          })
                        }}
                        placeholder="Setup notes, observations…"
                        disabled={isMarshal}
                      />
                    </div>
                  </div>

                  {/* Lap Table */}
                  <LapTable
                    laps={driver.laps}
                    bestTime={best}
                    activeElapsed={activeTimers[driver.id]?.elapsed ?? 0}
                    activeSection={activeSection}
                    isSkidpad={isSkidpad}
                    onUpdateLap={(lap) => updateLap(driver.id, lap)}
                    onDeleteLap={(lapId, index) =>
                      deleteLap(driver.id, lapId, index)
                    }
                    isMarshal={isMarshal}
                    isAcceleration={isAcceleration}
                  />
                </div>

                {/* Timer Controls */}
                {isSkidpad ? (
                  <SkidpadTimerControls
                    driverId={driver.id}
                    liveLap={liveLap}
                    elapsed={activeTimers[driver.id]?.elapsed ?? 0}
                    onStartSection1={() => session.skidpadStartSection1(driver.id).catch(console.error)}
                    onStopSection1={(e) => session.skidpadStopSection1(driver.id, e).catch(console.error)}
                    onStartSection2={() => session.skidpadStartSection2(driver.id).catch(console.error)}
                    onStopSection2={(e) => session.skidpadStopSection2(driver.id, e).catch(console.error)}
                  />
                ) : (
                  <div className="timer-controls">
                    <Timer size={16} style={{ color: 'var(--text-muted)' }} />
                    {timerActive && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700,
                                     color: 'var(--orange-light)', letterSpacing: '-0.02em', minWidth: 80 }}>
                        {(activeTimers[driver.id]?.elapsed ?? 0).toFixed(2)}s
                      </span>
                    )}
                    {timerActive && <span className="badge badge-live">● LIVE</span>}
                    <div style={{ flex: 1 }} />
                    {isAcceleration ? (
                      !timerActive ? (
                        <button id={`start-timer-${driver.id}`} className="btn btn-start" onClick={() => startTimer(driver)}>Start</button>
                      ) : (
                        <button id={`stop-timer-${driver.id}`} className="btn btn-stop" onClick={() => stopTimer(driver.id)}>Stop</button>
                      )
                    ) : (
                      !isMarshal && (
                        !timerActive ? (
                          <button id={`start-timer-${driver.id}`} className="btn btn-start" onClick={() => startTimer(driver)}>Start</button>
                        ) : (
                          <>
                            <button id={`lap-timer-${driver.id}`} className="btn btn-lap" onClick={() => recordLap(driver)}>Lap</button>
                            <button id={`stop-timer-${driver.id}`} className="btn btn-stop" onClick={() => stopTimer(driver.id)}>Stop</button>
                          </>
                        )
                      )
                    )}
                  </div>
                )}

                {/* Tire Data */}
                {driver.tires && (
                  <div className="tire-section">
                    <div className="tire-section-title">
                      Tire Data — {driver.name}
                    </div>
                    <table className="tire-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Corner</th>
                          <th>Cold P (psi)</th>
                          <th>Cold T (°C)</th>
                          <th>Hot P (psi)</th>
                          <th>Hot T (°C)</th>
                          <th>Depth (in)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            { key: 'frontRight', label: 'Front Right' },
                            { key: 'frontLeft', label: 'Front Left' },
                            { key: 'rearRight', label: 'Rear Right' },
                            { key: 'rearLeft', label: 'Rear Left' },
                          ] as const
                        ).map(({ key, label }) => {
                          const tire =
                            driver.tires![key as keyof typeof driver.tires]!

                          return (
                            <tr key={key}>
                              <td className="tire-label">{label}</td>
                              {(
                                [
                                  'coldP',
                                  'coldT',
                                  'hotP',
                                  'hotT',
                                  'depth',
                                ] as const
                              ).map((field) => (
                                <td key={field}>
                                  <input
                                    className="tire-input"
                                    type="text"
                                    value={tire[field]}
                                    id={`tire-${driver.id}-${key}-${field}`}
                                    onChange={(e) =>
                                      updateDriver(driver.id, {
                                        ...driver,
                                        tires: {
                                          ...driver.tires!,
                                          [key]: {
                                            ...tire,
                                            [field]: e.target.value,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ===== RIGHT / SIDEBAR ===== */}
        <div className="side-panel">
          <div className="track-card">
            <div className="track-card-header">
              <MapPin size={14} style={{ color: 'var(--orange-light)' }} />
              <span className="track-card-title">Track Layout</span>
            </div>

            <div className="track-img-container">
              {trackImage ? (
                <img src={trackImage} alt="Track layout" />
              ) : (
                <div className="track-placeholder">
                  <span className="track-placeholder-icon">🗺️</span>
                  <span className="track-placeholder-text">
                    No layout uploaded
                  </span>
                </div>
              )}
            </div>

            <div className="track-card-footer">
              {!isMarshal && (
                <>
                  <label
                    className="file-upload-label"
                    htmlFor="track-image-upload"
                  >
                    <Upload size={14} />
                    {trackImage ? 'Replace Image' : 'Upload Layout'}
                  </label>
                  <input
                    id="track-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      const reader = new FileReader()
                      reader.onload = () => {
                        const img = reader.result as string
                        setTrackImage(img)
                        session.updateTrackImage(img)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Leaderboard ── */}
          {(() => {
            type LBEntry = {
              name: string
              vehicle: string
              time: number
              lapIndex: number
            }
            const entries: LBEntry[] = []
            drivers.forEach((driver) => {
              driver.laps
                .filter((l) => !l.isLive)
                .forEach((lap, i) => {
                  const t = getFinalTime(lap)
                  if (t != null)
                    entries.push({
                      name: driver.name,
                      vehicle: driver.vehicle,
                      time: t,
                      lapIndex: i + 1,
                    })
                })
            })
            const top = entries.sort((a, b) => a.time - b.time).slice(0, 10)
            const fastest = top[0]?.time ?? null

            return (
              <div className="leaderboard-card">
                <div className="leaderboard-header">
                  <Trophy
                    size={13}
                    style={{ color: 'var(--orange-light)', flexShrink: 0 }}
                  />
                  <span className="leaderboard-title">Session Leaderboard</span>
                </div>

                {top.length === 0 ? (
                  <div className="leaderboard-empty">No laps recorded yet</div>
                ) : (
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Driver</th>
                        <th>Vehicle</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((entry, rank) => {
                        const isFirst = rank === 0
                        const delta =
                          fastest != null && rank > 0
                            ? `+${(entry.time - fastest).toFixed(2)}s`
                            : null
                        return (
                          <tr
                            key={rank}
                            className={isFirst ? 'lb-row-gold' : ''}
                          >
                            <td className="lb-rank">
                              {rank === 0 ? (
                                <span className="lb-rank-badge lb-rank-gold">
                                  1
                                </span>
                              ) : rank === 1 ? (
                                <span className="lb-rank-badge lb-rank-silver">
                                  2
                                </span>
                              ) : rank === 2 ? (
                                <span className="lb-rank-badge lb-rank-bronze">
                                  3
                                </span>
                              ) : (
                                <span className="lb-rank-num">{rank + 1}</span>
                              )}
                            </td>
                            <td className="lb-name">{entry.name}</td>
                            <td className="lb-vehicle">
                              {entry.vehicle || '—'}
                            </td>
                            <td className="lb-time">
                              <span className={isFirst ? 'lb-time-gold' : ''}>
                                {entry.time.toFixed(2)}s
                              </span>
                              {delta && (
                                <span className="lb-delta">{delta}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })()}

          {/* ── Session Averages ── */}
          {(() => {
            // Group all completed laps by driver name across multiple stints
            const driverMap: Record<
              string,
              { vehicle: string; times: number[] }
            > = {}
            drivers.forEach((driver) => {
              const completedLaps = driver.laps.filter((l) => !l.isLive)
              const times = completedLaps
                .map((l) => getFinalTime(l))
                .filter((t): t is number => t != null)
              if (!times.length) return
              if (!driverMap[driver.name]) {
                driverMap[driver.name] = { vehicle: driver.vehicle, times: [] }
              }
              driverMap[driver.name].times.push(...times)
            })

            const rows = Object.entries(driverMap)
              .map(([name, { times }]) => {
                const avg = times.reduce((a, b) => a + b, 0) / times.length
                const stdDev =
                  times.length >= 2
                    ? Math.sqrt(
                        times.reduce((s, t) => s + (t - avg) ** 2, 0) /
                          times.length
                      )
                    : null
                return { name, avg, stdDev, laps: times.length }
              })
              .sort((a, b) => a.avg - b.avg)

            if (!rows.length) return null

            const fastest = rows[0].avg

            return (
              <div className="leaderboard-card">
                <div className="leaderboard-header">
                  <BarChart2
                    size={13}
                    style={{ color: 'var(--orange-light)', flexShrink: 0 }}
                  />
                  <span className="leaderboard-title">Session Averages</span>
                </div>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Driver</th>
                      <th style={{ textAlign: 'center' }}>Avg Time</th>
                      <th style={{ textAlign: 'center' }}>Consistency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const delta =
                        i > 0 ? `+${(row.avg - fastest).toFixed(2)}s` : null
                      return (
                        <tr
                          key={row.name}
                          className={i === 0 ? 'lb-row-gold' : ''}
                        >
                          <td className="lb-rank">
                            {i === 0 ? (
                              <span className="lb-rank-badge lb-rank-gold">
                                1
                              </span>
                            ) : i === 1 ? (
                              <span className="lb-rank-badge lb-rank-silver">
                                2
                              </span>
                            ) : i === 2 ? (
                              <span className="lb-rank-badge lb-rank-bronze">
                                3
                              </span>
                            ) : (
                              <span className="lb-rank-num">{i + 1}</span>
                            )}
                          </td>
                          <td className="lb-name">
                            {row.name}
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.68rem',
                                color: 'var(--text-muted)',
                                fontWeight: 400,
                              }}
                            >
                              {row.laps} lap{row.laps !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="lb-time">
                            <span className={i === 0 ? 'lb-time-gold' : ''}>
                              {row.avg.toFixed(2)}s
                            </span>
                            {delta && <span className="lb-delta">{delta}</span>}
                          </td>
                          <td className="lb-time">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {row.stdDev != null
                                ? `±${row.stdDev.toFixed(2)}s`
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}
