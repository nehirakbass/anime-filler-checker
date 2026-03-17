# 🎯 Anime Filler Checker

Chrome/Edge extension that **auto-detects** the anime and episode you're watching and shows a **floating badge directly on the page** — FILLER ⛔, CANON ✅, MIXED ⚠️, or ANIME CANON 🔵.

## Screenshots

<p align="center">
  <img src="screenshots/promo-hero.png" width="800" alt="Anime Filler Checker - Skip the filler, watch what matters" />
</p>

## Features
- 🔍 **Auto-detect** — Detects anime name + episode number from the URL or page source
- 🏷️ **On-page badge** — Floating badge appears automatically, no popup needed
- ⭐ **MAL Score** — Shows MyAnimeList rating, member count, and status via Jikan API
- 🖱️ **Draggable** — Move the badge anywhere on the page
- 🔎 **Manual search** — Search any anime/episode from the popup
- 🌐 **Wide support** — Works on Crunchyroll, 9anime, and most anime streaming sites
- 💾 **Smart cache** — Results cached for 24h to minimize requests

## Install
1. Unzip
2. `chrome://extensions/` → Developer mode ON
3. **Load unpacked** → select folder
4. Done!

## How It Works
1. Visit any anime streaming page
2. Badge auto-appears in top-right corner showing FILLER/CANON status
3. Click extension icon for manual override + details
4. MAL score, member count, and airing status shown alongside the result

## Data Sources
- **Filler data** — [AnimeFillerList.com](https://www.animefillerlist.com)
- **Anime scores & info** — [MyAnimeList](https://myanimelist.net) via [Jikan API](https://jikan.moe)
