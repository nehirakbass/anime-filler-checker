/**
 * Anime Filler Checker — Stremio Addon (Local Server)
 *
 * For local development: `node index.js`
 * For Vercel: see api/addon.js
 */

const { serveHTTP } = require("stremio-addon-sdk");
const builder = require("./lib/addon");

const PORT = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: PORT });

console.log(`
╔═══════════════════════════════════════════════════════╗
║         Anime Filler Checker — Stremio Addon          ║
╠═══════════════════════════════════════════════════════╣
║  Running at: http://localhost:${PORT}                    ║
║  Manifest:   http://localhost:${PORT}/manifest.json      ║
║                                                       ║
║  Install in Stremio:                                  ║
║  http://localhost:${PORT}/manifest.json                  ║
║                                                       ║
║  Features:                                            ║
║  • Episode descriptions show filler/canon status      ║
║  • Subtitle track with filler badge notification      ║
║  • Filler statistics per show                         ║
║  • MAL scores and metadata                            ║
╚═══════════════════════════════════════════════════════╝
`);
