/**
 * Shared Stremio addon builder.
 *
 * NOTE: CommonJS required — stremio-addon-sdk doesn't support ESM.
 * NOTE: No node-fetch import — Vercel serverless (Node 18+) has native fetch.
 */

const { addonBuilder } = require("stremio-addon-sdk");
const {
  fetchFillerData,
} = require("./fillerData");
const { generateSubtitle, SHORT_LABELS } = require("./subtitles");
const { kvGet, kvSet } = require("./kvCache");

/* ═══════════════════════════════════════════════════
 *  ADDON MANIFEST
 * ═══════════════════════════════════════════════════ */
const manifest = {
  id: "community.animefiller",
  version: "1.2.1",
  name: "Anime Filler Checker",
  description:
    "Detects filler, canon, mixed, and anime-canon episodes for anime series. " +
    "Shows filler status in the stream list so you know before you hit play. " +
    "Visit animefillerchecker.com for more info and gain access to browser extensions.",
  logo: "https://animefillerchecker.com/icon128.png",
  resources: ["subtitles", "stream"],
  types: ["series"],
  catalogs: [],
  idPrefixes: ["tt", "kitsu:"],
  config: [
    { key: "showCanon", type: "checkbox", title: "✅ CANON — Manga faithful, safe to watch", default: "checked" },
    { key: "showFiller", type: "checkbox", title: "⛔ FILLER — Not from the manga, safe to skip", default: "checked" },
    { key: "showMixed", type: "checkbox", title: "⚠️ MIXED — Contains both canon and filler", default: "checked" },
    { key: "showAnimeCanon", type: "checkbox", title: "🔵 ANIME CANON — Anime-original but plot-relevant", default: "checked" },
    { key: "hideNextTitle", type: "checkbox", title: "🔒 Hide spoilers — Only show episode number in next canon hint" },
    { key: "shortDescription", type: "checkbox", title: "📝 Short Description — Show only CANON / FILLER status, no extra text" },
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: false,
  },
  homepage: "https://animefillerchecker.com",
  ...(process.env.STREMIO_ADDONS_SIGNATURE && {
    stremioAddonsConfig: {
      issuer: "https://stremio-addons.net",
      signature: process.env.STREMIO_ADDONS_SIGNATURE,
    },
  }),
};

const builder = new addonBuilder(manifest);

/* ═══════════════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════
 *  MAINTENANCE MODE — set to false to re-enable
 * ═══════════════════════════════════════════════════ */
const MAINTENANCE_MODE = true;

const CONFIG_TYPE_MAP = {
  canon: "showCanon",
  filler: "showFiller",
  mixed: "showMixed",
  anime_canon: "showAnimeCanon",
};

function shouldShowVerdict(config, type) {
  const key = CONFIG_TYPE_MAP[type];
  if (!key) return true;
  if (!config || !(key in config)) return true;
  return !!config[key];
}

const TYPE_EMOJI = {
  canon: "✅",
  filler: "⛔",
  mixed: "⚠️",
  anime_canon: "🔵",
  unknown: "❓",
};

// Cache TTLs
const KITSU_NAME_CACHE_TTL      = 1000 * 60 * 60 * 24 * 7; // 7 days
const CINEMETA_NAME_CACHE_TTL   = 1000 * 60 * 60 * 24 * 7; // 7 days
const ABSOLUTE_EP_CACHE_TTL     = 1000 * 60 * 60 * 24 * 7; // 7 days

// Cache for Kitsu anime names
const kitsuNameCache = new Map();
// Cache for Cinemeta series name lookups (IMDB IDs)
const cinemetaNameCache = new Map();

/* ═══════════════════════════════════════════════════
 *  CACHE STATS — visible in Vercel Function Logs
 * ═══════════════════════════════════════════════════ */
const cacheStats = { hits: 0, misses: 0 };

function cacheHit(label) {
  cacheStats.hits++;
  if (process.env.AFC_CACHE_DEBUG === "1")
    console.log(`[CACHE HIT]  ${label} (hits=${cacheStats.hits} misses=${cacheStats.misses})`);
}

function cacheMiss(label) {
  cacheStats.misses++;
  console.log(`[CACHE MISS] ${label} (hits=${cacheStats.hits} misses=${cacheStats.misses})`);
}

