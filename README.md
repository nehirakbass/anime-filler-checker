# 🎯 Anime Filler Checker

Browser extension that **auto-detects** the anime and episode you're watching and shows a **floating badge directly on the page** — FILLER ⛔, CANON ✅, MIXED ⚠️, or ANIME CANON 🔵.

Works on **Chrome**, **Edge**, **Firefox**, and all Chromium-based browsers.

🌐 **Website:** [animefillerchecker.com](https://animefillerchecker.com)

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
- 💾 **Smart cache** — Filler data cached for 14 days, MAL scores for 5 days

## Install

### Chrome / Edge (Chromium)
1. Download or clone this repo
2. Go to `chrome://extensions/` → Enable **Developer mode**
3. Click **Load unpacked** → select the repo folder
4. Done!

### Firefox
1. Download or clone this repo
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select `firefox-build/manifest.json`
4. Done! *(Note: temporary add-ons are removed when Firefox closes)*

> **Tip:** For a permanent install, get it from [Firefox Add-ons (AMO)](https://addons.mozilla.org) once it's approved.

## How It Works
1. Visit any anime streaming page
2. Badge auto-appears in top-right corner showing FILLER/CANON status
3. Click extension icon for manual override + details
4. MAL score, member count, and airing status shown alongside the result

## Data Sources
- **Filler data** — [AnimeFillerList.com](https://www.animefillerlist.com)
- **Anime scores & info** — [MyAnimeList](https://myanimelist.net) via [Jikan API](https://jikan.moe)
