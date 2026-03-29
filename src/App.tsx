// React
import { useState, useEffect, useRef } from 'react'

// Third party
import { Trash2, Pencil } from 'lucide-react'

// Internal utilities
import { getBestTime, getAverageTime } from './calculations'
import type { Lap } from './calculations'

// Internal components
import LapTable from './components/LapTable'

// Internal types
import type { Driver, SOCData, SessionMetadata } from './types/driveDay'

export default function App() {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('driveDayDrivers')
    return saved ? JSON.parse(saved) : []
  })

  const [activeTimers, setActiveTimers] = useState<
    Record<
      string,
      {
        startTime: number | null
        elapsed: number
        intervalId: number | null
      }
    >
  >({})
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
          sessionGoals: '',
          powerLimit: '',
          totalDistance: '',
          trackConditions: {
            wind: '',
            humidity: '',
            ambientTemp: '',
            trackTemp: '',
            wetTrack: false,
          },

          stateOfCharge: [
            {
              id: crypto.randomUUID(),
              initialSOC: '',
              finalSOC: '',
              initialVolts: '',
              finalVolts: '',
            },
          ],
        }
  })

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [trackImage, setTrackImage] = useState<string | null>(null)

  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

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

  useEffect(() => {
    drivers.forEach((driver) => {
      const el = textAreaRefs.current[driver.id]
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    })
  }, [drivers])

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

  function updateLap(driverId: string, updatedLap: Lap) {
    setDrivers((drivers) =>
      drivers.map((driver) =>
        driver.id === driverId
          ? {
              ...driver,
              laps: driver.laps.map((l) =>
                l.id === updatedLap.id ? updatedLap : l
              ),
            }
          : driver
      )
    )
  }

  function deleteLap(driverId: string, lapId: string, index: number) {
    const ok = window.confirm(`Delete Lap ${index + 1}? This cannot be undone.`)
    if (!ok) return

    setDrivers((drivers) =>
      drivers.map((d) =>
        d.id === driverId
          ? { ...d, laps: d.laps.filter((l) => l.id !== lapId) }
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
    setDrivers((drivers) =>
      drivers.map((d) => (d.id === driverId ? updated : d))
    )
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
      sessionGoals: '',
      powerLimit: '',
      totalDistance: '',
      trackConditions: {
        wind: '',
        humidity: '',
        ambientTemp: '',
        trackTemp: '',
        wetTrack: false,
      },

      stateOfCharge: [
        {
          id: crypto.randomUUID(),
          initialSOC: '',
          finalSOC: '',
          initialVolts: '',
          finalVolts: '',
        },
      ],
    })

    setTrackImage(null)
    localStorage.removeItem('trackImage')

    localStorage.removeItem('driveDayDrivers')
    localStorage.removeItem('driveDayMeta')
  }

  const startRef = useRef<number>(0)

  function startTimer(driver: Driver) {
    startRef.current = Date.now()

    const liveLap: Lap = {
      id: crypto.randomUUID(),
      time1: 0,
      time2: null,
      cones: 0,
      offTrack: 0,
      isLive: true,
    }

    setDrivers((drivers) =>
      drivers.map((d) =>
        d.id === driver.id ? { ...d, laps: [...d.laps, liveLap] } : d
      )
    )

    const intervalId = window.setInterval(() => {
      setActiveTimers((prev) => ({
        ...prev,
        [driver.id]: {
          ...prev[driver.id],
          elapsed: (Date.now() - startRef.current) / 1000,
        },
      }))
    }, 50)

    setActiveTimers((prev) => ({
      ...prev,
      [driver.id]: {
        startTime: startRef.current,
        elapsed: 0,
        intervalId,
      },
    }))
  }

  function recordLap(driver: Driver) {
    const elapsed = activeTimers[driver.id]?.elapsed ?? 0
    const newStart = Date.now()
    startRef.current = newStart

    setDrivers((drivers) =>
      drivers.map((d) => {
        if (d.id !== driver.id) return d

        const finalized = d.laps.map((lap) =>
          lap.isLive ? { ...lap, isLive: false, time1: elapsed } : lap
        )

        const newLiveLap: Lap = {
          id: crypto.randomUUID(),
          time1: 0,
          time2: null,
          cones: 0,
          offTrack: 0,
          isLive: true,
        }

        return {
          ...d,
          laps: [...finalized, newLiveLap],
        }
      })
    )

    // reset elapsed for next lap
    setActiveTimers((prev) => ({
      ...prev,
      [driver.id]: {
        ...prev[driver.id],
        startTime: newStart,
        elapsed: 0,
      },
    }))
  }

  function stopTimer(driverId: string) {
    const timer = activeTimers[driverId]
    if (!timer) return

    if (timer.intervalId !== null) {
      clearInterval(timer.intervalId)
    }

    // finalize live lap
    setDrivers((drivers) =>
      drivers.map((d) =>
        d.id === driverId
          ? {
              ...d,
              laps: d.laps.map((lap) =>
                lap.isLive
                  ? {
                      ...lap,
                      isLive: false,
                      time1: activeTimers[driverId]?.elapsed ?? lap.time1,
                    }
                  : lap
              ),
            }
          : d
      )
    )

    setActiveTimers((prev) => {
      const updated = { ...prev }
      delete updated[driverId]
      return updated
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        padding: 24,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 3 }}>
        <h1>Longhorn Racing Drive Day Log</h1>
        <h2
          style={{
            marginTop: 0,
            marginBottom: 12,
          }}
        >
          Session Goals
        </h2>

        <input
          type="text"
          value={sessionMeta.sessionGoals}
          onChange={(e) =>
            setSessionMeta({
              ...sessionMeta,
              sessionGoals: e.target.value,
            })
          }
          placeholder="Enter session objectives"
          style={{
            width: '300px',
            fontSize: 16,
            fontFamily: '"Times New Roman", Times, serif',
          }}
        />
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
                <option value="Kart Driver Training">
                  Kart Driver Training
                </option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: 200 }}>
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
            <div>
              <label>Power Limit</label>
              <br />
              <input
                type="text"
                placeholder="ex. 80 kW"
                value={sessionMeta.powerLimit}
                onChange={(e) =>
                  setSessionMeta({ ...sessionMeta, powerLimit: e.target.value })
                }
                style={{
                  height: '18px',
                }}
              />
            </div>
            <div>
              <label>Total Distance (mi)</label>
              <br />
              <input
                type="number"
                placeholder="ex. 1.5 mi"
                value={sessionMeta.totalDistance}
                onChange={(e) =>
                  setSessionMeta({
                    ...sessionMeta,
                    totalDistance: e.target.value,
                  })
                }
                style={{
                  height: '18px',
                }}
              />
            </div>
          </div>
        </div>
        <h2 style={{ marginTop: 32 }}>Track Conditions</h2>

        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 32,
          }}
        >
          <div>
            <label>Wind (mph)</label>
            <br />
            <input
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
            />
          </div>

          <div>
            <label>Humidity (%)</label>
            <br />
            <input
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
            />
          </div>

          <div>
            <label>Ambient Temp (°F)</label>
            <br />
            <input
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
            />
          </div>

          <div>
            <label>Track Temp (°F)</label>
            <br />
            <input
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
            />
          </div>

          <div>
            <label>Wet Track</label>
            <br />
            <select
              value={
                sessionMeta.trackConditions.wetTrack === true
                  ? 'yes'
                  : sessionMeta.trackConditions.wetTrack === false
                    ? 'no'
                    : ''
              }
              onChange={(e) =>
                setSessionMeta({
                  ...sessionMeta,
                  trackConditions: {
                    ...sessionMeta.trackConditions,
                    wetTrack: e.target.value === 'yes',
                  },
                })
              }
              style={{
                height: '21px',
              }}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <h2 style={{ marginTop: 32 }}>State of Charge (SOC)</h2>

        <table
          border={1}
          cellPadding={4}
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            marginBottom: 32,
          }}
        >
          <thead>
            <tr>
              <th>Recharge #</th>
              <th>Initial SOC</th>
              <th>Final SOC</th>
              <th>Initial Volts</th>
              <th>Final Volts</th>
            </tr>
          </thead>

          <tbody>
            {sessionMeta.stateOfCharge.map((row, index) => (
              <tr key={row.id}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>

                <td>
                  <input
                    value={row.initialSOC}
                    onChange={(e) =>
                      updateSOC({ ...row, initialSOC: e.target.value })
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'center' as const,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={row.finalSOC}
                    onChange={(e) =>
                      updateSOC({ ...row, finalSOC: e.target.value })
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'center' as const,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={row.initialVolts}
                    onChange={(e) =>
                      updateSOC({ ...row, initialVolts: e.target.value })
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'center' as const,
                    }}
                  />
                </td>

                <td>
                  <input
                    value={row.finalVolts}
                    onChange={(e) =>
                      updateSOC({ ...row, finalVolts: e.target.value })
                    }
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'center' as const,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
          const completedLaps = driver.laps.filter((lap) => !lap.isLive)

          const best = getBestTime(completedLaps)
          const avg = getAverageTime(completedLaps)

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
                    <span>
                      {driver.name}
                      {driver.vehicle ? ` - ${driver.vehicle}` : ''}
                    </span>

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
                      <Pencil style={{ marginTop: 4 }} size={18} />
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
                  <label>Stint Start</label>
                  <br />
                  <input
                    type="time"
                    value={driver.sessionStart}
                    onChange={(e) =>
                      updateDriver(driver.id, {
                        ...driver,
                        sessionStart: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Stint End</label>
                  <br />
                  <input
                    type="time"
                    value={driver.sessionEnd}
                    onChange={(e) =>
                      updateDriver(driver.id, {
                        ...driver,
                        sessionEnd: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label>Vehicle</label>
                  <br />
                  <select
                    value={driver.vehicle}
                    onChange={(e) => {
                      const vehicle = e.target.value
                      const isCar =
                        vehicle === 'Angelique' || vehicle === 'Orion'

                      updateDriver(driver.id, {
                        ...driver,
                        vehicle,
                        tires: isCar
                          ? (driver.tires ?? {
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
                            })
                          : undefined,
                      })
                    }}
                    style={{ height: 23 }}
                  >
                    <option value="">Select Vehicle</option>
                    <option value="KA 100">KA 100</option>
                    <option value="Rotax">Rotax</option>
                    <option value="Shifter">Shifter</option>
                    <option value="Angelique">Angelique</option>
                    <option value="Orion">Orion</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 500 }}>
                  <label>Comments/Notes</label>
                  <br />
                  <textarea
                    ref={(el) => {
                      textAreaRefs.current[driver.id] = el
                    }}
                    value={driver.comments}
                    onChange={(e) =>
                      updateDriver(driver.id, {
                        ...driver,
                        comments: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      resize: 'none',
                      overflow: 'hidden',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      padding: '4px',
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
                activeElapsed={activeTimers[driver.id]?.elapsed ?? 0}
                onUpdateLap={(lap) => updateLap(driver.id, lap)}
                onDeleteLap={(lapId, index) =>
                  deleteLap(driver.id, lapId, index)
                }
              />
              <div style={{ marginTop: 12 }}>
                {!activeTimers[driver.id]?.startTime ? (
                  <button onClick={() => startTimer(driver)}>Start</button>
                ) : (
                  <>
                    <button onClick={() => recordLap(driver)}>Lap</button>

                    <button
                      onClick={() => stopTimer(driver.id)}
                      style={{ marginLeft: 8 }}
                    >
                      Stop
                    </button>
                  </>
                )}
              </div>
              {driver.tires && (
                <div style={{ marginTop: 16 }}>
                  <h3>Tire Data - {driver.name}</h3>

                  <table
                    border={1}
                    cellPadding={4}
                    style={{ width: '100%', borderCollapse: 'collapse' }}
                  >
                    <thead>
                      <tr>
                        <th></th>
                        <th>Cold Pressure (psi)</th>
                        <th>Cold Temp (ºC)</th>
                        <th>Hot Pressure (psi)</th>
                        <th>Hot Temp (ºC)</th>
                        <th>Tire Depth (in)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'frontRight', label: 'Front Right' },
                        { key: 'frontLeft', label: 'Front Left' },
                        { key: 'rearRight', label: 'Rear Right' },
                        { key: 'rearLeft', label: 'Rear Left' },
                      ].map(({ key, label }) => {
                        const tire =
                          driver.tires![key as keyof typeof driver.tires]

                        return (
                          <tr key={key}>
                            <td>
                              <strong>{label}</strong>
                            </td>

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
                                  type="text"
                                  value={tire[field]}
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
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    textAlign: 'center',
                                  }}
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
              border: '1px dashed gray',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              minHeight: 80,
            }}
          >
            {trackImage ? (
              <img
                src={trackImage}
                alt="Track"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            ) : (
              <span style={{ color: 'gray', padding: 16 }}>No image uploaded</span>
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
