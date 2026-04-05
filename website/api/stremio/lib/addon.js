/**
 * Shared Stremio addon builder.
 *
 * NOTE: CommonJS required — stremio-addon-sdk doesn't support ESM.
 * NOTE: No node-fetch import — Vercel serverless (Node 18+) has native fetch.
 */

const { addonBuilder } = require("stremio-addon-sdk");
const {
  fetchFillerData,
  fetchMALData,
  getFillerStats,
} = require("./fillerData");
const { generateSubtitle, SHORT_LABELS } = require("./subtitles");
const { getBadgeDataURI } = require("./badges");

/* ═══════════════════════════════════════════════════
 *  ADDON MANIFEST
 * ═══════════════════════════════════════════════════ */
const manifest = {
  id: "community.animefiller",
  version: "1.0.0",
  name: "Anime Filler Checker",
  description:
    "Detects filler, canon, mixed, and anime-canon episodes for anime series. " +
    "Shows filler status in the stream list so you know before you hit play. " +
    "Visit https://animefillerchecker.com for more info and gain access to browser extensions.",
  logo: "https://animefillerchecker.com/icon128.png",
  resources: ["meta", "subtitles", "stream"],
  types: ["series"],
  catalogs: [],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: false,
    configurationRequired: false,
  },
  homepage: "https://animefillerchecker.com",
};

const builder = new addonBuilder(manifest);

/* ═══════════════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════════════ */

const TYPE_EMOJI = {
  canon: "✅",
  filler: "⛔",
  mixed: "⚠️",
  anime_canon: "🔵",
  unknown: "❓",
};

async function resolveAnimeName(id) {
  try {
    const res = await fetch(
      `https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(id)}.json`
    );
    if (res.ok) {
      const json = await res.json();
      return json.meta?.name || null;
    }
  } catch {}
  return null;
}

/**
 * Parse episode number from Stremio video ID.
 * Cinemeta format: "tt0388629:3:5" = IMDB:season:episode
 */
function parseEpisodeFromVideoId(videoId) {
  const parts = videoId.split(":");
  if (parts.length >= 3) {
    return {
      season: parseInt(parts[1], 10),
      episode: parseInt(parts[2], 10),
    };
  }
  return null;
}

/**
 * Extract the series base ID from a video ID.
 * "tt0388629:3:5" -> "tt0388629"
 */
function getSeriesId(videoId) {
  return videoId.split(":")[0];
}

// Cache for Cinemeta video lists (maps season:ep to absolute ep number)
const absoluteEpCache = new Map();

/**
 * Resolve season:episode to absolute episode number using Cinemeta.
 * Cinemeta returns all videos sorted by season/episode; we count the position.
 */
async function resolveAbsoluteEpisode(seriesId, season, episode) {
  const cacheKey = seriesId;
  let mapping = absoluteEpCache.get(cacheKey);

  if (!mapping) {
    try {
      const res = await fetch(
        `https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(seriesId)}.json`
      );
      if (!res.ok) return episode; // fallback to relative
      const json = await res.json();
      const videos = json.meta?.videos;
      if (!videos || !videos.length) return episode;

      // Sort by season then episode, assign absolute numbers
      mapping = new Map();
      const sorted = videos
        .filter((v) => v.season && v.season > 0 && v.episode && v.episode > 0)
        .sort((a, b) => a.season - b.season || a.episode - b.episode);

      sorted.forEach((v, i) => {
        mapping.set(`${v.season}:${v.episode}`, i + 1);
      });

      absoluteEpCache.set(cacheKey, mapping);
    } catch {
      return episode; // fallback
    }
  }

  return mapping.get(`${season}:${episode}`) || episode;
}

/* ═══════════════════════════════════════════════════
 *  META HANDLER
 * ═══════════════════════════════════════════════════ */
builder.defineMetaHandler(async ({ type, id }) => {
  if (type !== "series") return { meta: null };

  try {
    const animeName = await resolveAnimeName(id);
    if (!animeName) return { meta: null };

    const fillerData = await fetchFillerData(animeName);
    if (!fillerData || fillerData.totalEpisodes === 0) return { meta: null };

    const stats = getFillerStats(fillerData.episodes);
    const mal = await fetchMALData(fillerData.showTitle || animeName);

    const videos = [];
    const episodeNumbers = Object.keys(fillerData.episodes)
      .map(Number)
      .sort((a, b) => a - b);

    for (const epNum of episodeNumbers) {
      const ep = fillerData.episodes[epNum];
      const emoji = TYPE_EMOJI[ep.type] || "❓";
      const label = SHORT_LABELS[ep.type] || "UNKNOWN";

      videos.push({
        id: `${id}:1:${epNum}`,
        title: `${emoji} ${ep.title || `Episode ${epNum}`}`,
        season: 1,
        episode: epNum,
        overview: `${emoji} ${label} — ${ep.title || `Episode ${epNum}`}`,
        thumbnail: getBadgeDataURI(ep.type, epNum),
        released: new Date(0).toISOString(),
      });
    }

    const descLines = [
      `📊 Filler Stats: ${stats.fillerPercent}% filler (${stats.filler}/${stats.total} episodes)`,
      `✅ Canon: ${stats.canon} | ⛔ Filler: ${stats.filler} | ⚠️ Mixed: ${stats.mixed} | 🔵 Anime Canon: ${stats.anime_canon}`,
    ];

    if (mal) {
      descLines.push(
        `⭐ MAL Score: ${mal.score || "N/A"} | Status: ${mal.status || "Unknown"}`
      );
    }

    const meta = {
      id,
      type: "series",
      name: fillerData.showTitle,
      description: descLines.join("\n"),
      videos,
    };

    if (mal?.image) meta.poster = mal.image;
    if (mal?.genres) meta.genres = mal.genres;
    if (mal?.mal_url) meta.website = mal.mal_url;

    return { meta };
  } catch (err) {
    console.error(`[META] Error for ${id}:`, err.message);
    return { meta: null };
  }
});

