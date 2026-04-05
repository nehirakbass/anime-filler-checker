/**
 * Anime Filler Checker — Popup v2
 */
const $ = (s) => document.querySelector(s);

const VERDICT = {
  canon:       { icon: "✅", label: "CANON",       desc: "This episode follows the manga — watch it!" },
  filler:      { icon: "⛔", label: "FILLER",      desc: "This is filler — not from the manga. Safe to skip!" },
  mixed:       { icon: "⚠️",  label: "MIXED",       desc: "Mix of canon & filler content." },
  anime_canon: { icon: "🔵", label: "ANIME CANON", desc: "Anime-original content, but part of the story." },
  unknown:     { icon: "❓", label: "UNKNOWN",     desc: "Episode type could not be determined." },
};

let detected = { animeName: "", episode: null };

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
];

document.addEventListener("DOMContentLoaded", async () => {
  const checkBtn  = $("#checkBtn");
  const nameInput = $("#manualName");
  const epInput   = $("#manualEp");
  const toggle    = $("#toggleEnabled");
  const skipSelect = $("#autoSkip");
  const posSelect = $("#badgePosition");
  const contentSelect = $("#badgeContent");
  const autohideSelect = $("#badgeAutohide");

  // Load toggle state (default: enabled)
  try {
    const data = await chrome.storage.local.get("afc_enabled");
    toggle.checked = data.afc_enabled !== false;
  } catch {}

  // Load auto-skip state (default: off)
  try {
    const data = await chrome.storage.local.get("afc_auto_skip");
    skipSelect.value = data.afc_auto_skip || "off";
  } catch {}

  // Load badge position (default: top-right)
  try {
    const data = await chrome.storage.local.get("afc_badge_pos");
    posSelect.value = data.afc_badge_pos || "top-right";
  } catch {}

  // Load badge content (default: status_title)
  try {
    const data = await chrome.storage.local.get("afc_badge_content");
    contentSelect.value = data.afc_badge_content || "status_title";
  } catch {}

  // Load badge autohide (default: 3)
  try {
    const data = await chrome.storage.local.get("afc_badge_autohide");
    autohideSelect.value = data.afc_badge_autohide ?? "3";
  } catch {}

  // Save toggle state on change
  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ afc_enabled: toggle.checked });
  });

  // Save auto-skip state on change
  skipSelect.addEventListener("change", () => {
    chrome.storage.local.set({ afc_auto_skip: skipSelect.value });
  });

  // Save badge position on change
  posSelect.addEventListener("change", () => {
    chrome.storage.local.set({ afc_badge_pos: posSelect.value });
  });

  // Save badge content on change
  contentSelect.addEventListener("change", () => {
    chrome.storage.local.set({ afc_badge_content: contentSelect.value });
  });

  // Save badge autohide on change
  autohideSelect.addEventListener("change", () => {
    chrome.storage.local.set({ afc_badge_autohide: autohideSelect.value });
  });

  // ─── Settings panel toggle ──────────
  const mainView = $("#mainView");
  const settingsView = $("#settingsView");

  $("#settingsBtn").addEventListener("click", () => {
    mainView.classList.add("view-hidden");
    settingsView.classList.remove("view-hidden");
  });

  $("#settingsBack").addEventListener("click", () => {
    settingsView.classList.add("view-hidden");
    mainView.classList.remove("view-hidden");
  });

  // ─── Streaming Sites management ─────
  const sitesList = $("#sitesList");
  const siteInput = $("#siteInput");
  const addSiteBtn = $("#addSiteBtn");

  let streamingSites = [...DEFAULT_STREAMING_SITES];

  try {
    const data = await chrome.storage.local.get("afc_streaming_sites");
    if (data.afc_streaming_sites) {
      streamingSites = data.afc_streaming_sites;
    }
  } catch {}

  function renderSites() {
    sitesList.innerHTML = "";
    streamingSites.forEach((site, i) => {
      const chip = document.createElement("div");
      chip.className = "site-chip";
      chip.innerHTML = `${esc(site)}<button class="site-remove" data-index="${i}" title="Remove">✕</button>`;
      sitesList.appendChild(chip);
    });
  }

  function saveSites() {
    chrome.storage.local.set({ afc_streaming_sites: streamingSites });
  }

  renderSites();

  sitesList.addEventListener("click", (e) => {
    if (e.target.classList.contains("site-remove")) {
      const idx = parseInt(e.target.dataset.index, 10);
      streamingSites.splice(idx, 1);
      saveSites();
      renderSites();
    }
  });

  function addSite() {
    let site = siteInput.value.trim().toLowerCase();
    if (!site) return;
    // Clean up: remove protocol, www, trailing slashes/paths
    site = site.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
    if (!site || site.length < 3 || !site.includes(".")) return;
    if (streamingSites.includes(site)) {
      siteInput.value = "";
      return;
    }
    streamingSites.push(site);
    saveSites();
    renderSites();
    siteInput.value = "";
  }

  addSiteBtn.addEventListener("click", addSite);
  siteInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addSite(); });

  $("#resetSites").addEventListener("click", () => {
    streamingSites = [...DEFAULT_STREAMING_SITES];
    saveSites();
    renderSites();
  });

  // ─── Quick add site to whitelist ───
  const quickSiteRow = $("#quickSiteRow");
  const quickSiteBtn = $("#quickSiteBtn");
  const quickSiteText = $("#quickSiteText");
  let currentHost = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        const url = new URL(tab.url);
        if (url.protocol === "https:" || url.protocol === "http:") {
          currentHost = url.hostname.replace(/^www\./, "");
        }
      } catch {}
    }
  } catch {}

  function updateQuickSiteBtn() {
    if (!currentHost || currentHost.length < 3) {
      quickSiteRow.style.display = "none";
      return;
    }
    quickSiteRow.style.display = "";
    const alreadyAdded = streamingSites.some(s => currentHost === s || currentHost.endsWith("." + s));
    if (alreadyAdded) {
      quickSiteBtn.classList.add("is-added");
      quickSiteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${esc(currentHost)} is whitelisted</span>`;
    } else {
      quickSiteBtn.classList.remove("is-added");
      quickSiteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg><span>Add ${esc(currentHost)} to whitelist</span>`;
    }
  }

  updateQuickSiteBtn();

  quickSiteBtn.addEventListener("click", async () => {
    if (!currentHost) return;
    const alreadyAdded = streamingSites.some(s => currentHost === s || currentHost.endsWith("." + s));
    if (alreadyAdded) return;
    streamingSites.push(currentHost);
    saveSites();
    renderSites();
    updateQuickSiteBtn();
    // Tell content script to auto-check now
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "RUN_AUTO_CHECK" });
      }
    } catch {}
  });

  // Ask content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      detected = await chrome.tabs.sendMessage(tab.id, { type: "GET_ANIME_INFO" });
    }
  } catch {}

  if (detected?.animeName) {
    $("#detectedName").textContent = detected.animeName;
    nameInput.value = detected.animeName;
  } else {
    $("#detectedName").textContent = "Not detected";
  }

  if (detected?.episode) {
    $("#detectedEp").textContent = `EP ${detected.episode}`;
    epInput.value = detected.episode;
  }

  // ─── Version check ─────────────────
  const currentVersion = chrome.runtime.getManifest().version;
  $("#footerVersion").textContent = `v${currentVersion}`;

  // Set rate link based on browser
  const rateLink = $("#rateLink");
  if (rateLink) {
    const isFF = typeof browser !== "undefined" || navigator.userAgent.includes("Firefox");
    rateLink.href = isFF
      ? "https://addons.mozilla.org/en-US/firefox/addon/anime-filler-checker/reviews/"
      : `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews`;
  }

  try {
    chrome.runtime.sendMessage({ type: "CHECK_UPDATE" }, (result) => {
      if (chrome.runtime.lastError || !result) return;
      const isFirefox = typeof browser !== "undefined" || navigator.userAgent.includes("Firefox");
      const storeInfo = isFirefox ? result.firefox : result.chrome;
      if (!storeInfo?.version) return;
      if (isNewerVersion(storeInfo.version, currentVersion)) {
        const banner = $("#updateBanner");
        $("#updateVersion").textContent = `v${storeInfo.version}`;
        const updateBtn = $("#updateBtn");
        if (isFirefox) {
          updateBtn.href = "https://addons.mozilla.org/en-US/firefox/addon/anime-filler-checker/";
        } else {
          updateBtn.href = `https://chromewebstore.google.com/detail/${chrome.runtime.id}`;
        }
        banner.classList.add("show");

        // Changelog / What's new
        if (storeInfo.notes) {
          const items = storeInfo.notes.split("\n").filter(Boolean);
          if (items.length) {
            const whatsNewBtn = $("#whatsNewBtn");
            const changelogDiv = $("#updateChangelog");
            whatsNewBtn.style.display = "";
            const ul = document.createElement("ul");
            items.forEach(note => {
              const li = document.createElement("li");
              li.textContent = note.trim();
              ul.appendChild(li);
            });
            changelogDiv.innerHTML = "";
            changelogDiv.appendChild(ul);

            whatsNewBtn.addEventListener("click", () => {
              const open = changelogDiv.classList.toggle("show");
              banner.classList.toggle("has-changelog", open);
              whatsNewBtn.textContent = open ? "Hide changelog ▴" : "See what's new ▾";
            });
          }
        }
      }
    });
  } catch {}

  checkBtn.disabled = false;

  checkBtn.addEventListener("click", () => {
    const name = nameInput.value.trim() || detected?.animeName || "";
    const ep   = parseInt(epInput.value, 10) || detected?.episode;
    if (!name) return showError("Enter an anime name.");
    if (!ep || ep < 1) return showError("Enter a valid episode number.");
    runCheck(name, ep);
  });

  const enterHandler = (e) => { if (e.key === "Enter") checkBtn.click(); };
  nameInput.addEventListener("keydown", enterHandler);
  epInput.addEventListener("keydown", enterHandler);

  // ─── Watch History ─────────────────
  loadHistory();

  $("#clearHistory").addEventListener("click", async () => {
    await chrome.storage.local.set({ afc_watch_history: [] });
    loadHistory();
  });
});

