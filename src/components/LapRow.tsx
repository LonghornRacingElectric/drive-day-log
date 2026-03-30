import type { Lap } from '../calculations'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

type Props = {
  lap: Lap
  index: number
  activeElapsed: number
  onChange: (updated: Lap) => void
  onDelete: () => void
  isMarshal: boolean
}

export default function LapRow({
  lap,
  index,
  activeElapsed,
  onChange,
  onDelete,
  isMarshal,
}: Props) {
  const [isHovering, setIsHovering] = useState(false)

  function update<K extends keyof Lap>(key: K, value: Lap[K]) {
    onChange({ ...lap, [key]: value })
  }

  return (
    <>
      <td
        className="lap-num-cell"
        onMouseEnter={() => {
          if (!isMarshal) setIsHovering(true)
        }}
        onMouseLeave={() => {
          if (!isMarshal) setIsHovering(false)
        }}
        onClick={() => {
          if (!isMarshal && isHovering) onDelete()
        }}
        title="Click to delete lap"
      >
        {!isMarshal && isHovering ? (
          <Trash2 size={14} color="var(--red)" />
        ) : (
          <>
            {lap.isLive && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  marginRight: 4,
                  verticalAlign: 'middle',
                  animation: 'badge-pulse 1.2s ease-in-out infinite',
                }}
              />
            )}
            {index + 1}
          </>
        )}
      </td>

      {!isMarshal && (
        <td>
          {lap.isLive ? (
            <span className="lap-live-time">{activeElapsed.toFixed(2)}s</span>
          ) : (
            <input
              type="number"
              inputMode="decimal"
              value={lap.time1 ?? ''}
              onChange={(e) =>
                update(
                  'time1',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className="lap-time-input"
            />
          )}
        </td>
      )}

      {!isMarshal && (
        <td>
          <input
            type="number"
            inputMode="decimal"
            value={lap.time2 ?? ''}
            onChange={(e) =>
              update(
                'time2',
                e.target.value === '' ? null : Number(e.target.value)
              )
            }
            className="lap-time-input"
          />
        </td>
      )}

      <td>
        <div className="counter-group">
          <button
            className="counter-btn"
            onClick={() => update('cones', Math.max(0, lap.cones - 1))}
          >
            −
          </button>
          <span className="counter-val">{lap.cones}</span>
          <button
            className="counter-btn"
            onClick={() => update('cones', lap.cones + 1)}
          >
            +
          </button>
        </div>
      </td>

      <td>
        <div className="counter-group">
          <button
            className="counter-btn"
            onClick={() => update('offTrack', Math.max(0, lap.offTrack - 1))}
          >
            −
          </button>
          <span className="counter-val">{lap.offTrack}</span>
          <button
            className="counter-btn"
            onClick={() => update('offTrack', lap.offTrack + 1)}
          >
            +
          </button>
        </div>
      </td>
    </>
  )
}
