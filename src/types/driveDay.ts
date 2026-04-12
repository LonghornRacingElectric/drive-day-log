import type { Lap } from '../calculations'

export type TireData = {
    coldP: string
    coldT: string
    hotP: string
    hotT: string
    depth: string
  }

export type Driver = {
    id: string
    name: string
    laps: Lap[]
    sessionStart: string
    sessionEnd: string
    vehicle: string
    comments: string

    tires?: {
        frontRight: TireData
        frontLeft: TireData
        rearRight: TireData
        rearLeft: TireData
    }
}

export type SOCData = {
    id: string
    initialSOC: string
    finalSOC: string
    initialVolts: string
    finalVolts: string
}


export type SessionMetadata = {
    date: string
    event: string
    weather: string
    startTime: string
    endTime: string

    sessionGoals: string

    trackConditions: {
        wind: string
        humidity: string
        ambientTemp: string
        wetTrack: number
        trackTemp: string
    }

    stateOfCharge: SOCData[]

    powerLimit: string
    totalDistance: string
}