#!/usr/bin/env node
/**
 * Scrape ALL anime from AnimeFillerList.com into two JSON bundles:
 *
 *   1. completedAnime.json — Full episode data for FINISHED anime.
 *      Lookup here first → instant response, zero API calls.
 *
 *   2. showList.json — Lightweight slug+title list of ALL AFL anime.
 *      Used as whitelist → if not here, reject immediately (not anime).
 *
 * Airing status is resolved via Jikan API (MAL).
 *
 * Run:   node scripts/scrape-all-shows.js
 * Cron:  weekly via GitHub Actions
 */

const fs = require("fs");
const path = require("path");

const SHOWS_URL = "https://www.animefillerlist.com/shows";
const LIB_DIR = path.join(__dirname, "../api/stremio/lib");
const COMPLETED_PATH = path.join(LIB_DIR, "completedAnime.json");
const SHOWLIST_PATH = path.join(LIB_DIR, "showList.json");
const IMDBIDS_PATH = path.join(LIB_DIR, "imdbIds.json");
const AFL_DELAY = 600; // ms between AFL requests
const JIKAN_DELAY = 500; // ms between Jikan requests (~2/sec, safe margin)

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── AFL parsing ──────────────────────────────────── */

function extractShowLinks(html) {
  const links = [];
  const seen = new Set();
  const regex = /<a\s+href=["'](\/shows\/([^"']+))["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const slug = decodeURIComponent(m[2]);
    const title = m[3].replace(/<[^>]+>/g, "").trim();
    if (slug.includes("/") || slug === "latest-updates" || !title || seen.has(slug))
      continue;
    seen.add(slug);
    links.push({ slug, title });
  }
  return links;
}

function parseEpisodes(html) {
  const episodes = [];
  const rowRegex = /<tr[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rc = match[1].toLowerCase();
    const rowContent = match[2];

    let type = null;
    if (rc.includes("manga_canon") || rc.includes("manga-canon")) type = "canon";
    else if (rc.includes("mixed_canon") || rc.includes("mixed-canon") || rc.includes("mixed"))
      type = "mixed";
    else if (rc.includes("filler")) type = "filler";
    else if (rc.includes("anime_canon") || rc.includes("anime-canon")) type = "anime_canon";
    else continue;

    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = cellRe.exec(rowContent)) !== null)
      cells.push(cm[1].replace(/<[^>]+>/g, "").trim());
    if (cells.length < 2) continue;
    const num = parseInt(cells[0], 10);
    if (isNaN(num) || num <= 0) continue;
    episodes.push({ number: num, title: cells[1] || "", type });
  }
  return episodes.sort((a, b) => a.number - b.number);
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
}

/* ── Jikan airing status + IMDB ID ───────────────── */

/**
 * Fetch from Jikan with retry on 429.
 */
async function jikanFetch(url, timeoutMs = 8000, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 429) {
      const waitMs = 2000 * (attempt + 1);
      console.error(`  [Jikan 429] rate limited, waiting ${waitMs}ms...`);
      await delay(waitMs);
      continue;
    }
    return res;
  }
  throw new Error(`Jikan rate limited after ${retries} retries: ${url}`);
}

/**
 * Returns { isFinished: bool|null, imdbId: string|null }
 */
async function checkJikanData(animeName) {
  const cleanName = animeName
    .replace(/\s*(Filler List|Episode List|Filler Guide)\s*$/i, "")
    .trim();
  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanName)}&limit=1`;
    const res = await jikanFetch(url);
    if (!res.ok) {
      console.error(`  [Jikan ${res.status}] ${url}`);
      return { isFinished: null, imdbId: null };
    }
    const json = await res.json();
    const anime = json.data?.[0];
    if (!anime) return { isFinished: null, imdbId: null };

    const isFinished = anime.status === "Finished Airing" ? true
      : anime.status === "Currently Airing" ? false
      : null;

    // Fetch external links to get IMDB ID
    let imdbId = null;
    try {
      await delay(JIKAN_DELAY);
      const extRes = await jikanFetch(
        `https://api.jikan.moe/v4/anime/${anime.mal_id}/external`,
        6000
      );
      if (extRes.ok) {
        const extJson = await extRes.json();
        const imdbEntry = (extJson.data || []).find(
          (e) => e.name === "Internet Movie Database"
        );
        if (imdbEntry?.url) {
          const m = imdbEntry.url.match(/\/(tt\d+)/);
          if (m) imdbId = m[1];
        }
      } else {
        console.error(`  [Jikan ext ${extRes.status}] mal_id=${anime.mal_id}`);
      }
    } catch (e) {
      console.error(`  [Jikan ext error] ${e.message}`);
    }

    return { isFinished, imdbId };
  } catch (e) {
    console.error(`  [Jikan error] ${animeName}: ${e.message}`);
    return { isFinished: null, imdbId: null };
  }
}

/* ── Main ─────────────────────────────────────────── */

