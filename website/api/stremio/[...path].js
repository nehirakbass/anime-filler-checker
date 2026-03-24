/**
 * Vercel Serverless — Stremio Addon catch-all handler.
 *
 * Handles: /stremio/manifest.json, /stremio/meta/series/..., /stremio/subtitles/series/...
 *
 * NOTE: CommonJS required — stremio-addon-sdk doesn't support ESM.
 */

const { getRouter } = require("stremio-addon-sdk");
const builder = require("./lib/addon");

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // Strip the /stremio prefix so the SDK router sees /manifest.json, /meta/..., etc.
  req.url = req.url.replace(/^\/stremio/, "") || "/";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  router(req, res, () => {
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
};
