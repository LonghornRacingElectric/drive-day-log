# Changelog

All notable changes to the Drive Day Log will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project follows Semantic Versioning.

---

## [2.2.1] - 2026-04-12

### Improvements
- Added recent sessions to SessionGate


## [2.2.0] - 2026-04-12

### Improvements
- Added option to download as XLSX
- Added auto start time for drivers
- Update live timing, can add cones and off track during the lap now

### Fixes
- Adjusted PDF and XLSX export
- 

## [2.1.4] - 2026-04-12

### Improvements
- Added option to download as XLSX


## [2.1.3] - 2026-04-12

### Improvements
- Improved mobile view, header is less cluttered and buttons are bigger
- Added session leaderboard and session averages to the PDF export


## [2.1.2] - 2026-04-12

### Improvements
- Added light/dark mode toggle
- Changed 'wet track' to a slider


## [2.1.1] - 2026-03-30

### Fixes
- Removed Time 1 and Time 2 columns for Marshal View
- Removed clutter for header for Marshal View
- Improved mobile view


## [2.1.0] - 2026-03-30

### Marshal View Update

### Added
- Mobile-optimized marshal interface
- Role-based UI (marshal vs admin)

### Improvements
- Streamlined marshal view to only show driver laps and penalties
- Removed unnecessary panels (track map, leaderboard, metadata)
- Faster and more usable for live drive day logging


## [2.0.0] - 2026-03-29

### Major Release — Real-Time Sessions

### Added
- Real-time session syncing using Firebase Firestore
- Session-based architecture with 6-character join codes
- Multi-user support across devices
- Role system:
  - Admin (full control)
  - Marshal (cones + off-track only)
- SessionGate UI for creating/joining sessions
- Session code sharing + copy-to-clipboard
- Role badge (Admin / Marshal)
- PDF export button for formatted run sheets

### Improved
- Complete frontend redesign (layout, cards, spacing, hierarchy)
- Driver stats:
  - Best time
  - Average time
  - Total penalties
  - Penalties per lap
  - Consistency (standard deviation)
- Session leaderboard (top laps)
- Session averages (cross-stint analysis)
- Confirmation modals:
  - Delete lap
  - Delete driver
  - Reset session
- Track layout upload synced across users

### Changed
- Data storage moved from localStorage → Firebase (cloud-based)
- Session is now shared across devices instead of local-only

### Fixed
- Sync inconsistencies between clients
- UI issues with previous print/export flow

###  Breaking Changes
- Sessions are no longer stored locally
- Requires internet connection for real-time sync


## [1.3.0] - 2026-03-29

### Added
- Session leaderboard for ranking drivers by performance
- Session-wide averages for improved comparison across drivers
- Expanded driver statistics:
  - Total penalties
  - Penalties per lap
  - Consistency (standard deviation of lap times)

### Changed
- Improved visibility and usefulness of performance metrics
- Enhanced overall data analysis capabilities within the app

### Fixed
- Fixed issue with delete driver confirmation modal

## [1.2.0] - 2026-03-29

### Added
- Export Run Sheet feature
  - Generates a clean, formatted PDF
  - Includes session metadata, driver data, and lap tables
  - Optimized for sharing via Slack and SharePoint

### Changed
- Improved workflow for post-session data sharing


## [1.1.0] - 2026-03-29

### Added
- Confirmation modals for:
  - Reset session
  - Delete lap
  - Delete driver

### Changed
- Major frontend UI redesign
- Improved driver and lap interaction UX
- Improved usability during live drive day usage


## [1.0.0] - 2026-03-28

### Added
- Initial release of Drive Day Log
- Driver-based lap tracking system
- Automatic lap creation
- Best and average lap time calculations
- Penalty system:
  - +2s per cone
  - +20s per missed gate
- Session metadata logging (event, weather, timing, power, distance)
- Tire data logging
- State of Charge (SOC) tracking
- Track image upload
- LocalStorage persistence
- Print to PDF export
- Deployment via Vercel

