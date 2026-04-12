import type { Lap } from '../calculations'
import { getFinalTime } from '../calculations'
import LapRow from './LapRow'

type Props = {
  laps: Lap[]
  bestTime: number | null
  activeElapsed: number
  onUpdateLap: (lap: Lap) => void
  onDeleteLap: (lapId: string, index: number) => void
  isMarshal: boolean
}

export default function LapTable({
  laps,
  bestTime,
  activeElapsed,
  onUpdateLap,
  onDeleteLap,
  isMarshal,
}: Props) {
  if (!laps.length)
    return (
      <div className="no-laps">
        No laps recorded yet — start the timer below
      </div>
    )

  return (
    <div className="lap-table-wrap">
      <table className="lap-table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>Lap</th>
            {!isMarshal && <th>Time 1</th>}
            {!isMarshal && <th>Time 2</th>}
            <th>Cones Hit</th>
            <th>Off Track</th>
            <th>Final</th>
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
                  isMarshal={isMarshal}
                />

                <td>
                  {finalTime != null ? (
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