function runCheck(name, ep) {
  const btn = $("#checkBtn");
  btn.disabled = true;
  $("#results").innerHTML = `
    <div class="state-msg"><div class="spinner"></div>Checking EP ${ep}…</div>
  `;

  chrome.runtime.sendMessage(
    { type: "CHECK_FILLER", animeName: name, episode: ep },
    (res) => {
      btn.disabled = false;
      if (chrome.runtime.lastError || !res) return showError("Extension error — try reloading.");
      if (!res.success) return showError(res.error || "Anime not found on AnimeFillerList.");
      renderResult(res);
    }
  );
}

function renderResult(data) {
  const ep   = data.episode;
  const type = ep?.type || "unknown";
  const v    = VERDICT[type] || VERDICT.unknown;
  const mal  = data.mal;

  // Save to watch history
  saveToHistory({
    name: data.showTitle || data.queriedName || "",
    episode: data.queriedEpisode,
    type,
    epTitle: ep?.title || "",
    ts: Date.now(),
  });

  let malHTML = "";
  if (mal && mal.score) {
    const members = mal.members ? `${(mal.members / 1000).toFixed(0)}K members` : "";
    const status  = mal.status || "";
    const totalEp = mal.episodes ? `${mal.episodes} eps` : "";
    const meta    = [status, totalEp].filter(Boolean).join(" · ");

    malHTML = `
      <div class="mal-row">
        <div class="mal-score-box">
          <span class="mal-star">★</span>
          <span class="mal-score">${mal.score.toFixed(2)}</span>
        </div>
        <div class="mal-meta">
          <span class="mal-members">${members}</span>
          ${meta ? `<span class="mal-info">${esc(meta)}</span>` : ""}
        </div>
        ${mal.mal_url ? `<a class="mal-link" href="${esc(mal.mal_url)}" target="_blank">MAL ↗</a>` : ""}
      </div>
    `;
  }

  $("#results").innerHTML = `
    <div class="result-card">
      <div class="result-top">
        <div class="result-icon-box ${type}">${v.icon}</div>
        <div class="result-info">
          <div class="result-show" title="${esc(data.showTitle)}">${esc(data.showTitle)}</div>
          <div class="result-ep">Episode ${data.queriedEpisode}${ep?.title ? " — " + esc(ep.title) : ""}</div>
        </div>
      </div>
      ${malHTML}
      <div class="result-verdict">
        <span class="verdict-pill ${type}">${v.icon} ${v.label}</span>
        <div class="verdict-desc">${v.desc}</div>
      </div>
      <a class="result-link" href="${esc(data.url)}" target="_blank">
        View full list on AnimeFillerList ↗
      </a>
    </div>
  `;
}