/* ═══════════════════════════════════════════════════
 *  SUBTITLES HANDLER
 * ═══════════════════════════════════════════════════ */
builder.defineSubtitlesHandler(async ({ type, id }) => {
  if (type !== "series") return { subtitles: [] };

  try {
    const parsed = parseEpisodeFromVideoId(id);
    if (!parsed) return { subtitles: [] };

    const seriesId = getSeriesId(id);

    const animeName = await resolveAnimeName(seriesId);
    if (!animeName) return { subtitles: [] };

    const epNum = await resolveAbsoluteEpisode(seriesId, parsed.season, parsed.episode);

    const fillerData = await fetchFillerData(animeName);
    if (!fillerData || fillerData.totalEpisodes === 0) {
      return { subtitles: [] };
    }

    const episode = fillerData.episodes[epNum];
    if (!episode) return { subtitles: [] };

    let nextCanon = null;
    if (episode.type === "filler" || episode.type === "mixed") {
      for (let n = epNum + 1; n <= epNum + 50; n++) {
        const candidate = fillerData.episodes[n];
        if (!candidate) break;
        if (candidate.type !== "filler" && candidate.type !== "mixed") {
          nextCanon = candidate;
          break;
        }
      }
    }

    const srtContent = generateSubtitle(episode, { nextCanon });
    const label = SHORT_LABELS[episode.type] || "UNKNOWN";
    const emoji = TYPE_EMOJI[episode.type] || "❓";
    const srtBase64 = Buffer.from(srtContent, "utf-8").toString("base64");

    return {
      subtitles: [
        {
          id: `afc-${seriesId}-s${id.split(":")[1] || 1}-e${epNum}`,
          url: `data:text/srt;base64,${srtBase64}`,
          lang: "Filler Check",
          name: `${emoji} ${label}`,
        },
      ],
    };
  } catch (err) {
    console.error(`[SUBTITLES] Error for ${id}:`, err.message);
    return { subtitles: [] };
  }
});

/* ═══════════════════════════════════════════════════
 *  STREAM HANDLER — Filler status badge in stream list
 * ═══════════════════════════════════════════════════ */

const STREAM_LABELS = {
  canon:      "✅ CANON — Manga faithful, safe to watch",
  filler:     "⛔ FILLER — Not from the manga, safe to skip!",
  mixed:      "⚠️ MIXED — Contains both canon and filler",
  anime_canon:"🔵 ANIME CANON — Anime-original but plot-relevant",
  unknown:    "❓ UNKNOWN — No filler data available",
};

builder.defineStreamHandler(async ({ type, id }) => {
  if (type !== "series") return { streams: [] };

  try {
    const parsed = parseEpisodeFromVideoId(id);
    if (!parsed) return { streams: [] };

    const seriesId = getSeriesId(id);
    const animeName = await resolveAnimeName(seriesId);
    if (!animeName) return { streams: [] };

    const epNum = await resolveAbsoluteEpisode(seriesId, parsed.season, parsed.episode);

    const fillerData = await fetchFillerData(animeName);
    if (!fillerData || fillerData.totalEpisodes === 0) return { streams: [] };

    const episode = fillerData.episodes[epNum];
    if (!episode) return { streams: [] };

    const label = STREAM_LABELS[episode.type] || STREAM_LABELS.unknown;
    const emoji = TYPE_EMOJI[episode.type] || "❓";
    const shortLabel = SHORT_LABELS[episode.type] || "UNKNOWN";

    let description = label;

    // If filler/mixed, show next canon episode
    if (episode.type === "filler" || episode.type === "mixed") {
      for (let n = epNum + 1; n <= epNum + 50; n++) {
        const candidate = fillerData.episodes[n];
        if (!candidate) break;
        if (candidate.type !== "filler" && candidate.type !== "mixed") {
          description += `\n▶ Next canon: ${candidate.title || `Episode ${candidate.number}`}`;
          break;
        }
      }
    }

    return {
      streams: [
        {
          name: `${emoji} ${shortLabel}`,
          description,
          externalUrl: fillerData.url || "https://www.animefillerlist.com",
          behaviorHints: {
            notWebReady: true,
          },
        },
      ],
    };
  } catch (err) {
    console.error(`[STREAM] Error for ${id}:`, err.message);
    return { streams: [] };
  }
});

module.exports = builder;
