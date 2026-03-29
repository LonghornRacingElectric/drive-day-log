import { useState, useEffect } from 'react'
import {
  doc, collection, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, runTransaction, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Driver, SessionMetadata } from '../types/driveDay'

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export const defaultMeta: SessionMetadata = {
  date: new Date().toISOString().split('T')[0],
  event: '', weather: '', startTime: '', endTime: '',
  sessionGoals: '', powerLimit: '', totalDistance: '',
  trackConditions: { wind: '', humidity: '', ambientTemp: '', trackTemp: '', wetTrack: false },
  stateOfCharge: [{ id: crypto.randomUUID(), initialSOC: '', finalSOC: '', initialVolts: '', finalVolts: '' }],
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type SessionRole = 'host' | 'marshal'

export interface SessionHook {
  sessionCode: string | null
  role: SessionRole
  loading: boolean
  connected: boolean
  drivers: Driver[]
  sessionMeta: SessionMetadata
  trackImage: string | null
  createSession: () => Promise<string>
  joinSession: (code: string) => Promise<boolean>
  leaveSession: () => void
  addDriver: (driver: Driver) => Promise<void>
  updateDriver: (driverId: string, updated: Driver) => Promise<void>
  deleteDriver: (driverId: string) => Promise<void>
  updateMeta: (meta: SessionMetadata) => Promise<void>
  updateTrackImage: (img: string | null) => Promise<void>
  resetAllDrivers: (drivers: Driver[]) => Promise<void>
  marshalIncrement: (
    driverId: string,
    lapId: string,
    field: 'cones' | 'offTrack',
    delta: number
  ) => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSession(): SessionHook {
  const [sessionCode, setSessionCode] = useState<string | null>(
    () => localStorage.getItem('driveDaySessionCode')
  )
  const [role, setRole]           = useState<SessionRole>('host')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [drivers, setDrivers]     = useState<Driver[]>([])
  const [sessionMeta, setSessionMeta] = useState<SessionMetadata>(defaultMeta)
  const [trackImage, setTrackImage]   = useState<string | null>(null)

  // ── Firestore subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    if (!sessionCode) {
      setLoading(false)
      setConnected(false)
      return
    }

    setLoading(true)
    const myId = localStorage.getItem('driveDayOwnerId') ?? ''

    const sessionRef   = doc(db, 'sessions', sessionCode)
    const driversQuery = query(
      collection(db, 'sessions', sessionCode, 'drivers'),
      orderBy('createdAt', 'asc')
    )

    const unsubSession = onSnapshot(
      sessionRef,
      (snap) => {
        console.log('[useSession] session snap exists:', snap.exists(), 'id:', snap.id)
        if (!snap.exists()) {
          console.warn('[useSession] Session document not found — clearing code')
          localStorage.removeItem('driveDaySessionCode')
          setSessionCode(null)
          setLoading(false)
          return
        }
        const data = snap.data()
        setRole(myId === data.hostId ? 'host' : 'marshal')
        setSessionMeta(data.meta ?? defaultMeta)
        setTrackImage(data.trackImage ?? null)
        setConnected(true)
        setLoading(false)
        console.log('[useSession] session connected, role:', myId === data.hostId ? 'host' : 'marshal')
      },
      (error) => {
        console.error('[useSession] session onSnapshot error:', error.code, error.message)
        // Kick the user back to the session gate so they're not stuck on "Connecting…"
        localStorage.removeItem('driveDaySessionCode')
        setSessionCode(null)
        setLoading(false)
        setConnected(false)
      }
    )

    const unsubDrivers = onSnapshot(
      driversQuery,
      (snap) => {
        console.log('[useSession] drivers snap, count:', snap.docs.length)
        setDrivers(snap.docs.map(d => d.data() as Driver))
      },
      (error) => {
        console.error('[useSession] drivers onSnapshot error:', error.code, error.message)
      }
    )

    return () => { unsubSession(); unsubDrivers() }
  }, [sessionCode])

  // ── Refs ─────────────────────────────────────────────────────────────────
  function sessionRef() { return doc(db, 'sessions', sessionCode!) }
  function driverRef(id: string) {
    return doc(db, 'sessions', sessionCode!, 'drivers', id)
  }

  // ── Session management ───────────────────────────────────────────────────
  async function createSession() {
    const code = generateCode()
    const myId = crypto.randomUUID()
    localStorage.setItem('driveDayOwnerId', myId)
    localStorage.setItem('driveDaySessionCode', code)
    try {
      await setDoc(doc(db, 'sessions', code), {
        hostId: myId,
        meta: defaultMeta,
        trackImage: null,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      // Clean up so the gate doesn't get stuck
      localStorage.removeItem('driveDaySessionCode')
      localStorage.removeItem('driveDayOwnerId')
      throw err
    }
    setSessionCode(code)
    return code
  }

  async function joinSession(code: string) {
    const upper = code.toUpperCase().trim()
    const snap = await getDoc(doc(db, 'sessions', upper))
    if (!snap.exists()) return false
    localStorage.setItem('driveDaySessionCode', upper)
    setSessionCode(upper)
    return true
  }

  function leaveSession() {
    localStorage.removeItem('driveDaySessionCode')
    setSessionCode(null)
    setDrivers([])
    setSessionMeta(defaultMeta)
    setTrackImage(null)
    setConnected(false)
  }

  // ── Data writes ──────────────────────────────────────────────────────────
  async function addDriver(driver: Driver) {
    await setDoc(driverRef(driver.id), { ...driver, createdAt: Date.now() })
  }

  async function updateDriver(driverId: string, updated: Driver) {
    await setDoc(driverRef(driverId), updated, { merge: true })
  }

  async function deleteDriver(driverId: string) {
    await deleteDoc(driverRef(driverId))
  }

  async function updateMeta(meta: SessionMetadata) {
    if (!sessionCode) return
    await updateDoc(sessionRef(), { meta })
  }

  async function updateTrackImage(img: string | null) {
    if (!sessionCode) return
    await updateDoc(sessionRef(), { trackImage: img ?? null })
  }

  async function resetAllDrivers(currentDrivers: Driver[]) {
    await Promise.all(currentDrivers.map(d => deleteDoc(driverRef(d.id))))
    await updateDoc(sessionRef(), { meta: defaultMeta, trackImage: null })
  }

  // ── Marshal cone/off-track increment (transaction-safe) ──────────────────
  async function marshalIncrement(
    driverId: string,
    lapId: string,
    field: 'cones' | 'offTrack',
    delta: number
  ) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(driverRef(driverId))
      if (!snap.exists()) return
      const driver = snap.data() as Driver
      const newLaps = driver.laps.map(l =>
        l.id === lapId
          ? { ...l, [field]: Math.max(0, (l[field] ?? 0) + delta) }
          : l
      )
      tx.update(driverRef(driverId), { laps: newLaps })
    })
  }

  return {
    sessionCode, role, loading, connected,
    drivers, sessionMeta, trackImage,
    createSession, joinSession, leaveSession,
    addDriver, updateDriver, deleteDriver,
    updateMeta, updateTrackImage, resetAllDrivers,
    marshalIncrement,
  }
}