async function resolveAnimeNameFromKitsu(kitsuId) {
  const cached = kitsuNameCache.get(kitsuId);
  if (cached && Date.now() - cached.ts < KITSU_NAME_CACHE_TTL) {
    cacheHit(`kitsu:${kitsuId}`);
    return cached.name;
  }
  // KV layer
  const kvKey = `afc:name:kitsu:${kitsuId}`;
  const kvName = await kvGet(kvKey);
  if (kvName) {
    cacheHit(`kv:kitsu:${kitsuId}`);
    kitsuNameCache.set(kitsuId, { name: kvName, ts: Date.now() });
    return kvName;
  }
  cacheMiss(`kitsu:${kitsuId}`);
  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime/${kitsuId}`);
    if (res.ok) {
      const json = await res.json();
      const name =
        json.data?.attributes?.canonicalTitle ||
        json.data?.attributes?.titles?.en_jp ||
        null;
      if (name) {
        kitsuNameCache.set(kitsuId, { name, ts: Date.now() });
        await kvSet(kvKey, name, 60 * 60 * 24 * 7);
      }
      return name;
    }
  } catch {}
  return null;
}

async function resolveAnimeName(id) {
  // Kitsu ID: "kitsu:12345"
  if (id.startsWith("kitsu:")) {
    return resolveAnimeNameFromKitsu(id.slice("kitsu:".length));
  }
  // Resolve IMDB ID via Cinemeta (Stremio's default catalog)
  const cachedName = cinemetaNameCache.get(id);
  if (cachedName && Date.now() - cachedName.ts < CINEMETA_NAME_CACHE_TTL) {
    cacheHit(`cinemeta:${id}`);
    return cachedName.name;
  }
  // KV layer
  const safeId = id.replace(/[^a-z0-9]/gi, "_");
  const kvKey = `afc:name:cinemeta:${safeId}`;
  const kvName = await kvGet(kvKey);
  if (kvName) {
    cacheHit(`kv:cinemeta:${id}`);
    cinemetaNameCache.set(id, { name: kvName, ts: Date.now() });
    return kvName;
  }
  cacheMiss(`cinemeta:${id}`);
  try {
    const res = await fetch(
      `https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(id)}.json`
    );
    if (res.ok) {
      const json = await res.json();
      const name = json.meta?.name || null;
      if (name) {
        cinemetaNameCache.set(id, { name, ts: Date.now() });
        await kvSet(kvKey, name, 60 * 60 * 24 * 7);
      }
      return name;
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
 * "kitsu:12345:1" -> "kitsu:12345"
 */
function getSeriesId(videoId) {
  if (videoId.startsWith("kitsu:")) {
    const parts = videoId.split(":");
    return `${parts[0]}:${parts[1]}`;
  }
  return videoId.split(":")[0];
}

// Cache for Cinemeta video lists (maps season:ep to absolute ep number)
const absoluteEpCache = new Map();

/**
 * Resolve season:episode to absolute episode number using Cinemeta.
 * Cinemeta returns all videos sorted by season/episode; we count the position.
 */
async function resolveAbsoluteEpisode(seriesId, season, episode) {
  // Kitsu uses absolute episode numbers directly
  if (seriesId.startsWith("kitsu:")) return episode;

  const cacheKey = seriesId;
  const cachedEntry = absoluteEpCache.get(cacheKey);
  let mapping =
    cachedEntry && Date.now() - cachedEntry.ts < ABSOLUTE_EP_CACHE_TTL
      ? cachedEntry.mapping
      : null;

  if (!mapping) {
    // KV layer — stored as plain object, restore to Map
    const safeId = seriesId.replace(/[^a-z0-9]/gi, "_");
    const kvKey = `afc:abep:${safeId}`;
    const kvObj = await kvGet(kvKey);
    if (kvObj && typeof kvObj === "object") {
      mapping = new Map(Object.entries(kvObj));
      absoluteEpCache.set(cacheKey, { mapping, ts: Date.now() });
    }
  }

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

      absoluteEpCache.set(cacheKey, { mapping, ts: Date.now() });
      // Persist to KV as plain object
      const safeId = seriesId.replace(/[^a-z0-9]/gi, "_");
      await kvSet(`afc:abep:${safeId}`, Object.fromEntries(mapping), 60 * 60 * 24 * 7);
    } catch {
      return episode; // fallback
    }
  }

  return mapping.get(`${season}:${episode}`) || episode;
}

/* ═══════════════════════════════════════════════════
 *  SUBTITLES HANDLER
 * ═══════════════════════════════════════════════════ */
builder.defineSubtitlesHandler(async ({ type, id, config }) => {
  if (MAINTENANCE_MODE) return { subtitles: [] };
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

    if (!shouldShowVerdict(config, episode.type)) return { subtitles: [] };

    let nextCanon = null;
    if (episode.type === "filler" || episode.type === "mixed") {
      for (let n = epNum + 1; n <= epNum + 50; n++) {
        const candidate = fillerData.episodes[n];
        if (!candidate) break;
        if (candidate.type !== "filler") {
          nextCanon = candidate;
          break;
        }
      }
    }

    const srtContent = generateSubtitle(episode, { nextCanon, hideNextTitle: !!config?.hideNextTitle, shortDescription: !!config?.shortDescription });
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

builder.defineStreamHandler(async ({ type, id, config }) => {
  if (MAINTENANCE_MODE) return {
    streams: [{
      name: "🚧 MAINTENANCE",
      description: "Anime Filler Checker is temporarily under maintenance.\nPlease check back soon — animefillerchecker.com",
      externalUrl: "https://animefillerchecker.com",
    }],
  };
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

    if (!shouldShowVerdict(config, episode.type)) return { streams: [] };

    const label = STREAM_LABELS[episode.type] || STREAM_LABELS.unknown;
    const emoji = TYPE_EMOJI[episode.type] || "❓";
    const shortLabel = SHORT_LABELS[episode.type] || "UNKNOWN";

    let description = config?.shortDescription ? `${emoji} ${shortLabel}` : label;

    if (episode.type === "filler" || episode.type === "mixed") {
      for (let n = epNum + 1; n <= epNum + 50; n++) {
        const candidate = fillerData.episodes[n];
        if (!candidate) break;
        if (candidate.type !== "filler") {
          const nextLabel = config?.hideNextTitle
            ? `Episode ${candidate.number}`
            : (candidate.title || `Episode ${candidate.number}`);
          description += `\n▶ Next canon: ${nextLabel}`;
          break;
        }
      }
    }

    return {
      streams: [
        {
          name: `${emoji} ${shortLabel}`,
          description,
          externalUrl: `stremio:///detail/series/${seriesId}`,
        },
      ],
    };
  } catch (err) {
    console.error(`[STREAM] Error for ${id}:`, err.message);
    return { streams: [] };
  }
});

module.exports = builder;
module.exports.MAINTENANCE_MODE = MAINTENANCE_MODE;
