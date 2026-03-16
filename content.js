/**
 * Anime Filler Checker — Content Script v2.1
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

  /** Sites that should NEVER trigger auto-detection */
  const BLOCKED_DOMAINS = [
    "google.com", "youtube.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "reddit.com", "github.com", "stackoverflow.com",
    "amazon.com", "netflix.com", "hbomax.com", "hbo.com", "max.com",
    "disneyplus.com", "spotify.com", "twitch.tv", "discord.com",
    "linkedin.com", "whatsapp.com", "tiktok.com", "wikipedia.org",
    "play.google.com", "apple.com", "microsoft.com", "outlook.com",
    "gmail.com", "mail.google.com", "drive.google.com", "docs.google.com",
    "claude.ai", "chatgpt.com", "openai.com",
  ];

  /** Check if current site is blocked */
  function isBlockedSite() {
    const host = location.hostname.replace(/^www\./, "");
    return BLOCKED_DOMAINS.some(d => host === d || host.endsWith("." + d));
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
      // /watch/slug/episode-NUM  or /watch/slug/NUM
      /\/(?:watch|anime|izle|video)\/([a-z0-9][a-z0-9-]+?)\/(?:episode-?|ep-?)?(\d+)/,
      // /slug/season-N/episode-NUM
      /\/([a-z0-9][a-z0-9-]+?)\/(?:season-?\d+\/)?(?:episode|ep)-?(\d+)/,
      // Catch: slug followed by number at end of path
      /\/([a-z0-9][a-z0-9-]*[a-z])-(\d{1,4})(?:[-\/]|$)/,
    ];

    for (const pat of patterns) {
      const m = full.match(pat) || path.match(pat);
      if (m) {
        const slug = m[1].replace(/[-_]+$/, "");
        const ep = parseInt(m[2], 10);
        const name = KNOWN_ANIME[slug] || slugToName(slug);
        if (isValidAnimeName(name) && isValidEpisode(ep)) {
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
   *  META TAG PARSER — fallback for sites with good meta tags
   * ═══════════════════════════════════════════════════════════════ */
  function extractFromMeta() {
    const metas = [
      document.querySelector('meta[property="og:title"]')?.content,
      document.querySelector('meta[name="title"]')?.content,
      document.querySelector('meta[property="og:description"]')?.content,
    ];
    for (const raw of metas) {
      if (!raw) continue;
      const cleaned = raw.replace(/[\|–—]/g, "-").replace(/\s+/g, " ").trim();
      const m = cleaned.match(/(.+?)\s*[-:]?\s*(?:Episode|Ep\.?|E)(\d+)/i);
      if (m) {
        let name = m[1].replace(/[-:]\s*$/, "").replace(/\b(Watch|Online|Free|HD|Sub|Dub|Anime)\b/gi, "").replace(/\s{2,}/g, " ").trim();
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
        'a[href*="/series/"]',
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

      // Episode title/number: try multiple selectors
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

      const epMatch = title.match(/(?:E|EP|Episode)\s*(\d+)/i);
      if (series && epMatch) return { animeName: series, episode: parseInt(epMatch[1], 10) };

      // Last resort: try document.title
      if (series) {
        const dtMatch = document.title.match(/(?:E|EP|Episode)\s*(\d+)/i);
        if (dtMatch) return { animeName: series, episode: parseInt(dtMatch[1], 10) };
      }

      return null;
    },
    "hianime.to": zoroExtract,
    "aniwatch.to": zoroExtract,
    "zoro.to":     zoroExtract,
    "aniwave.to": () => {
      const name = document.querySelector("h2.film-name a, .watching-title a")?.textContent?.trim() || "";
      const epText = document.querySelector(".ep-name, .server-notice strong")?.textContent || "";
      const epNum = epText.match(/(\d+)/);
      if (name && epNum) return { animeName: name, episode: parseInt(epNum[1], 10) };
      return null;
    },
  };

  function zoroExtract() {
    const name =
      document.querySelector(".film-name a, .anis-watch-detail .film-name")?.textContent?.trim() || "";
    const epEl =
      document.querySelector(".ssl-item.ep-item.active")?.getAttribute("title") ||
      document.querySelector(".ep-item.active")?.textContent || "";
    const epNum = epEl.match(/(\d+)/);
    if (name && epNum) return { animeName: name, episode: parseInt(epNum[1], 10) };
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  MAIN DETECT — tries URL → DOM → Title in order
   * ═══════════════════════════════════════════════════════════════ */
  function detect() {
    // 1. URL (most reliable for intl sites)
    const fromURL = extractFromURL();
    if (fromURL?.animeName && fromURL?.episode) return fromURL;

    // 2. Site-specific DOM
    const host = location.hostname.replace(/^www\./, "");
    for (const [key, fn] of Object.entries(siteExtractors)) {
      if (host.includes(key)) {
        const r = fn();
        if (r?.animeName && r?.episode) return r;
      }
    }

    // 3. Title tag
    const fromTitle = extractFromTitle();
    if (fromTitle?.animeName && fromTitle?.episode) return fromTitle;

    // 4. Meta tags (og:title, etc.)
    const fromMeta = extractFromMeta();
    if (fromMeta?.animeName && fromMeta?.episode) return fromMeta;

    return { animeName: "", episode: null };
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ON-PAGE FLOATING BADGE
   * ═══════════════════════════════════════════════════════════════ */
  const BADGE_ID = "afc-floating-badge";

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
        <div class="afc-badge-score" style="display:none"></div>
      </div>
      <button class="afc-badge-close" title="Close">✕</button>
    `;
    document.body.appendChild(el);

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

  function showBadge(type, animeName, episode, epTitle, mal) {
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
    badge.querySelector(".afc-badge-sub").textContent = `${animeName}${epTitle ? " • " + epTitle : ""}`;

    const scoreEl = badge.querySelector(".afc-badge-score");
    if (mal && mal.score) {
      scoreEl.textContent = `★ ${mal.score.toFixed(2)}`;
      scoreEl.style.display = "";
    } else {
      scoreEl.style.display = "none";
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
  }

  /* ═══════════════════════════════════════════════════════════════
   *  AUTO-RUN: detect & check (with toggle + safeguards)
   * ═══════════════════════════════════════════════════════════════ */
  async function autoCheck() {
    // SAFEGUARD: skip blocked sites
    if (isBlockedSite()) return;

    // TOGGLE: check if auto-badge is enabled
    try {
      const data = await chrome.storage.local.get("afc_enabled");
      if (data.afc_enabled === false) return;
    } catch {}

    const info = detect();

    // SAFEGUARD: final validation
    if (!info.animeName || !info.episode) return;
    if (!isValidAnimeName(info.animeName)) return;
    if (!isValidEpisode(info.episode)) return;

    showBadgeLoading(info.animeName, info.episode);

    chrome.runtime.sendMessage(
      { type: "CHECK_FILLER", animeName: info.animeName, episode: info.episode },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          showBadgeError("Extension error");
          return;
        }
        if (!response.success) {
          // Silently hide on non-anime pages instead of showing error
          const badge = document.getElementById(BADGE_ID);
          if (badge) badge.classList.add("afc-hidden");
          return;
        }
        const ep = response.episode;
        const type = ep?.type || "unknown";
        showBadge(type, response.showTitle || info.animeName, info.episode, ep?.title || "", response.mal);
      }
    );
  }

  // Run after a short delay to let SPAs render
  setTimeout(autoCheck, 1500);

  // Re-check on URL change (SPA navigation) — throttled
  let lastUrl = location.href;
  let navTimer = null;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const old = document.getElementById(BADGE_ID);
      if (old) old.remove();
      if (navTimer) clearTimeout(navTimer);
      navTimer = setTimeout(autoCheck, 2000);
    }
  });
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
    return true;
  });

})();
