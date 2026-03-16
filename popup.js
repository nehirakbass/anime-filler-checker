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

  // Load toggle state (default: enabled)
  try {
    const data = await chrome.storage.local.get("afc_enabled");
    toggle.checked = data.afc_enabled !== false;
  } catch {}

  // Save toggle state on change
  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ afc_enabled: toggle.checked });
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

  $("#results").innerHTML = `
    <div class="result-card">
      <div class="result-top">
        <div class="result-icon-box ${type}">${v.icon}</div>
        <div class="result-info">
          <div class="result-show" title="${esc(data.showTitle)}">${esc(data.showTitle)}</div>
          <div class="result-ep">Episode ${data.queriedEpisode}${ep?.title ? " — " + esc(ep.title) : ""}</div>
        </div>
      </div>
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
  return d.innerHTML;
}
