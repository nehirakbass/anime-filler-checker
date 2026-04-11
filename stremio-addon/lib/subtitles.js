/**
 * Generate SRT subtitle content with a filler/canon notification.
 * Shows a brief badge at the start of the episode.
 */

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

/**
 * Build an SRT subtitle string that displays a filler badge.
 *
 * @param {object} episode - Episode object { number, title, type }
 * @param {object} [options] - Options
 * @param {number} [options.startSec=2] - When to show the subtitle (seconds)
 * @param {number} [options.durationSec=8] - How long to show it (seconds)
 * @param {object} [options.nextCanon] - Next canon episode info
 * @returns {string} SRT formatted subtitle content
 */
function generateSubtitle(episode, options = {}) {
  const { startSec = 2, durationSec = 8, nextCanon = null, hideNextTitle = false } = options;

  const type = episode?.type || "unknown";
  const label = LABELS[type] || LABELS.unknown;
  const shortLabel = SHORT_LABELS[type] || "UNKNOWN";

  const startTime = formatSrtTime(startSec);
  const endTime = formatSrtTime(startSec + durationSec);

  let lines = [`[Anime Filler Checker]`, label];

  if (episode?.title) {
    lines.push(`Episode ${episode.number}: ${episode.title}`);
  }

  if (nextCanon && (type === "filler" || type === "mixed")) {
    const nextLabel = hideNextTitle
      ? `${nextCanon.number}`
      : `${nextCanon.number} — ${nextCanon.title || ""}`;
    lines.push(
      `Next canon episode: ${nextLabel}`
    );
  }

  const srt = [
    "1",
    `${startTime} --> ${endTime}`,
    lines.join("\n"),
    "",
    "",
  ].join("\n");

  return srt;
}

/**
 * Format seconds into SRT time string: HH:MM:SS,mmm
 */
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
