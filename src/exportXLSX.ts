import * as XLSX from 'xlsx'
import type { Driver } from './types/driveDay'
import { getFinalTime } from './calculations'

export function exportDriveDayXLSX(drivers: Driver[]) {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Iterate exactly over each driver object as its own "stint" and therefore its own sheet
  drivers.forEach((driver, index) => {
    // We only want completed laps, ignoring LIVE
    const completedLaps = driver.laps.filter((l) => !l.isLive)
    
    // Build rows for this specific stint
    const rows = completedLaps.map((lap, lapIndex) => {
      const rawTime = (lap.time1 || 0) + (lap.time2 ? lap.time2 : 0)
      const finalTime = getFinalTime(lap)

      return {
        'Lap Number': lapIndex + 1,
        'Driver Name': driver.name,
        'Vehicle': driver.vehicle || '—',
        'Raw Time': isNaN(rawTime) || rawTime === 0 ? '' : rawTime.toFixed(2),
        'Cones Hit': lap.cones,
        'Off Track': lap.offTrack,
        'Final Time': finalTime != null ? finalTime.toFixed(2) : ''
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Customize column widths automatically for better UI readability
    const wscols = [
      { wch: 12 }, // Lap Number
      { wch: 15 }, // Driver Name
      { wch: 15 }, // Vehicle
      { wch: 12 }, // Raw Time
      { wch: 12 }, // Cones Hit
      { wch: 12 }, // Off Track
      { wch: 12 }  // Final Time
    ]
    ws['!cols'] = wscols

    // Name the sheet (e.g. "Stint 1 - Nathan")
    // Note: Excel sheet names are strictly limited to 31 chars safely
    let sheetName = `Stint ${index + 1} - ${driver.name}`.substring(0, 31)

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
