import * as XLSX from 'xlsx'
import type { Driver } from './types/driveDay'
import { getFinalTime } from './calculations'

export function exportDriveDayXLSX(drivers: Driver[]) {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Track per-event stint counts for labeling (e.g. "Acceleration 1 - Nathan")
  const eventCounters: Record<string, number> = {}

  // Iterate exactly over each driver object as its own "stint" and therefore its own sheet
  drivers.forEach((driver) => {
    // We only want completed laps, ignoring LIVE
    const completedLaps = driver.laps.filter((l) => !l.isLive)

    // Determine event name for this stint
    const stintEvent = driver.event || 'Stint'
    eventCounters[stintEvent] = (eventCounters[stintEvent] ?? 0) + 1
    const stintNumber = eventCounters[stintEvent]

    // Build rows for this specific stint
    const rows = completedLaps.map((lap, lapIndex) => {
      const rawTime = (lap.time1 || 0) + (lap.time2 ? lap.time2 : 0)
      const finalTime = getFinalTime(lap)

      return {
        'Run #': lapIndex + 1,
        'Driver Name': driver.name,
        'Vehicle': driver.vehicle || '—',
        'Event': stintEvent,
        'Time 1': lap.time1 != null ? lap.time1.toFixed(3) : '',
        'Time 2': lap.time2 != null ? lap.time2.toFixed(3) : '',
        'Raw Time': isNaN(rawTime) || rawTime === 0 ? '' : rawTime.toFixed(2),
        'Cones Hit': lap.cones,
        'Off Track': lap.offTrack,
        'Final Time': finalTime != null ? finalTime.toFixed(2) : '',
        'Notes': lap.notes ?? '',
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Customize column widths automatically for better UI readability
    const wscols = [
      { wch: 8 },  // Run #
      { wch: 16 }, // Driver Name
      { wch: 12 }, // Vehicle
      { wch: 16 }, // Event
      { wch: 10 }, // Time 1
      { wch: 10 }, // Time 2
      { wch: 12 }, // Raw Time
      { wch: 12 }, // Cones Hit
      { wch: 12 }, // Off Track
      { wch: 12 }, // Final Time
      { wch: 28 }, // Notes
    ]
    ws['!cols'] = wscols

    // Name the sheet (e.g. "Acceleration 1 - Nathan")
    // Note: Excel sheet names are strictly limited to 31 chars safely
    let sheetName = `${stintEvent} ${stintNumber} - ${driver.name}`.substring(0, 31)

    // Append sheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  // If no drivers exist, export an empty sheet so it doesn't crash
  if (drivers.length === 0) {
    const ws = XLSX.utils.json_to_sheet([{ Message: 'No stints recorded.' }])
    XLSX.utils.book_append_sheet(wb, ws, 'Empty Session')
  }

  // Trigger download instantly
  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `DriveDayLog_${dateStr}.xlsx`)
}
