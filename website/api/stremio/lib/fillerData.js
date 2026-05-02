/**
 * Anime Filler Checker — Filler data fetching & parsing
 *
 * 3-tier lookup:
 *   1. completedAnime.json — Full episode data for finished anime (instant, 0 API calls)
 *   2. showList.json       — Whitelist of all AFL anime names/slugs
 *   3. AnimeFillerList.com — Live scrape only for ongoing anime in the whitelist
 *
 * Non-anime titles (Chuck, Broadchurch, etc.) are rejected at tier 2.
 *
 * NOTE: This file uses CommonJS because stremio-addon-sdk requires it.
 */

const { kvGet, kvSet } = require("./kvCache");

const CACHE_TTL     = 1000 * 60 * 60 * 24 * 14; // 14 days (ms, for in-memory)
const MAL_CACHE_TTL = 1000 * 60 * 60 * 24 * 5;  // 5 days
const FILLER_KV_TTL = 60 * 60 * 24 * 14;         // 14 days (seconds, for KV)
const MAL_KV_TTL    = 60 * 60 * 24 * 5;          // 5 days

// In-memory caches (per serverless instance)
const fillerCache = new Map();
const malCache = new Map();

function logCacheEvent(type, label) {
  if (type === "miss") console.log(`[CACHE MISS] filler:${label}`);
  else if (process.env.AFC_CACHE_DEBUG === "1")
    console.log(`[CACHE HIT]  filler:${label}`);
}

/* ── Load JSON bundles (bundled at build time) ──── */
let completedAnime, showList;
try {
  completedAnime = require("./completedAnime.json");
} catch {
  completedAnime = {};
}
try {
  showList = require("./showList.json");
} catch {
  showList = { shows: [], __nameLookup: {} };
}

/* ── Helpers ──────────────────────────────────────── */

function buildSlug(animeName) {
  return animeName
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s*\([\s\S]*?\)\s*/g, "")   // strip parenthetical (Japanese titles etc.)
    .replace(/\s*(filler list|episode list|filler guide)\s*$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Look up a name in a bundle's __nameLookup using fuzzy matching.
 * Returns the slug or null.
 */
function lookupBundle(bundle, animeName) {
  if (!bundle || !bundle.__nameLookup) return null;
  const norm = normalizeName(animeName);

  // Exact match first
  if (bundle.__nameLookup[norm]) return bundle.__nameLookup[norm];

  // Fuzzy match
  let bestSlug = null;
  let bestScore = 0;
  for (const [key, slug] of Object.entries(bundle.__nameLookup)) {
    const score = similarity(norm, key);
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  }
  return bestScore >= 0.55 ? bestSlug : null;
}

/**
 * Convert a completed bundle entry into the runtime format used by addon.js.
 */
function bundleToRuntime(entry) {
  const episodes = {};
  for (const ep of entry.episodes) {
    episodes[ep.number] = { number: ep.number, title: ep.title, type: ep.type };
  }
  return {
    showTitle: entry.title,
    episodes,
    totalEpisodes: entry.totalEpisodes,
    source: "bundle",
  };
}

/* ── Main lookup ──────────────────────────────────── */

async function fetchFillerData(animeName) {
  const slug = buildSlug(animeName);

  // 0. In-memory cache (hot path)
  const cached = fillerCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    logCacheEvent("hit", slug);
    return cached.data;
  }

  // 0.5. KV persistent cache (survives cold starts)
  const kvKey = `afc:filler:${slug}`;
  const kvCached = await kvGet(kvKey);
  if (kvCached === "__null__") {
    // Negative cache hit — not an AFL anime
    fillerCache.set(slug, { data: null, ts: Date.now() });
    return null;
  }
  if (kvCached) {
    logCacheEvent("hit", `kv:${slug}`);
    fillerCache.set(slug, { data: kvCached, ts: Date.now() });
    return kvCached;
  }

  logCacheEvent("miss", slug);

  // 1. Completed anime bundle (instant, no API call)
  const completedSlug = completedAnime[slug]
    ? slug
    : lookupBundle(completedAnime, animeName);
  if (completedSlug && completedAnime[completedSlug]) {
    const data = bundleToRuntime(completedAnime[completedSlug]);
    fillerCache.set(slug, { data, ts: Date.now() });
    await kvSet(kvKey, data, FILLER_KV_TTL);
    return data;
  }

  // 2. Show list whitelist check — if not here, it's not on AFL at all
  const showSlug = showList.__nameLookup?.[normalizeName(animeName)]
    || lookupBundle(showList, animeName);
  if (!showSlug) {
    // Not an AFL anime → negative cache for 6h so we never check again
    fillerCache.set(slug, { data: null, ts: Date.now() });
    await kvSet(kvKey, "__null__", 60 * 60 * 6);
    return null;
  }

  // 3. Live scrape for ongoing anime (in whitelist but not completed)
  let data = null;
  try {
    const url = `https://www.animefillerlist.com/shows/${encodeURIComponent(showSlug)}`;
    const res = await fetch(url);
    if (res.ok) {
      const html = await res.text();
      data = parseWithRegex(html, url);
      if (data && data.totalEpisodes > 0) {
        fillerCache.set(slug, { data, ts: Date.now() });
        await kvSet(kvKey, data, FILLER_KV_TTL);
        return data;
      }
    }
  } catch {
    // live scrape failed
  }

  // Fallback: try the generated slug directly
  if (showSlug !== slug) {
    try {
      const url = `https://www.animefillerlist.com/shows/${slug}`;
      const res = await fetch(url);
      if (res.ok) {
        const html = await res.text();
        data = parseWithRegex(html, url);
        if (data && data.totalEpisodes > 0) {
          fillerCache.set(slug, { data, ts: Date.now() });
          await kvSet(kvKey, data, FILLER_KV_TTL);
          return data;
        }
      }
    } catch {}
  }

  return data;
}

