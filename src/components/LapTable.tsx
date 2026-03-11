import type { Lap } from '../calculations'
import { getFinalTime } from '../calculations'
import LapRow from './LapRow'

type Props = {
  laps: Lap[]
  bestTime: number | null
  activeElapsed: number
  onUpdateLap: (lap: Lap) => void
  onDeleteLap: (lapId: string, index: number) => void
}

export default function LapTable({
  laps,
  bestTime,
  activeElapsed,
  onUpdateLap,
  onDeleteLap,
}: Props) {
  if (!laps.length) return <div>No laps yet</div>

  return (
    <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Lap</th>
          <th>Lap Time 1</th>
          <th>Lap Time 2</th>
          <th>Cones Hit</th>
          <th>Off Track</th>
          <th>Final Time</th>
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
                onChange={onUpdateLap}
                onDelete={() => onDeleteLap(lap.id, index)}
              />

              <td
                style={{
                  fontWeight: isBest ? 'bold' : undefined,
                  color: isBest ? 'green' : undefined,
                }}
              >
                {finalTime != null ? `${finalTime.toFixed(2)} sec` : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
