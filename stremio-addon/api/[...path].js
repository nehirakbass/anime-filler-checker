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

  router(req, res, () => {
    // Fallback: if no route matched, return 404
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
};
