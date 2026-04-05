/**
 * Anime Filler Checker — Filler data fetching & parsing
 *
 * Scrapes AnimeFillerList.com for episode filler/canon status
 * and queries Jikan (MAL) API for metadata.
 *
 * NOTE: This file uses CommonJS because stremio-addon-sdk requires it.
 */

const CACHE_TTL = 1000 * 60 * 60 * 24 * 14; // 14 days
const MAL_CACHE_TTL = 1000 * 60 * 60 * 24 * 5; // 5 days

// In-memory caches (per serverless instance)
const fillerCache = new Map();
const malCache = new Map();

function buildSlug(animeName) {
  return animeName
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchFillerData(animeName) {
  const slug = buildSlug(animeName);

  const cached = fillerCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let data = null;

  try {
    const url = `https://www.animefillerlist.com/shows/${slug}`;
    const res = await fetch(url);
    if (res.ok) {
      const html = await res.text();
      data = parseWithRegex(html, url);
      if (data && data.totalEpisodes > 0) {
        fillerCache.set(slug, { data, ts: Date.now() });
        return data;
      }
    }
  } catch {
    // direct slug failed
  }

  data = await searchAndFetch(animeName);
  if (data && data.totalEpisodes > 0) {
    fillerCache.set(slug, { data, ts: Date.now() });
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

async function searchAndFetch(animeName) {
  const res = await fetch("https://www.animefillerlist.com/shows");
  if (!res.ok) throw new Error("Could not reach AnimeFillerList");

  const html = await res.text();
  const nameNorm = animeName.toLowerCase().replace(/[^a-z0-9]/g, "");

  const linkRegex =
    /<a\s+href=["'](\/shows\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let best = null;
  let bestScore = 0;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    const textNorm = text.toLowerCase().replace(/[^a-z0-9]/g, "");

    const score = similarity(nameNorm, textNorm);
    if (score > bestScore) {
      bestScore = score;
      best = { href, text };
    }
  }

  if (!best || bestScore < 0.35) {
    throw new Error(`"${animeName}" not found on AnimeFillerList`);
  }

  const fullUrl = `https://www.animefillerlist.com${best.href}`;
  const pageRes = await fetch(fullUrl);
  if (!pageRes.ok) throw new Error("Show page not found");

  const pageHtml = await pageRes.text();
  return parseWithRegex(pageHtml, fullUrl);
}

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
