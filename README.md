# Longhorn Racing Drive Day Log

A web-based logging tool for Longhorn Racing drive days.  
Designed to track driver performance, lap times, penalties, and session conditions in a clean and accessible interface. Built for fast trackside data entry and later synchronization with MyChron telemetry.

---

## Features

- Add unlimited drivers
- Track lap times (single or dual timer logic)
- Automatic lap creation on time entry
- Penalty calculations (cones + off track)
- Best & average lap time calculations
- Driver stint start/end trackings
- Vehicle selection per driver
- Driver comments
- Track image upload panel
- LocalStorage persistence (refresh-safe)

---

## Requirements

Before running this project locally, make sure you have:

- **Node.js (v18 or newer)**  
  Download: https://nodejs.org
- **npm** (comes with Node.js)
- **Git** (recommended for cloning)

To verify installation:

```bash
node -v
npm -v
```

## Set Up Instructions

Open your terminal and navigate to where you want the project (e.g., Documents, Downloads)

```bash
cd path/to/your/desired/folder
```

Clone the repository

```bash
git clone https://github.com/LonghornRacingElectric/drive-day-log.git
```

Move into the project directory

```bash
cd drive-day-log
```

Make sure you have Node.js (v18 or newer) installed.
Then run

```bash
npm install
```

You should see something like

```bash
Local: http://localhost:5173/
```

Open that URL in your browser to use the Drive Day Log. If the page is blank white, open browser console and type

```bash
localStorage.clear()
```
