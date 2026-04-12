import { jsPDF } from 'jspdf'
import type { Driver, SessionMetadata } from './types/driveDay'
import { getFinalTime, getBestTime, getAverageTime, getTotalPenalties, getPenaltiesPerLap, getStdDev } from './calculations'

// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  bg:        [18,  20,  26]  as [number,number,number],
  surface:   [22,  25,  31]  as [number,number,number],
  elevated:  [28,  32,  42]  as [number,number,number],
  orange:    [191, 87,  0]   as [number,number,number],
  orangeL:   [232, 103, 26]  as [number,number,number],
  green:     [34,  197, 94]  as [number,number,number],
  text:      [240, 242, 245] as [number,number,number],
  textSec:   [139, 144, 153] as [number,number,number],
  textMuted: [85,  92,  106] as [number,number,number],
  border:    [40,  45,  58]  as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  red:       [239, 68,  68]  as [number,number,number],
  yellow:    [245, 158, 11]  as [number,number,number],
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function rgb(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2])
}
function fill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2])
}
function stroke(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function fmtTime(val: number | null | undefined): string {
  if (val == null) return '—'
  return val.toFixed(2) + 's'
}

function fmtOrDash(val: string | undefined): string {
  return val && val.trim() ? val.trim() : '—'
}

// Draw a filled rounded-ish rectangle (jsPDF only supports plain rect natively)
function drawCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  bgColor: [number,number,number] = C.surface,
) {
  fill(doc, bgColor)
  stroke(doc, C.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')
}

// ── Main export function ─────────────────────────────────────────────────────
export function exportDriveDayPDF(
  sessionMeta: SessionMetadata,
  drivers: Driver[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210  // page width mm
  const PH = 297  // page height mm
  const ML = 14   // margin left
  const MR = 14   // margin right
  const CW = PW - ML - MR  // content width

  // Track current Y for flowing layout
  let y = 0

  // ── Helper: check page break ──────────────────────────────────────────────
  function needsPageBreak(requiredHeight: number) {
    if (y + requiredHeight > PH - 14) {
      doc.addPage()
      fill(doc, C.bg)
      doc.rect(0, 0, PW, PH, 'F')
      addPageHeader()
      y = 36
      return true
    }
    return false
  }

  function addPageHeader() {
    // Slim top bar
    fill(doc, C.elevated)
    doc.rect(0, 0, PW, 10, 'F')
    fill(doc, C.orange)
    doc.rect(0, 10, PW, 0.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    rgb(doc, C.orange)
    doc.text('LONGHORN RACING ELECTRIC', ML, 6.5)

    doc.setFont('helvetica', 'normal')
    rgb(doc, C.textMuted)
    doc.text('DRIVE DAY LOG', PW - MR, 6.5, { align: 'right' })
  }

  // ── COVER / FIRST PAGE ────────────────────────────────────────────────────
  // Full dark background
  fill(doc, C.bg)
  doc.rect(0, 0, PW, PH, 'F')

  // Hero background stripe
  fill(doc, C.elevated)
  doc.rect(0, 0, PW, 52, 'F')

  // Orange accent bar
  fill(doc, C.orange)
  doc.rect(0, 52, PW, 1.2, 'F')

  // Logo text / team name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  rgb(doc, C.orange)
  doc.text('LONGHORN RACING ELECTRIC', ML, 16)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  rgb(doc, C.white)
  doc.text('Drive Day Log', ML, 30)

  // Subtitle — event + date
  const eventLabel = fmtOrDash(sessionMeta.event)
  const dateLabel  = fmtOrDash(sessionMeta.date)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  rgb(doc, C.textSec)
  doc.text(`${eventLabel}  ·  ${dateLabel}`, ML, 40)

  // Right side: time range
  if (sessionMeta.startTime || sessionMeta.endTime) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    rgb(doc, C.textMuted)
    const timeStr = `${fmtOrDash(sessionMeta.startTime)} – ${fmtOrDash(sessionMeta.endTime)}`
    doc.text(timeStr, PW - MR, 40, { align: 'right' })
  }

  y = 62

  // ── Session Goals ─────────────────────────────────────────────────────────
  if (sessionMeta.sessionGoals?.trim()) {
    drawCard(doc, ML, y, CW, 18, C.surface)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    rgb(doc, C.orange)
    doc.text('SESSION GOALS', ML + 4, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    rgb(doc, C.text)
    doc.text(sessionMeta.sessionGoals.trim(), ML + 4, y + 13, { maxWidth: CW - 8 })
    y += 22
  }

  // ── SESSION INFO card ─────────────────────────────────────────────────────
  const siItems: [string, string][] = [
    ['Date',           fmtOrDash(sessionMeta.date)],
    ['Event',          fmtOrDash(sessionMeta.event)],
    ['Weather',        fmtOrDash(sessionMeta.weather)],
    ['Day Start',      fmtOrDash(sessionMeta.startTime)],
    ['Day End',        fmtOrDash(sessionMeta.endTime)],
    ['Total Distance', sessionMeta.totalDistance ? sessionMeta.totalDistance + ' mi' : '—'],
  ]

  const siCardH = 10 + Math.ceil(siItems.length / 4) * 14 + 4
  drawCard(doc, ML, y, CW, siCardH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  rgb(doc, C.orange)
  doc.text('SESSION INFO', ML + 4, y + 6)

  // Items in a 4-column flow
  const colW = CW / 4
  siItems.forEach(([label, value], i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const ix = ML + 4 + col * colW
    const iy = y + 13 + row * 14

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    rgb(doc, C.textMuted)
    doc.text(label.toUpperCase(), ix, iy)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    rgb(doc, C.text)
    doc.text(value, ix, iy + 5)
  })

  y += siCardH + 5

  // ── TRACK CONDITIONS ──────────────────────────────────────────────────────
  const tc = sessionMeta.trackConditions
  const tcItems: [string, string][] = [
    ['Wind',         tc.wind ? tc.wind + ' mph' : '—'],
    ['Humidity',     tc.humidity ? tc.humidity + '%' : '—'],
    ['Ambient Temp', tc.ambientTemp ? tc.ambientTemp + '°F' : '—'],
    ['Track Temp',   tc.trackTemp ? tc.trackTemp + '°F' : '—'],
    ['Wet Track',    (tc.wetTrack ?? 0) + '%'],
  ]

  const tcCardH = 26
  drawCard(doc, ML, y, CW, tcCardH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  rgb(doc, C.orange)
  doc.text('TRACK CONDITIONS', ML + 4, y + 6)

  const tcColW = CW / 5
  tcItems.forEach(([label, value], i) => {
    const ix = ML + 4 + i * tcColW
    const iy = y + 13

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    rgb(doc, C.textMuted)
    doc.text(label.toUpperCase(), ix, iy)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    rgb(doc, i === 4 && (tc.wetTrack ?? 0) > 0 ? C.red : C.text)
    doc.text(value, ix, iy + 5.5)
  })

  y += tcCardH + 5

  // ── STATE OF CHARGE ───────────────────────────────────────────────────────
  const socRows = sessionMeta.stateOfCharge.filter(
    (r) => r.initialSOC || r.finalSOC || r.initialVolts || r.finalVolts
  )

  if (socRows.length) {
    const socCardH = 10 + 7 + socRows.length * 8 + 4
    needsPageBreak(socCardH + 5)
    drawCard(doc, ML, y, CW, socCardH)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    rgb(doc, C.orange)
    doc.text('STATE OF CHARGE', ML + 4, y + 6)

    // Table header
    const socCols = ['#', 'INITIAL SOC', 'FINAL SOC', 'INITIAL VOLTS', 'FINAL VOLTS']
    const socColW = [12, (CW - 20) / 4, (CW - 20) / 4, (CW - 20) / 4, (CW - 20) / 4]

    let hx = ML + 4
    let hy = y + 14
    socCols.forEach((h, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      rgb(doc, C.textMuted)
      doc.text(h, hx, hy)
      hx += socColW[i]
    })

    // Divider
    stroke(doc, C.border)
    doc.setLineWidth(0.2)
    doc.line(ML + 4, hy + 1.5, ML + CW - 4, hy + 1.5)

    socRows.forEach((row, ri) => {
      const rx = ML + 4
      const ry = hy + 5 + ri * 8
      const vals = [
        String(ri + 1),
        fmtOrDash(row.initialSOC),
        fmtOrDash(row.finalSOC),
        fmtOrDash(row.initialVolts),
        fmtOrDash(row.finalVolts),
      ]

      if (ri % 2 === 0) {
        fill(doc, C.elevated)
        doc.rect(ML + 2, ry - 3.5, CW - 4, 7.5, 'F')
      }

      let cx = rx
      vals.forEach((v, i) => {
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
        doc.setFontSize(8)
        rgb(doc, i === 0 ? C.textSec : C.text)
        doc.text(v, cx, ry)
        cx += socColW[i]
      })
    })

    y += socCardH + 5
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── DRIVER SECTIONS ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  drivers.forEach((driver, di) => {
    const completedLaps = driver.laps.filter((l) => !l.isLive)
    const best       = getBestTime(completedLaps)
    const avg        = getAverageTime(completedLaps)
    const penalties  = getTotalPenalties(completedLaps)
    const penPerLap  = getPenaltiesPerLap(completedLaps)
    const stdDev     = getStdDev(completedLaps)

    // Estimate space needed: header + fields + laps + (optional tires)
    const lapH    = completedLaps.length * 8 + 28
    const tiresH  = driver.tires ? 60 : 0
    const totalH  = 26 + lapH + tiresH + 10

    needsPageBreak(totalH > 80 ? 80 : totalH)

    // ── Driver Header card ─────────────────────────────────────────────────
    drawCard(doc, ML, y, CW, 24, C.elevated)

    // Orange left accent
    fill(doc, C.orange)
    doc.roundedRect(ML, y, 2.5, 24, 1, 1, 'F')

    // Initials bubble
    const initials = driver.name.split(' ').map((w) => w[0] || '').join('').toUpperCase().slice(0, 2)
    fill(doc, C.bg)
    doc.circle(ML + 13, y + 12, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    rgb(doc, C.orangeL)
    doc.text(initials, ML + 13, y + 13.5, { align: 'center' })

    // Driver name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    rgb(doc, C.white)
    doc.text(driver.name, ML + 23, y + 10)

    // Vehicle badge
    if (driver.vehicle) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      rgb(doc, C.orange)
      doc.text(driver.vehicle.toUpperCase(), ML + 23, y + 17)
    }

    // Stats on the right — two rows of 3
    const statsRow1: [string, string, boolean][] = [
      ['BEST',       fmtTime(best),                            true ],
      ['AVG',        fmtTime(avg),                             false],
      ['LAPS',       String(completedLaps.length),             false],
    ]
    const statsRow2: [string, string, boolean][] = [
      ['PENALTIES',  completedLaps.length ? String(penalties) : '—',               penalties > 0],
      ['PEN / LAP',  penPerLap != null ? penPerLap.toFixed(2) : '—',               false],
      ['CONSISTENCY', stdDev != null ? '+/-' + stdDev.toFixed(2) + 's' : '—',     false],
    ]

    const renderStatRow = (
      row: [string, string, boolean][],
      rowY: number,
    ) => {
      let sx = PW - MR - 16
      ;[...row].reverse().forEach(([label, val, highlight]) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5)
        rgb(doc, C.textMuted)
        doc.text(label, sx, rowY, { align: 'center' })

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        rgb(doc, highlight && label === 'BEST' ? C.green : highlight ? C.yellow : C.text)
        doc.text(val, sx, rowY + 5.5, { align: 'center' })
        sx -= 26
      })
    }

    renderStatRow(statsRow1, y + 7)
    renderStatRow(statsRow2, y + 16)

    y += 27

    // ── Driver meta row (stint times, comments) ───────────────────────────
    const metaH = (driver.comments?.trim() ? 14 : 0) + 14
    drawCard(doc, ML, y, CW, metaH)

    let mx = ML + 4
    const metaItems: [string, string][] = [
      ['Stint Start', fmtOrDash(driver.sessionStart)],
      ['Stint End',   fmtOrDash(driver.sessionEnd)],
    ]
    metaItems.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      rgb(doc, C.textMuted)
      doc.text(label.toUpperCase(), mx, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      rgb(doc, C.text)
      doc.text(val, mx, y + 11.5)
      mx += 40
    })

    if (driver.comments?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      rgb(doc, C.textMuted)
      doc.text('COMMENTS / NOTES', mx, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      rgb(doc, C.textSec)
      doc.text(driver.comments.trim(), mx, y + 11.5, { maxWidth: CW - mx + ML - 4 })
    }

    y += metaH + 3

    // ── Lap Table ─────────────────────────────────────────────────────────
    if (completedLaps.length) {
      needsPageBreak(20)

      // Table header
      const lapCols: [string, number][] = [
        ['LAP',       16],
        ['TIME 1',    28],
        ['TIME 2',    28],
        ['CONES HIT', 26],
        ['OFF TRACK', 26],
        ['FINAL',     28],
      ]

      // Header row bg
      fill(doc, C.elevated)
      doc.rect(ML, y, CW, 8, 'F')
      stroke(doc, C.border)
      doc.setLineWidth(0.2)
      doc.rect(ML, y, CW, 8, 'S')

      let hcx = ML + 3
      lapCols.forEach(([h, w]) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.5)
        rgb(doc, C.textMuted)
        doc.text(h, hcx, y + 5.3)
        hcx += w
      })

      y += 8

      completedLaps.forEach((lap, li) => {
        needsPageBreak(9)
        const finalTime = getFinalTime(lap)
        const isBest = finalTime != null && best != null && finalTime === best

        // Alternating row background
        if (li % 2 === 0) {
          fill(doc, C.surface)
          doc.rect(ML, y, CW, 8, 'F')
        }

        // Best lap highlight
        if (isBest) {
          fill(doc, [20, 50, 30] as [number,number,number])
          doc.rect(ML, y, CW, 8, 'F')
        }

        stroke(doc, C.border)
        doc.setLineWidth(0.15)
        doc.rect(ML, y, CW, 8, 'S')

        const vals: string[] = [
          String(li + 1),
          fmtTime(lap.time1),
          fmtTime(lap.time2),
          String(lap.cones),
          String(lap.offTrack),
          finalTime != null ? finalTime.toFixed(2) + 's' + (isBest ? ' *' : '') : '—',
        ]

        let vcx = ML + 3
        lapCols.forEach(([, w], ci) => {
          const isLast = ci === lapCols.length - 1
          doc.setFont('helvetica', isLast && isBest ? 'bold' : 'normal')
          doc.setFontSize(8)
          rgb(doc, isLast && isBest ? C.green : ci === 0 ? C.textSec : C.text)
          doc.text(vals[ci], vcx, y + 5.3)
          vcx += w
        })

        y += 8
      })

      y += 4
    }

    // ── Tire Table ────────────────────────────────────────────────────────
    if (driver.tires) {
      needsPageBreak(16 + 4 * 9 + 6)

      const tireH = 16 + 4 * 9 + 6
      drawCard(doc, ML, y, CW, tireH)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      rgb(doc, C.orange)
      doc.text(`TIRE DATA — ${driver.name.toUpperCase()}`, ML + 4, y + 7)

      const tireCols: [string, number][] = [
        ['CORNER',      36],
        ['COLD P (psi)', 30],
        ['COLD T (°C)',  30],
        ['HOT P (psi)', 30],
        ['HOT T (°C)',  30],
        ['DEPTH (in)',  30],
      ]

      let thy = y + 12
      let thx = ML + 4
      tireCols.forEach(([h, w]) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.5)
        rgb(doc, C.textMuted)
        doc.text(h, thx, thy)
        thx += w
      })

      thy += 2
      stroke(doc, C.border)
      doc.setLineWidth(0.2)
      doc.line(ML + 4, thy, ML + CW - 4, thy)

      const corners = [
        { key: 'frontRight' as const, label: 'Front Right' },
        { key: 'frontLeft'  as const, label: 'Front Left'  },
        { key: 'rearRight'  as const, label: 'Rear Right'  },
        { key: 'rearLeft'   as const, label: 'Rear Left'   },
      ]

      corners.forEach(({ key, label }, ri) => {
        const tire = driver.tires![key]
        if (!tire) return
        const ry = thy + 4 + ri * 9
        if (ri % 2 === 0) {
          fill(doc, C.elevated)
          doc.rect(ML + 2, ry - 3, CW - 4, 8, 'F')
        }

        const row = [label, tire.coldP || '—', tire.coldT || '—', tire.hotP || '—', tire.hotT || '—', tire.depth || '—']
        let tx = ML + 4
        tireCols.forEach(([, w], ci) => {
          doc.setFont('helvetica', ci === 0 ? 'bold' : 'normal')
          doc.setFontSize(7.5)
          rgb(doc, ci === 0 ? C.textSec : C.text)
          doc.text(row[ci], tx, ry + 1.5)
          tx += w
        })
      })

      y += tireH + 6
    }

    // Spacer between drivers (unless last)
    if (di < drivers.length - 1) {
      y += 4
      stroke(doc, C.border)
      doc.setLineWidth(0.3)
      fill(doc, C.orange)
      doc.rect(ML, y, CW, 0.5, 'F')
      y += 6
    }
  })

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    fill(doc, C.elevated)
    doc.rect(0, PH - 9, PW, 9, 'F')
    fill(doc, C.orange)
    doc.rect(0, PH - 9, PW, 0.4, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    rgb(doc, C.textMuted)
    doc.text(`Longhorn Racing Electric · Drive Day Log · Generated ${new Date().toLocaleDateString()}`, ML, PH - 3.5)
    doc.text(`${pg} / ${totalPages}`, PW - MR, PH - 3.5, { align: 'right' })
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const raw = sessionMeta.date // stored as YYYY-MM-DD
  let datePart = ''
  if (raw && raw.includes('-')) {
    const [yyyy, dd, mm] = raw.split('-')
    const yy = yyyy.slice(2)
    datePart = `${dd}-${mm}-${yy} `
  }
  const filename = `${datePart}Drive Day Run Sheet.pdf`

  doc.save(filename)
}
