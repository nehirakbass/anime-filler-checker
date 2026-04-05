/**
 * Generate SVG badge thumbnails for episode filler status.
 * Returns data URIs that Stremio can use as video thumbnails.
 */

const BADGE_COLORS = {
  canon:      { bg: "#0a1a12", accent: "#00e09e", label: "CANON",       icon: "✅" },
  filler:     { bg: "#1a0a0e", accent: "#ff4d6a", label: "FILLER",      icon: "⛔" },
  mixed:      { bg: "#1a150a", accent: "#ffb347", label: "MIXED",       icon: "⚠️" },
  anime_canon:{ bg: "#0a0f1a", accent: "#5ba8ff", label: "ANIME CANON", icon: "🔵" },
  unknown:    { bg: "#12121a", accent: "#6b7190", label: "UNKNOWN",     icon: "❓" },
};

/**
 * Generate an SVG badge for a given episode type.
 * Landscape aspect ratio (~16:9) to match Stremio's video thumbnail area.
 *
 * @param {string} type - Episode type (canon, filler, mixed, anime_canon, unknown)
 * @param {number} [epNum] - Episode number to display
 * @returns {string} SVG string
 */
function generateBadgeSVG(type, epNum) {
  const badge = BADGE_COLORS[type] || BADGE_COLORS.unknown;

  const epText = epNum ? `EP ${epNum}` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${badge.bg};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0b0d12;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="pill" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${badge.accent};stop-opacity:0.25"/>
      <stop offset="100%" style="stop-color:${badge.accent};stop-opacity:0.10"/>
    </linearGradient>
  </defs>
  <rect width="320" height="180" rx="12" fill="url(#bg)"/>
  <rect x="10" y="10" width="300" height="160" rx="8" fill="none" stroke="${badge.accent}" stroke-opacity="0.15" stroke-width="1"/>
  <text x="160" y="65" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" fill="${badge.accent}" font-weight="800" letter-spacing="2">${badge.label}</text>
  <rect x="95" y="80" width="130" height="3" rx="2" fill="${badge.accent}" opacity="0.3"/>
  ${epText ? `<rect x="110" y="100" width="100" height="32" rx="16" fill="url(#pill)" stroke="${badge.accent}" stroke-opacity="0.3" stroke-width="1"/><text x="160" y="122" text-anchor="middle" font-family="monospace" font-size="16" fill="${badge.accent}" font-weight="700">${epText}</text>` : ""}
  <text x="160" y="165" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="${badge.accent}" opacity="0.4">Anime Filler Checker</text>
</svg>`;
}

/**
 * Get a data URI for the badge thumbnail.
 * @param {string} type - Episode type
 * @param {number} [epNum] - Episode number
 * @returns {string} data URI (SVG)
 */
function getBadgeDataURI(type, epNum) {
  const svg = generateBadgeSVG(type, epNum);
  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

module.exports = { generateBadgeSVG, getBadgeDataURI, BADGE_COLORS };
