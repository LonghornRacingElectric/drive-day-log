export type Lap = {
    id: string
    time1: number | null
    time2: number | null
    cones: number
    offTrack: number
    isLive?: boolean
    notes?: string
    startTimestamp?: number   // epoch ms — set when the lap goes live, used by all clients to compute elapsed
}

export function getBaseTime(lap: Lap): number | null {
    if (lap.time1 == null || lap.time2 == null) 
        return null
    return (lap.time1 + lap.time2) / 2
}

/** Returns true when a skidpad lap should be treated as a DNF (off-track > 0). */
export function isSkidpadDNF(lap: Lap): boolean {
    return lap.offTrack > 0
}

/**
 * Computes the final scored time for a lap.
 * - Regular events: +2s per cone, +20s per off-track
 * - Skidpad (isSkidpad=true): +0.125s per cone, off-track = DNF (returns null)
 */
export function getFinalTime(lap: Lap, isSkidpad = false): number | null {
    const { time1, time2, cones, offTrack } = lap
  
    if (time1 == null && time2 == null) return null

    // Skidpad: off-track is an automatic DNF
    if (isSkidpad && offTrack > 0) return null
  
    let baseTime: number
  
    if (time1 != null && time2 != null) {
      baseTime = (time1 + time2) / 2
    } else {
      baseTime = time1 ?? time2!
    }

    if (isSkidpad) {
      return baseTime + 0.125 * cones
    }
  
    return baseTime + 2 * cones + 20 * offTrack
}


export function getBestTime(laps: Lap[], isSkidpad = false): number | null {
    const times = laps
      .map((l) => getFinalTime(l, isSkidpad))
      .filter((t): t is number => t != null)
  
    return times.length ? Math.min(...times) : null
}

export function getAverageTime(laps: Lap[], isSkidpad = false): number | null {
    const times = laps
      .map((l) => getFinalTime(l, isSkidpad))
      .filter((t): t is number => t != null)
  
    if (!times.length) return null
    return times.reduce((a, b) => a + b, 0) / times.length
}

export function getTotalPenalties(laps: Lap[]): number {
    return laps.reduce((sum, l) => sum + l.cones + l.offTrack, 0)
}

export function getPenaltiesPerLap(laps: Lap[], isSkidpad = false): number | null {
    // For skidpad, DNF laps are excluded from denominator
    const scoredLaps = isSkidpad ? laps.filter((l) => !isSkidpadDNF(l)) : laps
    if (!scoredLaps.length) return null
    return getTotalPenalties(scoredLaps) / scoredLaps.length
}

export function getStdDev(laps: Lap[], isSkidpad = false): number | null {
    const times = laps
      .map((l) => getFinalTime(l, isSkidpad))
      .filter((t): t is number => t != null)

    if (times.length < 2) return null
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const variance = times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / times.length
    return Math.sqrt(variance)
}