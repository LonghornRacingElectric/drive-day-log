import type { Lap } from '../calculations'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

type Props = {
  lap: Lap
  index: number
  onChange: (updated: Lap) => void
  onDelete: () => void
}

export default function LapRow({ lap, index, onChange, onDelete }: Props) {
  const [isHovering, setIsHovering] = useState(false)

  function update<K extends keyof Lap>(key: K, value: Lap[K]) {
    onChange({ ...lap, [key]: value })
  }

  return (
    <>
      <td
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => {
          if (isHovering) onDelete()
        }}
        style={{
          cursor: 'pointer',
          textAlign: 'center',
          fontWeight: 500,
          width: 80,
        }}
      >
        {isHovering ? (
          <Trash2 size={16} color="red" />
        ) : (
          `Lap ${index + 1}`
        )}
      </td>

      <td>
        <input
          type="number"
          inputMode="decimal"
          value={lap.time1 ?? ''}
          onChange={e =>
            update('time1', e.target.value === '' ? null : Number(e.target.value))
          }
          style={{
            fontSize: '14px',       
            boxSizing: 'border-box',
            fontFamily: '"Times New Roman", Times, serif',
          }}
        />
      </td>

      <td>
        <input
          type="number"
          inputMode="decimal"
          value={lap.time2 ?? ''}
          onChange={e =>
            update('time2', e.target.value === '' ? null : Number(e.target.value))
          }
          style={{
            fontSize: '14px',       
            boxSizing: 'border-box',
            fontFamily: '"Times New Roman", Times, serif',
          }}
        />
      </td>

      <td>
        <button onClick={() => update('cones', Math.max(0, lap.cones - 1))}>−</button>
        <span style={{ margin: '0 6px' }}>{lap.cones}</span>
        <button onClick={() => update('cones', lap.cones + 1)}>+</button>
      </td>

      <td>
        <button onClick={() => update('offTrack', Math.max(0, lap.offTrack - 1))}>−</button>
        <span style={{ margin: '0 6px' }}>{lap.offTrack}</span>
        <button onClick={() => update('offTrack', lap.offTrack + 1)}>+</button>
      </td>
    </>
  )
}
