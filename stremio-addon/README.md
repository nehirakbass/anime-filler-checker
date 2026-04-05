# Anime Filler Checker — Stremio Addon

A Stremio addon that detects filler, canon, mixed, and anime-canon episodes for anime series. Never accidentally watch a filler episode again!

## Features

- **Episode Badges** — Each episode in the series view shows its filler status:
  - ✅ **CANON** — Manga faithful, safe to watch
  - ⛔ **FILLER** — Not from the manga, safe to skip
  - ⚠️ **MIXED** — Contains both canon and filler content
  - 🔵 **ANIME CANON** — Anime-original but plot-relevant
- **Filler Statistics** — See what percentage of a show is filler at a glance
- **Subtitle Notifications** — Optional subtitle track that briefly shows the filler badge when an episode starts
- **MAL Integration** — Pulls scores, genres, and metadata from MyAnimeList via Jikan API
- **Smart Caching** — Filler data cached 14 days, MAL data cached 5 days

## Data Sources

| Source | Purpose |
|---|---|
| [AnimeFillerList.com](https://www.animefillerlist.com/) | Episode filler/canon classification |
| [Jikan API](https://jikan.moe/) (MyAnimeList) | Anime metadata, scores, genres |

## Installation

### Install in Stremio (Hosted)
1. Open Stremio → **Settings → Addons**
2. Paste: `https://anime-filler-stremio.vercel.app/manifest.json`
3. Click **Install**

### Local Development

```bash
cd stremio-addon
npm install
npm start
```

Then add `http://localhost:7000/manifest.json` in Stremio's addon settings.

### Deploy to Vercel

The addon is configured for Vercel serverless deployment:

1. Push to GitHub
2. Import the `stremio-addon/` folder as a new Vercel project
3. Set **Root Directory** to `stremio-addon`
4. Deploy — no build command or environment variables needed

The manifest URL will be: `https://your-project.vercel.app/manifest.json`

### Deploy to Railway / Render

Works as a standard Node.js server:

```bash
PORT=7000 npm start
```

## How It Works

1. When you open an anime series in Stremio, the addon receives the series ID (Kitsu or MAL)
2. It resolves the anime name via Kitsu/Jikan API
3. Looks up filler data on AnimeFillerList.com (direct slug match → fuzzy search fallback)
4. Returns enhanced episode metadata with filler badges in titles and descriptions
5. When playing an episode, provides an optional subtitle track showing the filler status

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `7000` | Server port |

## Project Structure

```
stremio-addon/
├── index.js              # Local dev server (node index.js)
├── vercel.json           # Vercel routing config
├── package.json
├── README.md
├── api/
│   └── [...path].js      # Vercel serverless catch-all
└── lib/
    ├── addon.js          # Shared addon builder (manifest + handlers)
    ├── fillerData.js     # AnimeFillerList scraper + Jikan API + caching
    └── subtitles.js      # SRT subtitle generation
```

## License

MIT
