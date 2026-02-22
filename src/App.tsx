import { useState, useEffect } from 'react'
import type { Lap } from './calculations'
import { getBestTime, getAverageTime } from './calculations'
import LapTable from './components/LapTable'
import { Trash2, Pencil } from 'lucide-react'

type Driver = {
  id: string
  name: string
  laps: Lap[]
  sessionStart: string
  sessionEnd: string
  vehicle: string
  comments: string
}

type SessionMetadata = {
  date: string
  event: string
  weather: string
  startTime: string
  endTime: string
}

export default function App() {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('driveDayDrivers')
    return saved ? JSON.parse(saved) : []
  })
  const [newDriverName, setNewDriverName] = useState('')
  const [sessionMeta, setSessionMeta] = useState<SessionMetadata>(() => {
    const saved = localStorage.getItem('driveDayMeta')
    return saved
      ? JSON.parse(saved)
      : {
          date: '',
          event: '',
          weather: '',
          startTime: '',
          endTime: '',
        }
  })

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [trackImage, setTrackImage] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('driveDayDrivers', JSON.stringify(drivers))
  }, [drivers])
  useEffect(() => {
    localStorage.setItem('driveDayMeta', JSON.stringify(sessionMeta))
  }, [sessionMeta])

  useEffect(() => {
    const saved = localStorage.getItem('trackImage')
    if (saved) setTrackImage(saved)
  }, [])
  
  useEffect(() => {
    if (trackImage) {
      localStorage.setItem('trackImage', trackImage)
    }
  }, [trackImage])

  function addDriver() {
    if (!newDriverName.trim()) return

    setDrivers((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        name: newDriverName.trim(),
        laps: [],
        sessionStart: '',
        sessionEnd: '',
        vehicle: '',
        comments: '',
      },
    ])

    setNewDriverName('')
  }

  function addLap(driverId: string) {
    setDrivers((drivers) =>
      drivers.map((d) =>
        d.id === driverId
          ? {
              ...d,
              laps: [
                ...d.laps,
                {
                  id: crypto.randomUUID(),
                  time1: null,
                  time2: null,
                  cones: 0,
                  offTrack: 0,
                },
              ],
            }
          : d
      )
    )
  }

  function updateLap(driverId: string, updatedLap: Lap) {
    setDrivers(drivers =>
      drivers.map(driver => {
        if (driver.id !== driverId) return driver
  
        const updatedLaps = driver.laps.map(l =>
          l.id === updatedLap.id ? updatedLap : l
        )
  
        const lastLap = updatedLaps[updatedLaps.length - 1]
  
        const isLastLap = updatedLap.id === lastLap.id
  
        const hasTime =
          updatedLap.time1 != null || updatedLap.time2 != null
  
        // If user edited the last lap AND it now has a time
        if (isLastLap && hasTime) {
          return {
            ...driver,
            laps: [
              ...updatedLaps,
              {
                id: crypto.randomUUID(),
                time1: null,
                time2: null,
                cones: 0,
                offTrack: 0,
              },
            ],
          }
        }
  
        return {
          ...driver,
          laps: updatedLaps,
        }
      })
    )
  }

  function deleteLap(driverId: string, lapId: string, index: number) {
    const ok = window.confirm(
      `Delete Lap ${index + 1}? This cannot be undone.`
    )
    if (!ok) return
  
    setDrivers(drivers =>
      drivers.map(d =>
        d.id === driverId
          ? { ...d, laps: d.laps.filter(l => l.id !== lapId) }
          : d
      )
    )
  }

  function deleteDriver(driverId: string, driverName: string) {
    const ok = window.confirm(
      `Delete ${driverName} and all of their laps? This cannot be undone.`
    )
    if (!ok) return

    setDrivers((drivers) => drivers.filter((d) => d.id !== driverId))
  }

  function updateDriver(driverId: string, updated: Driver) {
    setDrivers(drivers =>
      drivers.map(d =>
        d.id === driverId ? updated : d
      )
    )
  }

  function resetSession() {
    const ok = window.confirm(
      'Reset the entire drive day log? This will remove all drivers, laps, and info. This cannot be undone.'
    )
    if (!ok) return
  
    setDrivers([])
    setSessionMeta({
      date: '',
      event: '',
      weather: '',
      startTime: '',
      endTime: '',
    })
  
    localStorage.removeItem('driveDayDrivers')
    localStorage.removeItem('driveDayMeta')
  }

  return (
    <div 
      style={{ 
        display: 'flex',
        gap: 24,
        padding: 24,
        alignItems: 'flex-start', 
      }}>
      <div style={{ flex: 3 }}> 
        <h1>Longhorn Racing Drive Day Log</h1>
        <h2>Session Info</h2>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 12,
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label>Date</label>
              <br />
              <input
                type="date"
                value={sessionMeta.date}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, date: e.target.value })
                }
              />
            </div>

            <div>
              <label>Event</label>
              <br />
              <select
                value={sessionMeta.event}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, event: e.target.value })
                }
              >
                <option value="">Select</option>
                <option value="Skidpad">Skidpad</option>
                <option value="Autocross">Autocross</option>
                <option value="Endurance">Endurance</option>
                <option value="Kart Driver Training">Kart Driver Training</option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: 200}}>
              <label>Weather</label>
              <br />
              <input
                type="text"
                placeholder="Enter weather details"
                value={sessionMeta.weather}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, weather: e.target.value })
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 2: Start / End */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 42,
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label>Drive Day Start</label>
              <br />
              <input
                type="time"
                step={60}
                value={sessionMeta.startTime}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, startTime: e.target.value })
                }
              />
            </div>

            <div>
              <label>Drive Day End</label>
              <br />
              <input
                type="time"
                step={60}
                value={sessionMeta.endTime}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, endTime: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 36,
          }}
        >
          <input
            placeholder="Enter driver name"
            value={newDriverName}
            onChange={(e) => setNewDriverName(e.target.value)}
          />
          <button onClick={addDriver}>Add Driver</button>
          <button onClick={resetSession}>Reset Session</button>
        </div>

        {/* Drivers */}
        {drivers.map((driver) => {
          const best = getBestTime(driver.laps)
          const avg = getAverageTime(driver.laps)

          return (
            <div key={driver.id} style={{ marginTop: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingDriverId === driver.id ? (
                  <input
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
                  <>
                    <span>{driver.name}</span>

                    <button
                      onClick={() => {
                        setEditingDriverId(driver.id)
                        setEditingName(driver.name)
                      }}
                      title="Edit Driver Name"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Pencil style={{marginTop: 4}} size={18} />
                    </button>
                  </>
                )}

                <button
                  onClick={() => deleteDriver(driver.id, driver.name)}
                  title="Delete Driver"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '4px',
                    color: 'red',
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-end',
                  marginBottom: 12,
                }}
              >
                <div>
                  <label>Stint Start</label><br />
                  <input
                    type="time"
                    value={driver.sessionStart}
                    onChange={e =>
                      updateDriver(driver.id, {
                        ...driver,
                        sessionStart: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Stint End</label><br />
                  <input
                    type="time"
                    value={driver.sessionEnd}
                    onChange={e =>
                      updateDriver(driver.id, {
                        ...driver,
                        sessionEnd: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label>Vehicle</label><br />
                  <select
                    value={driver.vehicle}
                    onChange={e =>
                      updateDriver(driver.id, {
                        ...driver,
                        vehicle: e.target.value,
                      })
                    }
                    style={{height:23}}
                  >
                    <option value="">Select Vehicle</option>
                    <option value="Vehicle 1">KA 100</option>
                    <option value="Vehicle 2">Rotax</option>
                    <option value="Vehicle 3">Shifter</option>
                    <option value="Vehicle 4">Angelique</option>
                    <option value="Vehicle 5">Orion</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label>Driver Comments</label><br />
                  <input
                    type="text"
                    placeholder="Enter driver comments"
                    value={driver.comments}
                    onChange={e =>
                      updateDriver(driver.id, {
                        ...driver,
                        comments: e.target.value,
                      })
                    }
                    style={{
                      width: '285px',
                      height: '20px',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <strong>Best Time:</strong>{' '}
                {best != null ? `${best.toFixed(2)} sec` : '—'} |{' '}
                <strong>Average Time:</strong>{' '}
                {avg != null ? `${avg.toFixed(2)} sec` : '—'}
              </div>
              <LapTable
                laps={driver.laps}
                bestTime={best}
                onUpdateLap={(lap) => updateLap(driver.id, lap)}
                onDeleteLap={(lapId, index) =>
                  deleteLap(driver.id, lapId, index)
                }
              />
              <button style={{ marginTop: 8 }} onClick={() => addLap(driver.id)}>
                Add Lap
              </button>
            </div>
          )
        })}
    </div>
    <div style={{ flex: 2 }}>
      <div
    style={{
      border: '1px solid black',
      padding: 16,
    }}
  >
    <h2 style={{ marginTop: 0 }}>Track Layout</h2>

    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        border: '1px dashed gray',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {trackImage ? (
        <img
          src={trackImage}
          alt="Track"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: 'gray' }}>No image uploaded</span>
      )}
    </div>

    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
          setTrackImage(reader.result as string)
        }
        reader.readAsDataURL(file)
      }}
    />
  </div>
      </div>
    </div>
  )
}
