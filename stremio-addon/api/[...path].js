/**
 * Vercel Serverless Function — Stremio Addon catch-all handler.
 *
 * Routes all Stremio protocol requests through the addon SDK's router.
 */

const { getRouter } = require("stremio-addon-sdk");
const builder = require("../lib/addon");

const MAINTENANCE_STREAM = JSON.stringify({
  streams: [{
    name: "🚧 MAINTENANCE",
    description: "Anime Filler Checker is temporarily under maintenance.\nPlease check back soon \u2014 animefillerchecker.com",
    externalUrl: "https://animefillerchecker.com",
  }],
});
const MAINTENANCE_SUBTITLES = JSON.stringify({ subtitles: [] });

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

  const reqPath = req.url || "";

  // Maintenance mode: intercept early, serve cached static response
  if (builder.MAINTENANCE_MODE && /\/(stream|subtitles)\//.test(reqPath)) {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(reqPath.includes("/subtitles/") ? MAINTENANCE_SUBTITLES : MAINTENANCE_STREAM);
    return;
  }

  // CDN caching
  if (reqPath.includes("/manifest.json")) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  } else if (/\/(stream|subtitles)\//.test(reqPath)) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  }

  router(req, res, () => {
    // Fallback: if no route matched, return 404
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
};
