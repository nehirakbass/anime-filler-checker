# 🎯 Anime Filler Checker v2

Chrome/Edge extension that **auto-detects** the anime and episode you're watching and shows a **floating badge directly on the page** — FILLER, CANON, MIXED, or ANIME CANON.

## What's New in v2
- **On-page badge** — No need to open the popup! A floating badge appears automatically
- **URL parsing** — Works with Turkish sites like `tranimeizle.io` (e.g. `/one-piece-50-bolum-izle`)
- **No DOMParser** — Background uses regex parsing (fixes service worker crash)
- **Draggable badge** — Move the badge anywhere on the page
- **Better popup styling** — Glassmorphism dark UI

## Install
1. Unzip
2. `chrome://extensions/` → Developer mode ON
3. **Load unpacked** → select folder
4. Done!

## How It Works
1. Visit any anime streaming page
2. Badge auto-appears in top-right corner showing FILLER/CANON status
3. Click extension icon for manual override + details
