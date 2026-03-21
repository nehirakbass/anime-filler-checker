/**
 * Anime Filler Checker — Background Service Worker v2
 * 
 * IMPORTANT: Service workers have NO DOM APIs.
 * All HTML parsing is done via regex — no DOMParser!
 */

const CACHE_KEY = "afl_cache";
const CACHE_TTL = 1000 * 60 * 60 * 24 * 14; // 14 days — filler status never changes
const MAL_CACHE_TTL = 1000 * 60 * 60 * 24 * 5; // 5 days — scores change slowly

/* ═══════════════════════════════════════════════════════════════
 *  SLUG BUILDER
 * ═══════════════════════════════════════════════════════════════ */
function buildSlug(animeName) {
  return animeName
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ═══════════════════════════════════════════════════════════════
 *  FETCH + PARSE (regex only — no DOMParser!)
 * ═══════════════════════════════════════════════════════════════ */
async function fetchFillerData(animeName) {
  const slug = buildSlug(animeName);
  const url = `https://www.animefillerlist.com/shows/${slug}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const html = await res.text();
      const data = parseWithRegex(html, url);
      if (data && data.totalEpisodes > 0) return data;
    }
  } catch (e) {
    // direct slug failed, try search
  }

  // Fallback: search the show index
  return await searchAndFetch(animeName);
}

/**
 * Parse the animefillerlist show page using REGEX only.
 * The episode table has rows like:
 *   <tr class="manga_canon">
 *     <td class="Number">1</td>
 *     <td class="Title"><a href="...">Episode Title</a></td>
 *     <td class="Type">Manga Canon</td>
 *   </tr>
 */
function parseWithRegex(html, url) {
  const episodes = {};

  // Extract show title: <h1 class="Title">One Piece</h1> or just <h1>...</h1>
  const titleMatch = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  const showTitle = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
    : "Unknown";

  // Find all table rows with episode data
  // Pattern: <tr class="ROWCLASS"> ... <td>NUM</td> ... <td>TITLE</td> ... <td>TYPE</td> ... </tr>
  const rowRegex = /<tr[^>]*class\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowClass = rowMatch[1].toLowerCase();
    const rowContent = rowMatch[2];

    // Extract all <td> contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      // Strip HTML tags from cell content
      const cellText = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(cellText);
    }

    if (cells.length < 2) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    const title = cells[1] || "";
    const typeText = (cells[2] || "").toLowerCase();

    // Determine episode type from row class or type column
    let type = "unknown";
    if (rowClass.includes("manga_canon") || rowClass.includes("manga-canon")) {
      type = "canon";
    } else if (rowClass.includes("mixed_canon") || rowClass.includes("mixed-canon") || rowClass.includes("mixed")) {
      type = "mixed";
    } else if (rowClass.includes("filler")) {
      type = "filler";
    } else if (rowClass.includes("anime_canon") || rowClass.includes("anime-canon")) {
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

/* ═══════════════════════════════════════════════════════════════
 *  SEARCH FALLBACK — scrape the /shows index page
 * ═══════════════════════════════════════════════════════════════ */
async function searchAndFetch(animeName) {
  const res = await fetch("https://www.animefillerlist.com/shows");
  if (!res.ok) throw new Error("Could not reach AnimeFillerList");

  const html = await res.text();
  const nameNorm = animeName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Find all links to /shows/SLUG
  const linkRegex = /<a\s+href=["'](\/shows\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
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

/* ═══════════════════════════════════════════════════════════════
 *  STRING SIMILARITY (Dice coefficient)
 * ═══════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════
 *  CACHE
 * ═══════════════════════════════════════════════════════════════ */
async function getCached(slug) {
  try {
    const data = await chrome.storage.local.get(CACHE_KEY);
    const cache = data[CACHE_KEY] || {};
    const entry = cache[slug];
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  } catch {}
  return null;
}

async function setCache(slug, data) {
  try {
    const stored = await chrome.storage.local.get(CACHE_KEY);
    const cache = stored[CACHE_KEY] || {};

    // Evict expired entries to prevent unbounded growth
    const now = Date.now();
    for (const key of Object.keys(cache)) {
      if (now - (cache[key].ts || 0) > CACHE_TTL) delete cache[key];
    }

    cache[slug] = { data, ts: now };
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
 *  JIKAN (MAL) API — Fetch anime score
 * ═══════════════════════════════════════════════════════════════ */
const MAL_CACHE_KEY = "mal_cache";

async function fetchMALScore(animeName) {
  // Clean common suffixes from AnimeFillerList titles
  const cleanName = animeName
    .replace(/\s*(Filler List|Episode List|Filler Guide)\s*$/i, "")
    .trim();
  const cacheKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Check cache first
  try {
    const stored = await chrome.storage.local.get(MAL_CACHE_KEY);
    const cache = stored[MAL_CACHE_KEY] || {};
    const entry = cache[cacheKey];
    if (entry && Date.now() - entry.ts < MAL_CACHE_TTL) return entry.data;
  } catch {}

  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanName)}&type=tv&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const anime = json.data?.[0];
    if (!anime) return null;

    const result = {
      score: anime.score,
      scored_by: anime.scored_by,
      members: anime.members,
      status: anime.status,
      episodes: anime.episodes,
      image: anime.images?.jpg?.small_image_url || null,
      mal_url: anime.url,
    };

    // Cache it
    try {
      const stored = await chrome.storage.local.get(MAL_CACHE_KEY);
      const cache = stored[MAL_CACHE_KEY] || {};
      const now = Date.now();
      for (const key of Object.keys(cache)) {
        if (now - (cache[key].ts || 0) > MAL_CACHE_TTL) delete cache[key];
      }
      cache[cacheKey] = { data: result, ts: now };
      await chrome.storage.local.set({ [MAL_CACHE_KEY]: cache });
    } catch {}

    return result;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
 *  MESSAGE HANDLER
 * ═══════════════════════════════════════════════════════════════ */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "CHECK_FILLER") {
    const { animeName, episode } = msg;
    const slug = buildSlug(animeName);

    (async () => {
      try {
        let data = await getCached(slug);
        if (!data) {
          data = await fetchFillerData(animeName);
          if (data && data.totalEpisodes > 0) {
            await setCache(slug, data);
          }
        }

        // Fetch MAL score in parallel (don't block filler result)
        let mal = null;
        try {
          mal = await fetchMALScore(data.showTitle || animeName);
        } catch {}

        const ep = data.episodes[episode];
        
        // Find next canon episode for auto-skip
        let nextCanonEp = null;
        if (ep) {
          const skipTypes = ["filler", "mixed"];
          const maxEp = Math.max(...Object.keys(data.episodes).map(Number));
          for (let n = episode + 1; n <= Math.min(episode + 50, maxEp); n++) {
            const candidate = data.episodes[n];
            if (!candidate) continue; // gap in numbering — keep looking
            if (!skipTypes.includes(candidate.type)) {
              nextCanonEp = { number: n, title: candidate.title, type: candidate.type };
              break;
            }
          }
        }

        sendResponse({
          success: true,
          showTitle: data.showTitle,
          url: data.url,
          totalEpisodes: data.totalEpisodes,
          episode: ep || null,
          queriedEpisode: episode,
          nextCanonEp,
          mal,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // async
  }
});
