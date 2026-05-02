/**
 * Vercel Serverless Function — Stremio Addon catch-all handler.
 *
 * Routes all Stremio protocol requests through the addon SDK's router.
 */

const { getRouter } = require("stremio-addon-sdk");
const builder = require("../lib/addon");

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // Set CORS headers (required by Stremio addon protocol)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // CDN / browser caching — lets Vercel edge cache responses so cold starts
  // don't hit upstream APIs on every request.
  const reqPath = req.url || "";
  if (reqPath.includes("/manifest.json")) {
    // Manifest rarely changes; cache for 1 hour at the edge
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  } else if (/\/(stream|subtitles)\//.test(reqPath)) {
    // Episode data: serve fresh for 1 hour, allow stale up to 24 hours while
    // revalidating in the background (stale-while-revalidate).
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    );
  }

  router(req, res, () => {
    // Fallback: if no route matched, return 404
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
};
