# Longhorn Racing Drive Day Log

- A web-based logging tool for Longhorn Racing drive days.
- Used by Trackside Engineering to record driver performance, lap times, penalties, and session conditions.

## 🌐 Live App
https://driveday.lhre.org


## 🎯 Purpose
- This tool standardizes how drive day data is recorded and analyzed across the team.  
- It replaces inconsistent spreadsheets and ensures reliable, structured data collection.


## 🚀 Features
- Driver-based lap tracking
- Automatic lap creation
- Best & average time calculations
- Penalty system:
  - +2s per cone
  - +20s per missed gate
- Session metadata:
  - Event data (Skidpad, Autocross, Endurance, Kart)
  - Weather & track conditions
  - Start/end times
  - Power limit & distance
- Tire data logging
- State of Charge (SOC) tracking
- Track image upload
- Local persistence
- Print to PDF export


## 🧠 Timing Logic
- If one lap is entered, used directly
- If two laps are entered, average is used
- Penalties are applied after base time calculation

$$Final Time = baseTime + (2 * cones) + (20 * offtrack)$$


## 🏁 Drive Day Workflow
1. Add drivers
2. Record laps (live or manual)
3. Input penalties during laps
4. Fill in session metadata
5. Export


## ⚠️ Data Storage
- Stored in browser (local storage)
- Clearing browser data will erase session
- Not synced across devices (yet)


## 🛠️ Tech Stack
- React + TypeScript
- Vite
- Local Storage
- Vercel (deployment)
