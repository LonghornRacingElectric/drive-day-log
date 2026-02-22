export type Lap = {
    id: string
    time1: number | null
    time2: number | null
    cones: number
    offTrack: number
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