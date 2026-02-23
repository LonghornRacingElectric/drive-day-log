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

type TireData = {
  coldP: string
  coldT: string
  hotP: string
  hotT: string
}

type SOCData = {
  id: string
  initialSOC: string
  finalSOC: string
  initialVolts: string
  finalVolts: string
}

type SessionMetadata = {
  date: string
  event: string
  weather: string
  startTime: string
  endTime: string

  sessionGoals: string

  trackConditions: {
    wind: string
    humidity: string
    ambientTemp: string
    wetTrack: boolean
    trackTemp: string
  }

  tires: {
    frontRight: TireData
    frontLeft: TireData
    rearRight: TireData
    rearLeft: TireData
  }

  stateOfCharge: SOCData[]

  powerLimit: string
  totalDistance: string
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

          tires: {
            frontRight: { coldP: '', coldT: '', hotP: '', hotT: '' },
            frontLeft: { coldP: '', coldT: '', hotP: '', hotT: '' },
            rearRight: { coldP: '', coldT: '', hotP: '', hotT: '' },
            rearLeft: { coldP: '', coldT: '', hotP: '', hotT: '' },
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
    setDrivers((drivers) =>
      drivers.map((driver) => {
        if (driver.id !== driverId) return driver

        const updatedLaps = driver.laps.map((l) =>
          l.id === updatedLap.id ? updatedLap : l
        )

        const lastLap = updatedLaps[updatedLaps.length - 1]

        const isLastLap = updatedLap.id === lastLap.id

        const hasTime = updatedLap.time1 != null || updatedLap.time2 != null

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

      tires: {
        frontRight: { coldP: '', coldT: '', hotP: '', hotT: '' },
        frontLeft: { coldP: '', coldT: '', hotP: '', hotT: '' },
        rearRight: { coldP: '', coldT: '', hotP: '', hotT: '' },
        rearLeft: { coldP: '', coldT: '', hotP: '', hotT: '' },
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

        <h2 style={{ marginTop: 32 }}>Tires</h2>

        <table
          cellPadding={4}
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            marginBottom: 32,
          }}
          border={1}
        >
          <thead>
            <tr>
              <th></th>
              <th>Cold Pressure</th>
              <th>Cold Temperature</th>
              <th>Hot Pressure</th>
              <th>Hot Temperature</th>
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
                sessionMeta.tires[key as keyof typeof sessionMeta.tires]

              return (
                <tr key={key}>
                  <td>
                    <strong>{label}</strong>
                  </td>

                  <td>
                    <input
                      type="number"
                      value={tire.coldP}
                      onChange={(e) =>
                        setSessionMeta({
                          ...sessionMeta,
                          tires: {
                            ...sessionMeta.tires,
                            [key]: { ...tire, coldP: e.target.value },
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={tire.coldT}
                      onChange={(e) =>
                        setSessionMeta({
                          ...sessionMeta,
                          tires: {
                            ...sessionMeta.tires,
                            [key]: { ...tire, coldT: e.target.value },
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={tire.hotP}
                      onChange={(e) =>
                        setSessionMeta({
                          ...sessionMeta,
                          tires: {
                            ...sessionMeta.tires,
                            [key]: { ...tire, hotP: e.target.value },
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={tire.hotT}
                      onChange={(e) =>
                        setSessionMeta({
                          ...sessionMeta,
                          tires: {
                            ...sessionMeta.tires,
                            [key]: { ...tire, hotT: e.target.value },
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

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
                    type="number"
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
                    type="number"
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
                    type="number"
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
                    type="number"
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
                    onChange={(e) =>
                      updateDriver(driver.id, {
                        ...driver,
                        vehicle: e.target.value,
                      })
                    }
                    style={{ height: 23 }}
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
                  <label>Comments/Notes</label>
                  <br />
                  <input
                    type="text"
                    placeholder="Enter driver feedback, setup changes, etc."
                    value={driver.comments}
                    onChange={(e) =>
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
              <button
                style={{ marginTop: 8 }}
                onClick={() => addLap(driver.id)}
              >
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
