import type { Lap } from '../calculations'
import { getFinalTime } from '../calculations'
import LapRow from './LapRow'
import { useState, useEffect, useRef } from 'react'

type Props = {
  laps: Lap[]
  bestTime: number | null
  activeElapsed: number
  activeSection: 1 | 2 | null
  isSkidpad: boolean
  onUpdateLap: (lap: Lap) => void
  onDeleteLap: (lapId: string, index: number) => void
  isMarshal: boolean
  isAcceleration?: boolean
}

// ── Local-state notes cell to prevent cursor-jump from Firestore round-trips ──
function NotesCell({
  lapId,
  value,
  onSave,
}: {
  lapId: string
  value: string
  onSave: (v: string) => void
}) {
  const [local, setLocal] = useState(value)
  const focused = useRef(false)

  // Only sync from parent when not focused (i.e. not actively typing)
  useEffect(() => {
    if (!focused.current) setLocal(value)
  }, [value])

  return (
    <input
      type="text"
      className="lap-notes-input"
      placeholder="—"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        onSave(local)
      }}
    />
  )
}

export default function LapTable({
  laps,
  bestTime,
  activeElapsed,
  activeSection,
  isSkidpad,
  onUpdateLap,
  onDeleteLap,
  isMarshal,
  isAcceleration = false,
}: Props) {
  if (!laps.length)
    return (
      <div className="no-laps">
        {isSkidpad
          ? 'No runs yet — press Start S1 when the car enters the pad'
          : isAcceleration
          ? 'No runs recorded yet — press Start when the car leaves the line'
          : 'No laps recorded yet — start the timer below'}
      </div>
    )

  return (
    <div className="lap-table-wrap">
      <table className="lap-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 44 }} />           {/* Lap/Run */}
          {!isMarshal && <col style={{ width: 96 }} />}  {/* Time 1 */}
          {!isMarshal && <col style={{ width: 96 }} />}  {/* Time 2 */}
          <col style={{ width: 136 }} />           {/* Cones — must fit 38+38+24+gaps */}
          <col style={{ width: 136 }} />           {/* Off Track */}
          <col style={{ width: 82 }} />            {/* Final */}
          <col style={{ width: 170 }} />           {/* Notes — fixed, not auto-expand */}
        </colgroup>
        <thead>
          <tr>
            <th>{isAcceleration ? 'Run' : 'Lap'}</th>
            {!isMarshal && <th>Time 1</th>}
            {!isMarshal && <th>Time 2</th>}
            <th>Cones</th>
            <th>Off Track</th>
            <th style={{ paddingLeft: 4 }}>Final</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          {laps.map((lap, index) => {
            const finalTime = getFinalTime(lap)
            const isBest =
              finalTime != null && bestTime != null && finalTime === bestTime

            return (
              <tr key={lap.id}>
                <LapRow
                  lap={lap}
                  index={index}
                  activeElapsed={activeElapsed}
                  activeSection={activeSection}
                  isSkidpad={isSkidpad}
                  onChange={onUpdateLap}
                  onDelete={() => onDeleteLap(lap.id, index)}
                  isMarshal={isMarshal}
                />

                <td className="td-final">
                  {finalTime != null && !lap.isLive ? (
                    <span
                      className={
                        isBest ? 'lap-final-best' : 'lap-final-normal'
                      }
                    >
                      {finalTime.toFixed(2)}s
                    </span>
                  ) : (
                    <span className="lap-final-dash">—</span>
                  )}
                </td>

                {/* Notes column — local state prevents cursor-jump */}
                <td style={{ overflow: 'hidden' }}>
                  <NotesCell
                    key={lap.id}
                    lapId={lap.id}
                    value={lap.notes ?? ''}
                    onSave={(v) => onUpdateLap({ ...lap, notes: v })}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
