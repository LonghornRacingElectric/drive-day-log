export type Lap = {
    id: string
    time1: number | null
    time2: number | null
    cones: number
    offTrack: number
    isLive?: boolean
}

export function getBaseTime(lap: Lap): number | null {
    if (lap.time1 == null || lap.time2 == null) 
        return null
    return (lap.time1 + lap.time2) / 2
}

export function getFinalTime(lap: Lap): number | null {
    const { time1, time2, cones, offTrack } = lap
  
    if (time1 == null && time2 == null) return null
  
    let baseTime: number
  
    if (time1 != null && time2 != null) {
      baseTime = (time1 + time2) / 2
    } else {
      baseTime = time1 ?? time2!
    }
  
    return baseTime + 2 * cones + 20 * offTrack
}


export function getBestTime(laps: Lap[]): number | null {
    const times = laps
      .map(getFinalTime)
      .filter((t): t is number => t != null)
  
    return times.length ? Math.min(...times) : null
}

export function getAverageTime(laps: Lap[]): number | null {
    const times = laps
      .map(getFinalTime)
      .filter((t): t is number => t != null)
  
    if (!times.length) return null
    return times.reduce((a, b) => a + b, 0) / times.length
}

export function getTotalPenalties(laps: Lap[]): number {
    return laps.reduce((sum, l) => sum + l.cones + l.offTrack, 0)
}

export function getPenaltiesPerLap(laps: Lap[]): number | null {
    if (!laps.length) return null
    return getTotalPenalties(laps) / laps.length
}

export function getStdDev(laps: Lap[]): number | null {
    const times = laps
      .map(getFinalTime)
      .filter((t): t is number => t != null)

    if (times.length < 2) return null
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const variance = times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / times.length
    return Math.sqrt(variance)
}