# 🎯 Anime Filler Checker

Browser extension that **auto-detects** the anime and episode you're watching and shows a **floating badge directly on the page** — FILLER ⛔, CANON ✅, MIXED ⚠️, or ANIME CANON 🔵.

Works on **Chrome**, **Edge**, **Firefox**, and all Chromium-based browsers.

🌐 **Website:** [animefillerchecker.com](https://animefillerchecker.com)
💖 **Sponsor:** [github.com/sponsors/nehirakbass](https://github.com/sponsors/nehirakbass)

## Screenshots

<p align="center">
  <img src="screenshots/promo-hero.png" width="800" alt="Anime Filler Checker - Skip the filler, watch what matters" />
</p>

## Features
- 🔍 **Auto-detect** — Detects anime name + episode number from the URL, page title, and DOM
- 🏷️ **On-page badge** — Floating badge appears instantly, no popup needed
- ⭐ **MAL Score** — Shows MyAnimeList rating, member count, and airing status via Jikan API
- 🖱️ **Draggable** — Move the badge anywhere on the page
- 🔎 **Manual search** — Search any anime/episode from the popup
- 🌐 **Wide support** — Works on Crunchyroll, HiAnime, GoGoAnime, AnimePahe, AniWave, and more
- 💾 **Smart cache** — Filler data cached for 14 days, MAL scores for 5 days
- 🎨 **Themed badges** — Each verdict type has its own color and icon

## Install

### Chrome Web Store / Edge Add-ons
> Coming soon — [join the waitlist](https://animefillerchecker.com) to get notified.

### Firefox Add-ons
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--on-FF7139?logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/anime-filler-checker/)

### Manual Install (Chrome / Edge)
1. Download or clone this repo
2. Go to `chrome://extensions/` → Enable **Developer mode**
3. Click **Load unpacked** → select the repo folder
4. Done!

### Manual Install (Firefox)
1. Download or clone this repo
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select any file inside `firefox-build/`
4. Done! *(reloads each time Firefox restarts)*

## How It Works
1. **URL Analysis** — Parses the current page URL for anime name and episode patterns
2. **Page Title Scan** — Reads the `<title>` tag to confirm or extract episode info
3. **DOM Deep Search** — Searches page elements for episode titles and numbers
4. **AnimeFillerList Lookup** — Fetches filler/canon data from AnimeFillerList.com
5. **Verdict** — Renders a floating badge with the result + optional auto-skip to next canon episode

MAL score, member count, and airing status are shown alongside the result.

## Project Structure
```
├── manifest.json          # Chrome/Edge extension manifest (MV3)
├── background.js          # Service worker
├── content.js             # Content script (auto-detect + badge injection)
├── badge.css              # Badge styles
├── popup.html/js          # Extension popup UI
├── icons/                 # Extension & favicon icons
├── firefox-build/         # Firefox-specific build (MV3 + gecko config)
└── website/               # Landing page (React + Vite, deployed on Vercel)
    ├── src/
    │   ├── pages/         # Home, Privacy
    │   └── components/    # InteractiveDemo, TechDemo
    ├── api/               # Vercel serverless (waitlist)
    └── public/            # Static assets
```

## Data Sources
- **Filler data** — [AnimeFillerList.com](https://www.animefillerlist.com)
- **Anime scores & info** — [MyAnimeList](https://myanimelist.net) via [Jikan API](https://jikan.moe)

## Privacy
No personal data is collected, stored, or transmitted. All caching is local (`chrome.storage.local`). See the full [Privacy Policy](https://animefillerchecker.com/privacy).

## Contributing
Contributions are welcome! Feel free to open an issue or submit a PR.

## License
This project is open source.

---

<p align="center">
  Built by <a href="https://nehirakbas.com">Nehir Akbaş</a>
</p>