function showError(msg) {
  $("#results").innerHTML = `
    <div class="state-msg error"><span class="emoji">😿</span>${esc(msg)}</div>
  `;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isNewerVersion(latest, current) {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════
 *  WATCH HISTORY
 * ═══════════════════════════════════════════════════════════════ */
const MAX_HISTORY = 8;

async function saveToHistory(entry) {
  if (!entry.name || !entry.episode) return;
  try {
    const data = await chrome.storage.local.get("afc_watch_history");
    let history = data.afc_watch_history || [];
    // Only update if new episode is higher than saved
    const existing = history.find(h => h.name.toLowerCase() === entry.name.toLowerCase());
    if (existing && existing.episode >= entry.episode) return;
    // Remove old entry for same anime
    history = history.filter(h => h.name.toLowerCase() !== entry.name.toLowerCase());
    // Add to front
    history.unshift(entry);
    // Cap size
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    await chrome.storage.local.set({ afc_watch_history: history });
    loadHistory();
  } catch {}
}

async function loadHistory() {
  const list = $("#historyList");
  const section = $("#historySection");
  if (!list || !section) return;
  try {
    const data = await chrome.storage.local.get("afc_watch_history");
    const history = data.afc_watch_history || [];
    if (history.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    renderHistory(list, history);
  } catch {
    section.style.display = "none";
  }
}

function renderHistory(container, history) {
  const ICONS = {
    canon: "✅", filler: "⛔", mixed: "⚠️", anime_canon: "🔵", unknown: "❓",
  };
  container.innerHTML = history.map((h, i) => {
    const icon = ICONS[h.type] || ICONS.unknown;
    const typeClass = h.type || "unknown";
    return `
      <div class="history-item">
        <div class="history-type ${typeClass}">${icon}</div>
        <div class="history-info">
          <div class="history-name">${esc(h.name)}</div>
          <div class="history-ep">EP ${h.episode}${h.epTitle ? " — " + esc(h.epTitle) : ""}</div>
        </div>
        <div class="history-time">${timeAgo(h.ts)}</div>
      </div>
    `;
  }).join("");
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* ═══════════════════════════════════════════════════════════════
 *  REPORT A BUG — Formspree
 * ═══════════════════════════════════════════════════════════════ */
document.getElementById("bugForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#bugSubmit");
  const msgEl = $("#bugMsg");
  const message = $("#bugMessage").value.trim();
  if (!message) return;

  btn.disabled = true;
  btn.textContent = "Sending…";
  msgEl.className = "bug-msg";
  msgEl.textContent = "";

  // Gather context automatically
  const detectedInfo = detected?.animeName ? `${detected.animeName} EP ${detected.episode}` : "N/A";
  const ua = navigator.userAgent;

  // Get the current tab URL
  let siteUrl = "N/A";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) siteUrl = tab.url;
  } catch {}

  try {
    const res = await fetch("https://formspree.io/f/mbdzevrq", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        message,
        email: $("#bugEmail").value.trim() || "(not provided)",
        site_url: siteUrl,
        detected_anime: detectedInfo,
        browser: ua,
        extension_version: `v${chrome.runtime.getManifest().version}`,
      }),
    });
    if (res.ok) {
      msgEl.className = "bug-msg success";
      msgEl.textContent = "✅ Thanks! We'll look into it.";
      $("#bugMessage").value = "";
      $("#bugEmail").value = "";
    } else {
      throw new Error("Send failed");
    }
  } catch {
    msgEl.className = "bug-msg error";
    msgEl.textContent = "Failed to send. Try again later.";
  }
  btn.disabled = false;
  btn.textContent = "Send Report";
});
