/**
 * KV connectivity debug endpoint.
 * GET /stremio/debug → tests KV read/write and returns status.
 * Remove or restrict this endpoint after testing.
 */

const { kvGet, kvSet, kvAvailable } = require("./lib/kvCache");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const available = kvAvailable();
  let writeOk = false;
  let readOk = false;
  let error = null;

  if (available) {
    try {
      await kvSet("afc:debug:ping", "pong", 60);
      writeOk = true;
      const val = await kvGet("afc:debug:ping");
      readOk = val === "pong";
    } catch (e) {
      error = e.message;
    }
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 200;
  res.end(JSON.stringify({ available, writeOk, readOk, error, ts: Date.now() }, null, 2));
};
