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

document.addEventListener("DOMContentLoaded", async () => {
  const checkBtn  = $("#checkBtn");
  const nameInput = $("#manualName");
  const epInput   = $("#manualEp");
  const toggle    = $("#toggleEnabled");
  const skipSelect = $("#autoSkip");
  const posSelect = $("#badgePosition");

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

  const detectedInfo = detected?.animeName ? `${detected.animeName} EP ${detected.episode}` : "N/A";
  const ua = navigator.userAgent;

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
        extension_version: "v2.3.0",
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
