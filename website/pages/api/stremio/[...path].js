/**
 * Next.js API Route — Stremio Addon catch-all handler.
 *
 * Next.js ignores the root `api/` directory; API routes must live under
 * `pages/api/` (Pages Router) so Vercel creates a serverless function.
 *
 * NOTE: CommonJS required — stremio-addon-sdk doesn't support ESM.
 */

const { getRouter } = require("stremio-addon-sdk");
const builder = require("../../../api/stremio/lib/addon");

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);

module.exports = (req, res) => {
  // Next.js catch-all gives us the path segments via req.query.path
  // e.g. ["manifest.json"] or ["meta", "series", "tt0409591.json"]
  const pathSegments = req.query.path || [];
  req.url = "/" + pathSegments.join("/");

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
