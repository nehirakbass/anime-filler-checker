/**
 * Next.js API Route — Stremio Addon catch-all handler.
 *
 * Next.js ignores the root `api/` directory; API routes must live under
 * `pages/api/` (Pages Router) so Vercel creates a serverless function.
 *
 * NOTE: CommonJS required — stremio-addon-sdk doesn't support ESM.
 */

const { getRouter } = require("stremio-addon-sdk");
const landingTemplate = require("stremio-addon-sdk/src/landingTemplate");
const builder = require("../../../api/stremio/lib/addon");

const addonInterface = builder.getInterface();
const router = getRouter(addonInterface);
const landingHTML = landingTemplate(addonInterface.manifest).replace(
  "</head>",
  `<style>
    input[type="checkbox"] { transform: scale(1.6); margin-right: 0.8vh; }
    .label-to-right { font-size: 1.7vh; }
    .gives, .gives + ul { display: none; }
  </style></head>`
).replaceAll(
  "window.location.host",
  "window.location.host.replace('www.', '') + window.location.pathname.replace(/\\/configure$/, '')"
);

export default function handler(req, res) {
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

  // Serve landing/configure page
  const cleanUrl = req.url.split("?")[0].replace(/\/$/, "");
  if (cleanUrl === "/configure" || cleanUrl === "") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(landingHTML);
    return;
  }

  router(req, res, () => {
    res.statusCode = 404;
    res.end(JSON.stringify({ err: "not found" }));
  });
}