function parseWithRegex(html, url) {
  const episodes = {};

  const titleMatch = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  const showTitle = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
    : "Unknown";

  const rowRegex =
    /<tr[^>]*class\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowClass = rowMatch[1].toLowerCase();
    const rowContent = rowMatch[2];

    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    if (cells.length < 2) continue;
    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    const title = cells[1] || "";
    const typeText = (cells[2] || "").toLowerCase();

    let type = "unknown";
    if (rowClass.includes("manga_canon") || rowClass.includes("manga-canon")) {
      type = "canon";
    } else if (
      rowClass.includes("mixed_canon") ||
      rowClass.includes("mixed-canon") ||
      rowClass.includes("mixed")
    ) {
      type = "mixed";
    } else if (rowClass.includes("filler")) {
      type = "filler";
    } else if (
      rowClass.includes("anime_canon") ||
      rowClass.includes("anime-canon")
    ) {
      type = "anime_canon";
    } else if (typeText.includes("manga canon")) {
      type = "canon";
    } else if (typeText.includes("mixed")) {
      type = "mixed";
    } else if (typeText.includes("filler")) {
      type = "filler";
    } else if (typeText.includes("anime canon")) {
      type = "anime_canon";
    } else if (typeText.includes("canon")) {
      type = "canon";
    }

    episodes[num] = { number: num, title, type };
  }

  return {
    showTitle,
    episodes,
    url,
    totalEpisodes: Object.keys(episodes).length,
  };
}

/* searchAndFetch removed — whitelist lookup replaced it */

function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bi = a.substring(i, i + 2);
    bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bi = b.substring(i, i + 2);
    const count = bigrams.get(bi) || 0;
    if (count > 0) {
      bigrams.set(bi, count - 1);
      hits++;
    }
  }
  return (2 * hits) / (a.length + b.length - 2);
}

async function fetchMALData(animeName) {
  const cleanName = animeName
    .replace(/\s*(Filler List|Episode List|Filler Guide)\s*$/i, "")
    .trim();
  const cacheKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

  const cached = malCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < MAL_CACHE_TTL) return cached.data;

  // KV layer
  const malKvKey = `afc:mal:${cacheKey}`;
  const kvResult = await kvGet(malKvKey);
  if (kvResult) {
    malCache.set(cacheKey, { data: kvResult, ts: Date.now() });
    return kvResult;
  }

  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanName)}&type=tv&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const anime = json.data?.[0];
    if (!anime) return null;

    const result = {
      mal_id: anime.mal_id,
      score: anime.score,
      members: anime.members,
      status: anime.status,
      episodes: anime.episodes,
      image: anime.images?.jpg?.large_image_url || null,
      mal_url: anime.url,
      synopsis: anime.synopsis,
      genres: (anime.genres || []).map((g) => g.name),
    };

    malCache.set(cacheKey, { data: result, ts: Date.now() });
    await kvSet(malKvKey, result, MAL_KV_TTL);
    return result;
  } catch {
    return null;
  }
}

function getFillerStats(episodes) {
  const stats = { canon: 0, filler: 0, mixed: 0, anime_canon: 0, unknown: 0 };
  for (const ep of Object.values(episodes)) {
    stats[ep.type] = (stats[ep.type] || 0) + 1;
  }
  const total = Object.keys(episodes).length;
  stats.total = total;
  stats.fillerPercent =
    total > 0 ? Math.round((stats.filler / total) * 100) : 0;
  return stats;
}

module.exports = {
  buildSlug,
  fetchFillerData,
  fetchMALData,
  getFillerStats,
  similarity,
};
