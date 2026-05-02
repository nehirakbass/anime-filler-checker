/**
 * KV connectivity + cache chain debug endpoint.
 * GET /stremio/debug         → KV ping test
 * GET /stremio/debug?anime=naruto&ep=1 → full filler lookup test
 * Remove or restrict this endpoint after testing.
 */

const { kvGet, kvSet, kvAvailable } = require("./lib/kvCache");
const { fetchFillerData } = require("./lib/fillerData");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  const url = new URL(req.url, "https://x");
  const animeName = url.searchParams.get("anime");
  const ep = parseInt(url.searchParams.get("ep") || "1", 10);

  // KV ping test
  const available = kvAvailable();
  let writeOk = false;
  let readOk = false;
  let kvError = null;

  if (available) {
    try {
      await kvSet("afc:debug:ping", "pong", 60);
      writeOk = true;
      const val = await kvGet("afc:debug:ping");
      readOk = val === "pong";
    } catch (e) {
      kvError = e.message;
    }
  }

  const result = { available, writeOk, readOk, kvError, ts: Date.now() };

  // Optional: full filler data lookup
  if (animeName) {
    const t0 = Date.now();
    try {
      const data = await fetchFillerData(animeName);
      const elapsed = Date.now() - t0;
      if (data) {
        const epData = data.episodes?.[ep] || null;
        result.lookup = {
          animeName,
          found: true,
          showTitle: data.showTitle,
          source: data.source,
          episode: epData,
          elapsed_ms: elapsed,
        };
      } else {
        result.lookup = { animeName, found: false, elapsed_ms: Date.now() - t0 };
      }
    } catch (e) {
      result.lookup = { animeName, error: e.message };
    }
  }

  res.statusCode = 200;
  res.end(JSON.stringify(result, null, 2));
};