async function main() {
  if (!fs.existsSync(LIB_DIR)) fs.mkdirSync(LIB_DIR, { recursive: true });

  // 1. Fetch AFL show index
  console.log("Fetching show index from AnimeFillerList...");
  const indexRes = await fetch(SHOWS_URL);
  if (!indexRes.ok) {
    console.error("Failed to fetch shows index:", indexRes.status);
    process.exit(1);
  }
  const shows = extractShowLinks(await indexRes.text());
  console.log(`Found ${shows.length} shows.\n`);

  // 2. Scrape each show
  const allShows = []; // for showList.json
  const scrapedShows = []; // shows with episode data
  let scraped = 0, failed = 0, empty = 0;

  for (let i = 0; i < shows.length; i++) {
    const { slug, title } = shows[i];
    process.stdout.write(`[${i + 1}/${shows.length}] ${slug} ... `);

    try {
      const res = await fetch(
        `https://www.animefillerlist.com/shows/${encodeURIComponent(slug)}`
      );
      if (!res.ok) {
        console.log(`SKIP (${res.status})`);
        allShows.push({ slug, title });
        failed++;
        await delay(AFL_DELAY);
        continue;
      }
      const html = await res.text();
      const episodes = parseEpisodes(html);
      const showTitle = extractTitle(html) || title;

      allShows.push({ slug, title: showTitle });

      if (episodes.length === 0) {
        console.log("EMPTY");
        empty++;
        await delay(AFL_DELAY);
        continue;
      }

      scrapedShows.push({ slug, title: showTitle, episodes });
      const fc = episodes.filter((e) => e.type === "filler").length;
      console.log(`✓ ${episodes.length} eps (${fc} filler)`);
      scraped++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      allShows.push({ slug, title });
      failed++;
    }
    await delay(AFL_DELAY);
  }

  console.log(`\nScraping done: ${scraped} scraped, ${failed} failed, ${empty} empty.`);

  // 3. Check airing status via Jikan for scraped shows + collect IMDB IDs
  console.log(`\nChecking airing status via Jikan for ${scrapedShows.length} shows...`);
  const completedBundle = {};
  const imdbIds = {}; // { "tt1234567": "one-piece" }
  let finished = 0, ongoing = 0, unknown = 0;

  for (let i = 0; i < scrapedShows.length; i++) {
    const show = scrapedShows[i];
    process.stdout.write(
      `[${i + 1}/${scrapedShows.length}] ${show.slug} ... `
    );

    const { isFinished, imdbId } = await checkJikanData(show.title);

    if (imdbId) {
      imdbIds[imdbId] = show.slug;
    }

    if (isFinished === true) {
      completedBundle[show.slug] = {
        title: show.title,
        totalEpisodes: show.episodes.length,
        fillerCount: show.episodes.filter((e) => e.type === "filler").length,
        episodes: show.episodes,
      };
      console.log(`FINISHED ✓${imdbId ? " " + imdbId : ""}`);
      finished++;
    } else if (isFinished === false) {
      console.log(`ONGOING →${imdbId ? " " + imdbId : ""}`);
      ongoing++;
    } else {
      // null = Jikan couldn't resolve → include as completed to be safe
      completedBundle[show.slug] = {
        title: show.title,
        totalEpisodes: show.episodes.length,
        fillerCount: show.episodes.filter((e) => e.type === "filler").length,
        episodes: show.episodes,
      };
      console.log(`UNKNOWN (included) ?${imdbId ? " " + imdbId : ""}`);
      unknown++;
    }
    await delay(JIKAN_DELAY);
  }

  // 4. Build name lookup for completed bundle
  const nameLookup = {};
  for (const [slug, data] of Object.entries(completedBundle)) {
    const norm = data.title
      .toLowerCase()
      .replace(/\s*\([\s\S]*?\)\s*/g, "")
      .replace(/\s*(filler list|episode list|filler guide)\s*$/i, "")
      .replace(/[^a-z0-9]/g, "");
    nameLookup[norm] = slug;
  }
  completedBundle.__nameLookup = nameLookup;
  completedBundle.__meta = {
    scrapedAt: new Date().toISOString(),
    totalShows: finished + unknown,
    finished,
    unknown,
  };

  // 5. Build show list (lightweight whitelist)
  const showListNameLookup = {};
  for (const s of allShows) {
    const norm = s.title
      .toLowerCase()
      .replace(/\s*\([\s\S]*?\)\s*/g, "")
      .replace(/\s*(filler list|episode list|filler guide)\s*$/i, "")
      .replace(/[^a-z0-9]/g, "");
    showListNameLookup[norm] = s.slug;
  }
  const showList = {
    shows: allShows,
    __nameLookup: showListNameLookup,
    __meta: {
      scrapedAt: new Date().toISOString(),
      totalShows: allShows.length,
    },
  };

  // 6. Write files
  fs.writeFileSync(COMPLETED_PATH, JSON.stringify(completedBundle));
  fs.writeFileSync(SHOWLIST_PATH, JSON.stringify(showList));
  fs.writeFileSync(IMDBIDS_PATH, JSON.stringify(imdbIds));

  const completedMB = (fs.statSync(COMPLETED_PATH).size / 1024 / 1024).toFixed(2);
  const showListKB = (fs.statSync(SHOWLIST_PATH).size / 1024).toFixed(1);
  const imdbIdsKB = (fs.statSync(IMDBIDS_PATH).size / 1024).toFixed(1);

  console.log(`\n${"═".repeat(50)}`);
  console.log(`completedAnime.json : ${finished + unknown} shows (${completedMB} MB)`);
  console.log(`  → Finished: ${finished}, Unknown (included): ${unknown}`);
  console.log(`showList.json       : ${allShows.length} shows (${showListKB} KB)`);
  console.log(`  → Ongoing: ${ongoing}`);
  console.log(`imdbIds.json        : ${Object.keys(imdbIds).length} IMDB IDs (${imdbIdsKB} KB)`);
  console.log(`${"═".repeat(50)}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
