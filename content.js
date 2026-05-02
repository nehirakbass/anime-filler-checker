/**
 * Anime Filler Checker — Content Script v2.3
 * - Safeguards against false positives (UUID, hex, non-anime sites)
 * - Toggle support (enable/disable auto-badge)
 * - Extracts anime name + episode from URL, <title>, and DOM
 * - Auto-injects a floating badge on the page
 */
(() => {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
   *  SAFEGUARDS — prevent false positives
   * ═══════════════════════════════════════════════════════════════ */

  /** Default streaming sites where auto-detect is active */
  const DEFAULT_STREAMING_SITES = [
    "crunchyroll.com",
    "hianime.to",
    "aniwatch.to",
    "zoro.to",
    "aniwave.to",
    "gogoanime.gg",
    "gogoanime3.co",
    "gogoanimehd.to",
    "gogoanime.hu",
    "gogoanime.film",
    "anitaku.pe",
    "anitaku.to",
    "9anime.to",
    "9anime.gs",
    "9anime.pe",
    "animepahe.ru",
    "animepahe.com",
    "animepahe.org",
    "animesuge.to",
    "kaido.to",
    "turkanime.co",
    "turkanime.tv",
    "anizm.net",
    "anizm.tv",
    "animekai.to",
    "animekai.pw",
    "openani.me",
  ];

  /** Check if current site is in the user's streaming sites whitelist */
  async function isStreamingSite() {
    try {
      const data = await chrome.storage.local.get("afc_streaming_sites");
      const sites = data.afc_streaming_sites || DEFAULT_STREAMING_SITES;
      const host = location.hostname.replace(/^www\./, "");
      return sites.some(d => host === d || host.endsWith("." + d));
    } catch {
      return false;
    }
  }

  /** Validate that a detected name looks like a real anime name */
  function isValidAnimeName(name) {
    if (!name || name.length < 2) return false;
    if (name.length > 100) return false;

    // Reject UUIDs
    if (/^[0-9a-f]{8}[-]?[0-9a-f]{4}[-]?[0-9a-f]{4}[-]?[0-9a-f]{4}[-]?[0-9a-f]{12}$/i.test(name.replace(/\s/g, ""))) return false;

    // Reject hex-heavy strings (more than 50% hex-like chars)
    const cleaned = name.replace(/[\s-]/g, "");
    const hexChars = cleaned.replace(/[^0-9a-f]/gi, "");
    if (hexChars.length > 8 && hexChars.length / cleaned.length > 0.5) return false;

    // Reject mostly numbers
    const digits = name.replace(/[^0-9]/g, "");
    const letters = name.replace(/[^a-zA-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF]/g, "");
    if (digits.length > letters.length) return false;

    // Reject too short after cleaning
    if (letters.length < 2) return false;

    // Reject if no vowels (gibberish)
    if (letters.length > 3 && !/[aeıioöuüAEIİOÖUÜ]/i.test(name)) return false;

    // Reject common non-anime URL segments
    const rejectWords = /^(show|watch|video|embed|player|episode|season|page|index|home|login|signup|search|browse|category|genre|settings|profile|account|admin|api|app|static|assets|images|css|js)$/i;
    if (rejectWords.test(name.trim())) return false;

    return true;
  }

  /** Validate episode number is reasonable */
  function isValidEpisode(ep) {
    return ep && Number.isInteger(ep) && ep > 0 && ep < 2000;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ANIME NAME DICTIONARY — maps common slugs to proper names
   * ═══════════════════════════════════════════════════════════════ */
  const KNOWN_ANIME = {
    "one-piece":          "One Piece",
    "onepiece":           "One Piece",
    "naruto":             "Naruto",
    "naruto-shippuden":   "Naruto Shippuden",
    "naruto-shippuuden":  "Naruto Shippuden",
    "bleach":             "Bleach",
    "dragon-ball":        "Dragon Ball",
    "dragon-ball-z":      "Dragon Ball Z",
    "dragon-ball-super":  "Dragon Ball Super",
    "fairy-tail":         "Fairy Tail",
    "boruto":             "Boruto",
    "black-clover":       "Black Clover",
    "gintama":            "Gintama",
    "inuyasha":           "Inuyasha",
    "sailor-moon":        "Sailor Moon",
    "rurouni-kenshin":    "Rurouni Kenshin",
    "yu-yu-hakusho":      "Yu Yu Hakusho",
    "detective-conan":    "Detective Conan",
    "attack-on-titan":    "Attack on Titan",
    "shingeki-no-kyojin": "Attack on Titan",
    "hunter-x-hunter":    "Hunter x Hunter",
    "fullmetal-alchemist":"Fullmetal Alchemist",
    "sword-art-online":   "Sword Art Online",
    "death-note":         "Death Note",
    "cowboy-bebop":       "Cowboy Bebop",
    "soul-eater":         "Soul Eater",
    "pokemon":            "Pokemon",
    "d-gray-man":         "D.Gray-man",
    "reborn":             "Reborn",
    "katekyo-hitman-reborn":"Reborn",
    "ao-no-exorcist":     "Blue Exorcist",
    "blue-exorcist":      "Blue Exorcist",
  };

  /* ═══════════════════════════════════════════════════════════════
   *  URL PARSER — most reliable source for Turkish/intl sites
   * ═══════════════════════════════════════════════════════════════ */
  function extractFromURL() {
    const path = decodeURIComponent(location.pathname).toLowerCase();
    const full = path + " " + decodeURIComponent(location.search).toLowerCase();

    // SAFEGUARD: skip URLs with UUIDs or long hex segments
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(path)) return null;
    if (/\/[0-9a-f]{16,}/.test(path)) return null;

    const patterns = [
      // Turkish: slug-EPISODE-bolum
      /\/([a-z0-9][a-z0-9-]+?)-(\d+)-bol[uü]m/,
      // slug-episode-NUM
      /\/([a-z0-9][a-z0-9-]+?)-(?:episode|ep)-?(\d+)/,
      // /anime/slug/SEASON/EPISODE (e.g. openani.me/anime/bleach/1/4)
      /\/(?:watch|anime|izle|video)\/([a-z0-9][a-z0-9-]+?)\/\d+\/(\d+)/,
      // /watch/slug/episode-NUM  or /watch/slug/NUM
      /\/(?:watch|anime|izle|video)\/([a-z0-9][a-z0-9-]+?)\/(?:episode-?|ep-?)?(\d+)/,
      // /slug/season-N/episode-NUM
      /\/([a-z0-9][a-z0-9-]+?)\/(?:season-?\d+\/)?(?:episode|ep)-?(\d+)/,
    ];

    for (const pat of patterns) {
      const m = full.match(pat) || path.match(pat);
      if (m) {
        const slug = m[1].replace(/[-_]+$/, "");
        const ep = parseInt(m[2], 10);
        // Only match known anime — don't guess unknown slugs via slugToName
        const name = KNOWN_ANIME[slug];
        if (name && isValidEpisode(ep)) {
          return { animeName: name, episode: ep };
        }
      }
    }
    return null;
  }

  /** Convert "one-piece" → "One Piece" */
  function slugToName(slug) {
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  TITLE PARSER — fallback
   * ═══════════════════════════════════════════════════════════════ */
  function extractFromTitle() {
    const raw = document.title
      .replace(/[\|–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    const patterns = [
      /^(.+?)\s*[-:]?\s*(?:Episode|Ep\.?|Bölüm|Bolum)\s*(\d+)/i,
      /^(.+?)\s*[-:]?\s*S\d+\s*E(\d+)/i,
      /^(.+?)\s*[-:]?\s*E(\d+)\s*[-–—:]/i,
      /^(.+?)\s*[-:]?\s*(\d+)\s*\.?\s*(?:Bölüm|Bolum|Episode|Ep)/i,
      /^(.+?)\s+[-:]\s*(\d{1,4})\s*(?:[-:]|$)/,
    ];

    for (const pat of patterns) {
      const m = raw.match(pat);
      if (m) {
        let name = m[1]
          .replace(/[-:]\s*$/, "")
          .replace(/\b(Watch|Online|Free|HD|Sub|Dub|English|Subbed|Dubbed|Anime|İzle|Izle|Türkçe|Altyazılı)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        const ep = parseInt(m[2], 10);
        if (isValidAnimeName(name) && isValidEpisode(ep)) {
          return { animeName: name, episode: ep };
        }
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  JSON-LD PARSER — most reliable (schema.org TVEpisode / TVSeries)
   * ═══════════════════════════════════════════════════════════════ */
  function extractFromJsonLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      let data;
      try { data = JSON.parse(script.textContent); } catch { continue; }

      // Handle @graph arrays (e.g. Next.js sites)
      const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];

      let animeName = "";
      let episode = null;

      for (const node of nodes) {
        const type = (node["@type"] || "").toString().toLowerCase();

        if (type === "tvepisode") {
          // Episode number
          const epNum = node.episodeNumber ?? node["episode"]?.episodeNumber;
          if (epNum != null) episode = parseInt(epNum, 10);

          // Series name from partOfSeries or partOfSeason.partOfSeries
          const series =
            node.partOfSeries?.name ||
            node.partOfSeason?.partOfSeries?.name ||
            node.partOfSeason?.name ||
            null;
          if (series) animeName = series;
        }

        if ((type === "tvseries" || type === "series") && !animeName) {
          if (node.name) animeName = node.name;
        }
      }

      if (animeName && isValidAnimeName(animeName) && isValidEpisode(episode)) {
        return { animeName: animeName.trim(), episode };
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  META TAG PARSER — only explicit video/episode meta tags
   * ═══════════════════════════════════════════════════════════════ */
  function extractFromMeta() {
    // Prefer explicit structured tags over parsing og:title
    const series =
      document.querySelector('meta[property="og:video:series"]')?.content ||
      document.querySelector('meta[name="video:series"]')?.content ||
      document.querySelector('meta[property="video:series"]')?.content ||
      null;

    const epRaw =
      document.querySelector('meta[property="og:video:episode"]')?.content ||
      document.querySelector('meta[name="video:episode"]')?.content ||
      null;

    if (series && epRaw) {
      const ep = parseInt(epRaw, 10);
      if (isValidAnimeName(series) && isValidEpisode(ep)) {
        return { animeName: series.trim(), episode: ep };
      }
    }

    // og:title only if it contains an explicit Episode/Ep/Bölüm keyword
    const ogTitle =
      document.querySelector('meta[property="og:title"]')?.content || "";
    if (ogTitle) {
      const m = ogTitle
        .replace(/[\|–—]/g, "-")
        .replace(/\s+/g, " ")
        .match(/^(.+?)\s*[-:]\s*(?:Episode|Ep\.?|Bölüm|Bolum)\s*(\d+)/i);
      if (m) {
        const name = m[1]
          .replace(/\b(Watch|Online|Free|HD|Sub|Dub|Anime|İzle|Izle)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        const ep = parseInt(m[2], 10);
        if (isValidAnimeName(name) && isValidEpisode(ep)) {
          return { animeName: name, episode: ep };
        }
      }
    }

    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  DOM EXTRACTORS — site-specific
   * ═══════════════════════════════════════════════════════════════ */
  const siteExtractors = {
    "crunchyroll.com": () => {
      // Series name: try multiple selectors (Crunchyroll updates layout frequently)
      const seriesSelectors = [
        'a.show-title-link',
        '[data-testid="series-title"]',
        '.current-media-parent-ref',
        'h4 a[href*="/series/"]',
        '.hero-heading-line a',
      ];
      let series = "";
      for (const sel of seriesSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const txt = el.textContent.trim();
          if (txt && txt.length > 1 && txt.length < 100) { series = txt; break; }
        }
      }

      // Try a[href*="/series/"] but only get the FIRST text-containing one
      if (!series) {
        const seriesLinks = document.querySelectorAll('a[href*="/series/"]');
        for (const el of seriesLinks) {
          const txt = el.textContent.trim();
          if (txt && txt.length > 1 && txt.length < 100 && !/episode|watch|season/i.test(txt)) {
            series = txt;
            break;
          }
        }
      }

      // Fallback: parse document.title — usually "SERIES_NAME ENUM - Episode Title - Watch on Crunchyroll"
      if (!series) {
        const dt = document.title;
        const dtSeriesMatch = dt.match(/^(.+?)\s+E\d+\s*[-–—]/i);
        if (dtSeriesMatch) {
          series = dtSeriesMatch[1].replace(/^Watch\s+/i, "").trim();
        }
      }

      // Episode number from DOM
      const titleSelectors = [
        'h1.hero-heading-line',
        '[data-testid="episode-title"]',
        '.erc-current-media-info h1',
        'h1[class*="title"]',
        'h1',
      ];
      let title = "";
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const txt = el.textContent.trim();
          if (txt && /(?:E|EP|Episode)\s*\d+/i.test(txt)) { title = txt; break; }
        }
      }

      // Also try meta tags
      if (!title) {
        const meta = document.querySelector('meta[property="og:title"], meta[name="title"]');
        if (meta) title = meta.content || "";
      }

      // Also try document.title for episode number
      if (!title) title = document.title;

      const epMatch = title.match(/(?:E|EP|Episode)\s*(\d+)/i);
      if (series && epMatch) return { animeName: series, episode: parseInt(epMatch[1], 10) };

      return null;
    },

    /* — HiAnime / Zoro / AniWatch family — */
    "hianime.to": zoroExtract,
    "aniwatch.to": zoroExtract,
    "zoro.to":     zoroExtract,
    "kaido.to":    zoroExtract,
    "animesuge.to": zoroExtract,

    /* — AniWave / 9anime family — */
    "aniwave.to": aniwaveExtract,
    "9anime.to":  aniwaveExtract,
    "9anime.gs":  aniwaveExtract,
    "9anime.pe":  aniwaveExtract,

    /* — GoGoAnime family — */
    "gogoanime.gg":   gogoanimeExtract,
    "gogoanime3.co":  gogoanimeExtract,
    "gogoanimehd.to": gogoanimeExtract,
    "gogoanime.hu":   gogoanimeExtract,
    "anitaku.pe":     gogoanimeExtract,
    "anitaku.to":     gogoanimeExtract,
    "gogoanime.film": gogoanimeExtract,

    /* — AnimePahe — */
    "animepahe.ru":  animepaheExtract,
    "animepahe.com": animepaheExtract,
    "animepahe.org": animepaheExtract,

    /* — Turkish sites — */
    "turkanime.co":  turkanimeExtract,
    "turkanime.tv":  turkanimeExtract,
    "anizm.net":     anizmExtract,
    "anizm.tv":      anizmExtract,

    /* — AnimeKai — */
    "animekai.to":   animekaiExtract,
    "animekai.pw":   animekaiExtract,

    /* — OpenAni.me — URL format: /anime/slug/season/episode */
    "openani.me": () => {
      const m = location.pathname.match(/\/anime\/([a-z0-9][a-z0-9-]+?)\/(\d+)\/(\d+)/i);
      if (m) {
        const slug = m[1].toLowerCase();
        const ep   = parseInt(m[3], 10); // m[2]=season, m[3]=absolute episode
        const name = KNOWN_ANIME[slug];
        if (name && isValidEpisode(ep)) return { animeName: name, episode: ep };
      }
      return null;
    },
  };

  /* ---------- Shared extractor functions ---------- */

  /** HiAnime / Zoro / AniWatch / Kaido / AnimeSuge */
  function zoroExtract() {
    const name =
      document.querySelector(".film-name a, .anis-watch-detail .film-name, .anime-title")?.textContent?.trim() || "";
    const epEl =
      document.querySelector(".ssl-item.ep-item.active")?.getAttribute("title") ||
      document.querySelector(".ep-item.active, .episodes .active")?.textContent || "";
    const epNum = epEl.match(/(\d+)/);
    if (name && epNum) return { animeName: name, episode: parseInt(epNum[1], 10) };

    // Fallback: title "AnimeName Episode N - HiAnime"
    const titleMatch = document.title.match(/^(.+?)\s+Episode\s+(\d+)/i);
    if (titleMatch) return { animeName: titleMatch[1].trim(), episode: parseInt(titleMatch[2], 10) };

    return null;
  }

  /** AniWave / 9anime */
  function aniwaveExtract() {
    // Anime name from heading or breadcrumb
    const name =
      document.querySelector("h2.film-name a, .watching-title a, .anime-title a")?.textContent?.trim() ||
      document.querySelector(".breadcrumb li:nth-child(2) a, .brd-ctn a")?.textContent?.trim() || "";
    // Episode number from active episode indicator or info text
    const epText =
      document.querySelector(".ep-name, .server-notice strong, .episodes .active")?.textContent ||
      document.querySelector(".ep-item.active")?.textContent || "";
    const epNum = epText.match(/(\d+)/);
    if (name && epNum) return { animeName: name, episode: parseInt(epNum[1], 10) };

    // Fallback: title "Watch AnimeName Episode N - 9anime"
    const titleMatch = document.title.match(/(?:Watch\s+)?(.+?)\s+Episode\s+(\d+)/i);
    if (titleMatch) {
      const n = titleMatch[1].replace(/^Watch\s+/i, "").trim();
      return { animeName: n, episode: parseInt(titleMatch[2], 10) };
    }

    return null;
  }

  /** GoGoAnime / Anitaku */
  function gogoanimeExtract() {
    // URL pattern: /anime-slug-episode-NUMBER
    const urlMatch = location.pathname.match(/\/(.+?)-episode-(\d+)/i);
    let animeName = "";
    let episode = 0;

    // Try DOM: the category/info link has the anime name
    const infoLink =
      document.querySelector(".anime-info a[title], .anime_video_body_cate .anime-info a") ||
      document.querySelector('a[href*="/category/"]');
    if (infoLink) {
      animeName = (infoLink.getAttribute("title") || infoLink.textContent || "").trim();
    }

    // Try h1 which contains "AnimeName Episode N"
    if (!animeName) {
      const h1 = document.querySelector(".anime_video_body h1, h1");
      if (h1) {
        const h1Match = h1.textContent.match(/^(.+?)\s+Episode\s+(\d+)/i);
        if (h1Match) {
          animeName = h1Match[1].trim();
          episode = parseInt(h1Match[2], 10);
        }
      }
    }

    // Episode from URL if not found in DOM
    if (!episode && urlMatch) {
      episode = parseInt(urlMatch[2], 10);
      if (!animeName) {
        const slug = urlMatch[1];
        animeName = KNOWN_ANIME[slug] || slugToName(slug);
      }
    }

    // Episode from active episode list item
    if (!episode) {
      const activeEp = document.querySelector(".episode_active, li.active a[data-number], .active .name");
      if (activeEp) {
        const num = (activeEp.getAttribute("data-number") || activeEp.textContent || "").match(/(\d+)/);
        if (num) episode = parseInt(num[1], 10);
      }
    }

    // Fallback: page title "Watch AnimeName Episode N English Subbed - GoGoAnime"
    if (!animeName || !episode) {
      const titleMatch = document.title.match(/(?:Watch\s+)?(.+?)\s+Episode\s+(\d+)/i);
      if (titleMatch) {
        if (!animeName) animeName = titleMatch[1].replace(/^Watch\s+/i, "").trim();
        if (!episode) episode = parseInt(titleMatch[2], 10);
      }
    }

    if (animeName && episode) return { animeName, episode };
    return null;
  }

  /** AnimePahe */
  function animepaheExtract() {
    // Anime name from theatre info or heading
    let animeName =
      document.querySelector(".theatre-info h1 a, .anime-title, .title-wrapper h1 a")?.textContent?.trim() || "";

    // Try breadcrumb link to anime page
    if (!animeName) {
      const crumb = document.querySelector('a[href*="/anime/"]');
      if (crumb) animeName = crumb.textContent.trim();
    }

    // Episode number from active episode badge or info text
    let episode = 0;
    const epBadge =
      document.querySelector(".sequel .active, .episode-number, .theatre-info .episode") ||
      document.querySelector('[class*="episode"][class*="active"]');
    if (epBadge) {
      const num = epBadge.textContent.match(/(\d+)/);
      if (num) episode = parseInt(num[1], 10);
    }

    // Try episode from the episode-wrap active item
    if (!episode) {
      const activeEp = document.querySelector(".ep-wrap .active, .episode-list .active");
      if (activeEp) {
        const num = activeEp.textContent.match(/(\d+)/);
        if (num) episode = parseInt(num[1], 10);
      }
    }

    // Fallback: page title "AnimeName - Episode N :: AnimePahe" or "Watch AnimeName Episode N"
    if (!animeName || !episode) {
      const patterns = [
        /^(.+?)\s*[-–—]\s*Episode\s+(\d+)/i,
        /(?:Watch\s+)?(.+?)\s+Episode\s+(\d+)/i,
        /^(.+?)\s+(\d+)\s*::/,
      ];
      for (const pat of patterns) {
        const m = document.title.match(pat);
        if (m) {
          if (!animeName) animeName = m[1].replace(/^Watch\s+/i, "").trim();
          if (!episode) episode = parseInt(m[2], 10);
          break;
        }
      }
    }

    if (animeName && episode) return { animeName, episode };
    return null;
  }

  /** TürkAnime */
  function turkanimeExtract() {
    // URL pattern: /video/anime-slug-N-bolum
    const urlMatch = location.pathname.match(/\/video\/(.+?)-(\d+)-bol[uü]m/i);

    // Anime name from breadcrumb
    let animeName = "";
    const breadcrumbs = document.querySelectorAll(".breadcrumb li a, .breadcrumb a, nav a[href*='/anime/']");
    for (const el of breadcrumbs) {
      const href = el.getAttribute("href") || "";
      if (href.includes("/anime/") && !href.includes("/video/")) {
        animeName = el.textContent.trim();
        break;
      }
    }

    // Try page heading
    if (!animeName) {
      const heading = document.querySelector(".video-title h1, h2.baslik, .panel-title, h1.title");
      if (heading) {
        // Extract anime name without episode part
        const hText = heading.textContent.trim();
        const hMatch = hText.match(/^(.+?)\s+(\d+)\s*\.?\s*(?:Bölüm|Bolum)/i);
        if (hMatch) animeName = hMatch[1].trim();
        else animeName = hText;
      }
    }

    // Episode number
    let episode = 0;
    // From URL
    if (urlMatch) {
      episode = parseInt(urlMatch[2], 10);
      if (!animeName) {
        const slug = urlMatch[1];
        animeName = KNOWN_ANIME[slug] || slugToName(slug);
      }
    }

    // From active episode selector
    if (!episode) {
      const activeEp = document.querySelector(".episode-list .active, .bolumler .active, .ep-active");
      if (activeEp) {
        const num = activeEp.textContent.match(/(\d+)/);
        if (num) episode = parseInt(num[1], 10);
      }
    }

    // Fallback: page title "Anime Name N. Bölüm Türkçe Altyazılı İzle - TürkAnime"
    if (!animeName || !episode) {
      const titleMatch = document.title.match(/^(.+?)\s+(\d+)\s*\.?\s*(?:Bölüm|Bolum)/i);
      if (titleMatch) {
        if (!animeName) animeName = titleMatch[1].replace(/[-–—:]\s*$/, "").trim();
        if (!episode) episode = parseInt(titleMatch[2], 10);
      }
    }

    // Clean noise from name
    if (animeName) {
      animeName = animeName
        .replace(/\b(Türkçe|Altyazılı|İzle|Izle|HD|720p|1080p)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    if (animeName && episode) return { animeName, episode };
    return null;
  }

  /** Anizm */
  function anizmExtract() {
    // URL pattern: /anime-slug-N-bolum-izle
    const urlMatch = location.pathname.match(/\/(.+?)-(\d+)-bol[uü]m(?:-izle)?/i);

    // Anime name from breadcrumb or heading
    let animeName = "";
    const breadcrumbs = document.querySelectorAll(".breadcrumb a, nav a");
    for (const el of breadcrumbs) {
      const href = el.getAttribute("href") || "";
      // Anizm anime pages are like /anime-slug (no -bolum)
      if (href.match(/^\/[a-z0-9-]+$/) && !href.includes("-bolum") && href !== "/" && !href.includes("/kategori")) {
        animeName = el.textContent.trim();
        break;
      }
    }

    // Try heading
    if (!animeName) {
      const heading = document.querySelector("h1, h2.title, .video-title");
      if (heading) {
        const hText = heading.textContent.trim();
        const hMatch = hText.match(/^(.+?)\s+(\d+)\s*\.?\s*(?:Bölüm|Bolum)/i);
        if (hMatch) animeName = hMatch[1].trim();
      }
    }

    // Episode number
    let episode = 0;
    if (urlMatch) {
      episode = parseInt(urlMatch[2], 10);
      if (!animeName) {
        const slug = urlMatch[1];
        animeName = KNOWN_ANIME[slug] || slugToName(slug);
      }
    }

    // From active episode in episode list
    if (!episode) {
      const activeEp = document.querySelector(".episode-list .active, .bolumler .active, .current-episode");
      if (activeEp) {
        const num = activeEp.textContent.match(/(\d+)/);
        if (num) episode = parseInt(num[1], 10);
      }
    }

    // Fallback: page title "Anime Name N. Bölüm İzle - Anizm"
    if (!animeName || !episode) {
      const titleMatch = document.title.match(/^(.+?)\s+(\d+)\s*\.?\s*(?:Bölüm|Bolum)/i);
      if (titleMatch) {
        if (!animeName) animeName = titleMatch[1].replace(/[-–—:]\s*$/, "").trim();
        if (!episode) episode = parseInt(titleMatch[2], 10);
      }
    }

    // Clean noise
    if (animeName) {
      animeName = animeName
        .replace(/\b(Türkçe|Altyazılı|İzle|Izle|HD|Anime)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    if (animeName && episode) return { animeName, episode };
    return null;
  }

  /** AnimeKai — uses #ep=NUMBER hash and breadcrumb for anime name */
  function animekaiExtract() {
    let animeName = "";

    // 1. Try heading/title area (many possible selectors for AnimeKai's layout)
    const headingSelectors = [
      "h2.film-name a",
      ".anis-watch-detail .film-name a",
      ".anis-watch-detail .film-name",
      "h2.film-name",
      ".title-name",
      ".anime-name",
      ".watch-section .title a",
      ".detail-name a",
      ".detail-name",
    ];
    for (const sel of headingSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const txt = el.textContent.trim();
        if (txt && txt.length > 2 && txt.length < 120) { animeName = txt; break; }
      }
    }

    // 2. Breadcrumb: links to actual anime detail pages (require /category/slug, not bare /category)
    if (!animeName) {
      const allLinks = document.querySelectorAll("a[href]");
      for (const el of allLinks) {
        const href = el.getAttribute("href") || "";
        if (href.match(/^\/(anime|tv|movie|ona|ova|special)\/[a-z0-9]/i)) {
          const txt = el.textContent.trim();
          if (txt && txt.length > 2 && txt.length < 120 &&
              !/^(Home|TV|Movies?|ONA|OVA|Specials?|Chinese|All|Filter|Genres?|Types?|Sort)$/i.test(txt)) {
            animeName = txt;
          }
        }
      }
    }

    // 3. URL slug fallback: /watch/fairy-tail-100-years-quest-rm4j → "Fairy Tail 100 Years Quest"
    //    AnimeKai appends a short alphanumeric hash (3-5 chars, always contains digits) to slugs
    if (!animeName) {
      const slugMatch = location.pathname.match(/\/watch\/([a-z0-9][a-z0-9-]+)/i);
      if (slugMatch) {
        let slug = slugMatch[1];
        // Strip trailing hash: must contain at least one digit (e.g. -rm4j, -126r9, -dk6r)
        // This avoids stripping real words like -lock, -war, -sub, -dub
        slug = slug.replace(/-(?=[a-z0-9]*\d)[a-z0-9]{2,6}$/i, "");
        const name = slugToName(slug);
        if (name && isValidAnimeName(name)) animeName = name;
      }
    }

    // Episode from hash: #ep=25
    let episode = 0;
    const hashMatch = location.hash.match(/[#&]ep=(\d+)/i);
    if (hashMatch) {
      episode = parseInt(hashMatch[1], 10);
    }

    // Fallback: active episode in episode list
    if (!episode) {
      const activeEp = document.querySelector(
        ".ep-item.active, .episode-item.active, .episodes .active, " +
        ".epi-item.active, .episode.active, [data-number].active"
      );
      if (activeEp) {
        const num = (activeEp.getAttribute("data-number") || activeEp.textContent || "").match(/(\d+)/);
        if (num) episode = parseInt(num[1], 10);
      }
    }

    // Fallback: "You are watching Episode N" text on page
    if (!episode) {
      const body = document.body?.textContent || "";
      const watchingMatch = body.match(/(?:watching|izliyorsunuz)\s+Episode\s+(\d+)/i);
      if (watchingMatch) episode = parseInt(watchingMatch[1], 10);
    }

    // Fallback: page title "Watch Anime Name Episode N Sub/Dub - AnimeKai"
    if (!animeName || !episode) {
      const titleMatch = document.title.match(/(?:Watch\s+)?(.+?)\s+Episode\s+(\d+)/i);
      if (titleMatch) {
        if (!animeName) animeName = titleMatch[1].replace(/^Watch\s+/i, "").trim();
        if (!episode) episode = parseInt(titleMatch[2], 10);
      }
    }

    if (animeName && episode) return { animeName, episode };
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MAIN DETECT — DOM → JSON-LD → Meta → Title → URL
   * ═══════════════════════════════════════════════════════════════ */
  function detect() {
    const host = location.hostname.replace(/^www\./, "");

    // 1. Site-specific DOM extractors — handcrafted, always most accurate for
    //    known sites (run before JSON-LD so season-relative episodeNumber in
    //    JSON-LD can't override the correct absolute episode from the URL/DOM)
    for (const [key, fn] of Object.entries(siteExtractors)) {
      if (host.includes(key)) {
        const r = fn();
        if (r?.animeName && r?.episode) return r;
      }
    }

    // 2. JSON-LD structured data — reliable for unknown sites with schema.org markup
    const fromJsonLD = extractFromJsonLD();
    if (fromJsonLD?.animeName && fromJsonLD?.episode) return fromJsonLD;

    // 3. Explicit meta tags (og:video:series/episode) or og:title with episode keyword
    const fromMeta = extractFromMeta();
    if (fromMeta?.animeName && fromMeta?.episode) return fromMeta;

    // 4. Title tag — only fires when explicit episode keyword present
    const fromTitle = extractFromTitle();
    if (fromTitle?.animeName && fromTitle?.episode) return fromTitle;

    // 5. URL — last resort, only KNOWN_ANIME dictionary slugs (no guessing)
    const fromURL = extractFromURL();
    if (fromURL?.animeName && fromURL?.episode) return fromURL;

    return { animeName: "", episode: null };
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ON-PAGE FLOATING BADGE
   * ═══════════════════════════════════════════════════════════════ */
  const BADGE_ID = "afc-floating-badge";
  let badgePos = "top-right";
  let badgeContent = "status_title";
  let badgeAutohide = 3;

  async function loadBadgePosition() {
    try {
      const data = await chrome.storage.local.get(["afc_badge_pos", "afc_badge_content", "afc_badge_autohide"]);
      badgePos = data.afc_badge_pos || "top-right";
      badgeContent = data.afc_badge_content || "status_title";
      badgeAutohide = parseInt(data.afc_badge_autohide ?? "3", 10);
    } catch {}
  }

  function applyBadgePosition(el) {
    // Remove old position classes
    el.classList.remove("afc-pos-top-right", "afc-pos-top-left", "afc-pos-bottom-right", "afc-pos-bottom-left");
    el.classList.add("afc-pos-" + badgePos);
    // Reset inline styles that dragging may have set
    el.style.left = "";
    el.style.top = "";
    el.style.right = "";
    el.style.bottom = "";
  }

  function createBadge() {
    if (document.getElementById(BADGE_ID)) return document.getElementById(BADGE_ID);
    const el = document.createElement("div");
    el.id = BADGE_ID;
    el.innerHTML = `
      <div class="afc-badge-inner">
        <div class="afc-badge-icon"></div>
        <div class="afc-badge-content">
          <div class="afc-badge-title"></div>
          <div class="afc-badge-sub"></div>
        </div>
      </div>
      <button class="afc-badge-close" title="Close">✕</button>
    `;
    document.body.appendChild(el);

    // Apply saved position
    applyBadgePosition(el);

    el.querySelector(".afc-badge-close").addEventListener("click", (e) => {
      e.stopPropagation();
      el.classList.add("afc-hidden");
    });

    // Make draggable
    let isDragging = false, offsetX, offsetY;
    const inner = el.querySelector(".afc-badge-inner");
    inner.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("afc-badge-close")) return;
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      el.style.transition = "none";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      el.style.right = "auto";
      el.style.left = (e.clientX - offsetX) + "px";
      el.style.top = (e.clientY - offsetY) + "px";
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
      el.style.transition = "";
    });

    return el;
  }

  function showBadge(type, animeName, episode, epTitle) {
    const badge = createBadge();
    badge.className = "";
    badge.classList.add("afc-type-" + type, "afc-visible");

    const config = {
      canon:      { icon: "✅", label: "CANON",       sub: "This episode is canon — watch it!" },
      filler:     { icon: "⛔", label: "FILLER",      sub: "Filler episode — safe to skip!" },
      mixed:      { icon: "⚠️",  label: "MIXED",       sub: "Mix of canon & filler content" },
      anime_canon:{ icon: "🔵", label: "ANIME CANON", sub: "Anime-original but part of the story" },
      unknown:    { icon: "❓", label: "UNKNOWN",     sub: "Could not determine episode type" },
    };
    const c = config[type] || config.unknown;

    badge.querySelector(".afc-badge-icon").textContent = c.icon;
    badge.querySelector(".afc-badge-title").textContent = `EP ${episode} — ${c.label}`;

    // Badge content setting
    if (badgeContent === "status") {
      badge.querySelector(".afc-badge-sub").textContent = animeName;
    } else {
      badge.querySelector(".afc-badge-sub").textContent = `${animeName}${epTitle ? " • " + epTitle : ""}`;
    }

    lastBadgeHTML = badge.outerHTML;
    startBadgeGuard();

    // Auto-hide badge
    if (badgeAutohide > 0) {
      setTimeout(() => {
        const b = document.getElementById(BADGE_ID);
        if (b) b.classList.add("afc-hidden");
      }, badgeAutohide * 1000);
    }
  }

  function showBadgeLoading(animeName, episode) {
    const badge = createBadge();
    badge.className = "afc-type-loading afc-visible";
    badge.querySelector(".afc-badge-icon").textContent = "⏳";
    badge.querySelector(".afc-badge-title").textContent = `Checking EP ${episode}…`;
    badge.querySelector(".afc-badge-sub").textContent = animeName;
  }

  function showBadgeError(msg) {
    const badge = createBadge();
    badge.className = "afc-type-error afc-visible";
    badge.querySelector(".afc-badge-icon").textContent = "😿";
    badge.querySelector(".afc-badge-title").textContent = "Not Found";
    badge.querySelector(".afc-badge-sub").textContent = msg;
    lastBadgeHTML = badge.outerHTML;
    startBadgeGuard();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  AUTO-SKIP — navigate to next canon episode
   * ═══════════════════════════════════════════════════════════════ */
  const SKIP_OVERLAY_ID = "afc-skip-overlay";

  function buildNextEpUrl(nextEp) {
    const currentUrl = location.href;
    // Replace episode number in URL patterns like ep-176, episode-176, ep176, /176
    const patterns = [
      /(\bep[-_]?)(\d+)/i,
      /(\bepisode[-_]?)(\d+)/i,
      /(\bbol[uü]m[-_]?)(\d+)/i,
      /(\/watch\/[^/]+\/)(\d+)/i,
      /(-?)(\d+)(-bol[uü]m)/i,
    ];
    for (const pat of patterns) {
      if (pat.test(currentUrl)) {
        return currentUrl.replace(pat, (m, pre, num, post) =>
          pre + nextEp + (post || "")
        );
      }
    }
    return null;
  }

  function findNextEpLink() {
    // Try common "next episode" buttons/links on streaming sites
    const selectors = [
      'a[class*="next"]', 'a[class*="Next"]',
      'a[title*="Next"]', 'a[title*="next"]',
      'a[aria-label*="Next"]',
      '.next-ep', '.btn-next', '.next-episode-btn',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.href) return el;
    }
    return null;
  }

  function showSkipOverlay(nextEp, nextTitle, animeName, currentType) {
    removeSkipOverlay();

    const overlay = document.createElement("div");
    overlay.id = SKIP_OVERLAY_ID;
    overlay.classList.add("afc-pos-" + badgePos);

    const typeLabel = currentType === "filler" ? "FILLER" : "MIXED";
    const nextUrl = buildNextEpUrl(nextEp);

    let seconds = 5;
    overlay.innerHTML = `
      <div class="afc-skip-inner">
        <div class="afc-skip-icon">${currentType === "filler" ? "⛔" : "⚠️"}</div>
        <div class="afc-skip-text">
          <div class="afc-skip-title">This episode is <strong>${typeLabel}</strong></div>
          <div class="afc-skip-sub">Skipping to EP ${nextEp}${nextTitle ? " — " + nextTitle : ""} in <span class="afc-skip-countdown">${seconds}</span>s</div>
        </div>
        <div class="afc-skip-actions">
          <button class="afc-skip-now">Skip Now</button>
          <button class="afc-skip-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const countdownEl = overlay.querySelector(".afc-skip-countdown");
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        navigateToEp(nextUrl);
      }
    }, 1000);

    overlay.querySelector(".afc-skip-now").addEventListener("click", () => {
      clearInterval(timer);
      navigateToEp(nextUrl);
    });

    overlay.querySelector(".afc-skip-cancel").addEventListener("click", () => {
      clearInterval(timer);
      removeSkipOverlay();
    });
  }

  function navigateToEp(url) {
    removeSkipOverlay();
    if (url) {
      location.href = url;
    } else {
      // Fallback: try clicking the next-episode button
      const nextBtn = findNextEpLink();
      if (nextBtn) nextBtn.click();
    }
  }

  function removeSkipOverlay() {
    const el = document.getElementById(SKIP_OVERLAY_ID);
    if (el) el.remove();
  }

  /* ═══════════════════════════════════════════════════════════════
   *  AUTO-RUN: detect & check (with toggle + safeguards)
   * ═══════════════════════════════════════════════════════════════ */
  async function autoCheck() {
    // TOGGLE: check if auto-badge is enabled
    try {
      const data = await chrome.storage.local.get("afc_enabled");
      if (data.afc_enabled === false) return;
    } catch {}

    // WHITELIST: only auto-detect on user's streaming sites
    const onStreamingSite = await isStreamingSite();
    if (!onStreamingSite) return;

    // Load badge position preference
    await loadBadgePosition();

    const info = detect();

    // SAFEGUARD: final validation
    if (!info.animeName || !info.episode) return;
    if (!isValidAnimeName(info.animeName)) return;
    if (!isValidEpisode(info.episode)) return;

    showBadgeLoading(info.animeName, info.episode);

    chrome.runtime.sendMessage(
      { type: "CHECK_FILLER", animeName: info.animeName, episode: info.episode },
      async (response) => {
        if (chrome.runtime.lastError || !response) {
          showBadgeError("Extension error");
          return;
        }
        if (!response.success) {
          showBadgeError(`"${info.animeName}" not found on AnimeFillerList`);
          return;
        }
        const ep = response.episode;
        const type = ep?.type || "unknown";
        showBadge(type, response.showTitle || info.animeName, info.episode, ep?.title || "");

        // Save to watch history (only if episode is higher than saved)
        try {
          const hData = await chrome.storage.local.get("afc_watch_history");
          let history = hData.afc_watch_history || [];
          const showName = response.showTitle || info.animeName;
          const existing = history.find(h => h.name.toLowerCase() === showName.toLowerCase());
          if (!existing || info.episode > existing.episode) {
            history = history.filter(h => h.name.toLowerCase() !== showName.toLowerCase());
            history.unshift({
              name: showName,
              episode: info.episode,
              type,
              epTitle: ep?.title || "",
              ts: Date.now(),
            });
            if (history.length > 8) history = history.slice(0, 8);
            await chrome.storage.local.set({ afc_watch_history: history });
          }
        } catch {}

        // Auto-skip check
        try {
          const skipData = await chrome.storage.local.get("afc_auto_skip");
          const skipMode = skipData.afc_auto_skip || "off"; // "off" | "filler" | "filler_mixed"
          if (skipMode !== "off" && response.nextCanonEp) {
            const shouldSkip =
              (skipMode === "filler" && type === "filler") ||
              (skipMode === "filler_mixed" && (type === "filler" || type === "mixed"));
            if (shouldSkip) {
              showSkipOverlay(
                response.nextCanonEp.number,
                response.nextCanonEp.title,
                response.showTitle || info.animeName,
                type
              );
            }
          }
        } catch {}
      }
    );
  }

  // Run after a short delay to let SPAs render
  setTimeout(autoCheck, 1500);

  // Protect badge from being removed by site DOM cleanup
  let badgeGuardTimer = null;
  let lastBadgeHTML = null;
  function startBadgeGuard() {
    if (badgeGuardTimer) clearInterval(badgeGuardTimer);
    badgeGuardTimer = setInterval(() => {
      const badge = document.getElementById(BADGE_ID);
      if (!badge && lastBadgeHTML) {
        // Badge was removed by the site — re-inject it
        const temp = document.createElement("div");
        temp.innerHTML = lastBadgeHTML;
        const restored = temp.firstElementChild;
        if (restored) document.body.appendChild(restored);
      }
    }, 3000);
  }

  // Re-check on URL or hash change (SPA navigation) — throttled
  let lastUrl = location.pathname + location.search;
  let lastHash = location.hash;
  let navTimer = null;

  function scheduleRecheck() {
    const old = document.getElementById(BADGE_ID);
    if (old) old.remove();
    lastBadgeHTML = null;
    if (badgeGuardTimer) clearInterval(badgeGuardTimer);
    if (navTimer) clearTimeout(navTimer);
    navTimer = setTimeout(autoCheck, 2000);
  }

  function checkForNavigation() {
    const currentUrl = location.pathname + location.search;
    const currentHash = location.hash;
    if (currentUrl !== lastUrl || currentHash !== lastHash) {
      lastUrl = currentUrl;
      lastHash = currentHash;
      scheduleRecheck();
    }
  }

  const observer = new MutationObserver(checkForNavigation);

  // Hash change listener — for sites like AnimeKai that use #ep=N navigation
  window.addEventListener("hashchange", checkForNavigation);

  // Polling fallback — some SPAs change hash without triggering events
  setInterval(checkForNavigation, 1500);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MESSAGE HANDLER — popup can also request info
   * ═══════════════════════════════════════════════════════════════ */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_ANIME_INFO") {
      sendResponse(detect());
    }
    if (msg.type === "RUN_AUTO_CHECK") {
      autoCheck();
      sendResponse({ ok: true });
    }
    return true;
  });

})();
