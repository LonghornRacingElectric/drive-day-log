# Longhorn Racing Drive Day Log
![Status](https://img.shields.io/badge/status-active-success)
![Deployed](https://img.shields.io/badge/deployed-vercel-black)
![Version](https://img.shields.io/badge/version-1.2.0-blue)

A web-based logging tool for Longhorn Racing drive days.

Used by Trackside Engineering to record driver performance, lap times, penalties, and session conditions.



## 🌐 Official Tool
This tool is maintained by Longhorn Racing and is available at:

https://driveday.lhre.org


## 📸 Preview
![Preview](./public/preview_metadata.png)
![Preview](./public/preview_timer.png)


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
  - Event type (Skidpad, Autocross, Endurance, Kart)
  - Weather & track conditions
  - Start/end times
  - Power limit & distance
- Tire data logging
- State of Charge (SOC) tracking
- Track image upload
- Local persistence
- Export run sheet as formatted PDF for sharing and archiving


## 🏁 Drive Day Workflow
1. Add drivers
2. Record laps (live or manual)
3. Input penalties during laps
4. Fill in session metadata
5. Export


## 🧠 Timing Logic
- If one lap is entered, used directly
- If two laps are entered, average is used
- Penalties are applied after base time calculation

$$Final Time = baseTime + (2 \times cones) + (20 \times offtrack)$$


## ⚠️ Data Storage
- Stored in browser (LocalStorage)
- Clearing browser data will erase session
- Not synced across devices (yet)


## 🛠️ Tech Stack
- React + TypeScript
- Vite
- LocalStorage
- Vercel (deployment)


## 📜 Changelog
See [CHANGELOG.md](./CHANGELOG.md) for full version history.


## 👥 Maintainers
Nathan Yee (Trackside Engineering)


## 📦 Version
Current version: 1.2.0