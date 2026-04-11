const LABELS = {
  canon: "✅ CANON — Manga faithful, safe to watch",
  filler: "⛔ FILLER — Not from the manga, safe to skip",
  mixed: "⚠️ MIXED CANON/FILLER — Contains both canon and filler",
  anime_canon: "🔵 ANIME CANON — Anime-original but plot-relevant",
  unknown: "❓ UNKNOWN — No filler data available",
};

const SHORT_LABELS = {
  canon: "CANON",
  filler: "FILLER",
  mixed: "MIXED",
  anime_canon: "ANIME CANON",
  unknown: "UNKNOWN",
};

function generateSubtitle(episode, options = {}) {
  const { startSec = 2, durationSec = 8, nextCanon = null, hideNextTitle = false } = options;

  const type = episode?.type || "unknown";
  const label = LABELS[type] || LABELS.unknown;

  const startTime = formatSrtTime(startSec);
  const endTime = formatSrtTime(startSec + durationSec);

  let lines = [`[Anime Filler Checker]`, label];

  if (episode?.title) {
    lines.push(`Episode ${episode.number}: ${episode.title}`);
  }

  if (nextCanon && (type === "filler" || type === "mixed")) {
    const skip = nextCanon.number - (episode?.number || 0);
    const ahead = skip === 1 ? "next episode" : `${skip} episodes ahead`;
    const ep = `Ep ${nextCanon.number}`;
    const nextLabel = hideNextTitle
      ? `${ahead} (${ep})`
      : (nextCanon.title ? `${ahead} (${ep}) — ${nextCanon.title}` : `${ahead} (${ep})`);
    lines.push(
      `Next canon: ${nextLabel}`
    );
  }

  return ["1", `${startTime} --> ${endTime}`, lines.join("\n"), "", ""].join(
    "\n"
  );
}

function formatSrtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "," +
    String(ms).padStart(3, "0")
  );
}

module.exports = { generateSubtitle, LABELS, SHORT_LABELS };
