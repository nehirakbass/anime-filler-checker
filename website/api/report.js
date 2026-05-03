const GITHUB_OWNER = 'nehirakbass';
const GITHUB_REPO = 'anime-filler-checker';
const GITHUB_API = 'https://api.github.com';

// In-memory IP rate limit: max 3 requests per IP per 10 minutes
// (best-effort on serverless — catches casual spam within the same instance)
const ipCache = new Map();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipCache.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_WINDOW_MS;
  } else {
    entry.count += 1;
  }
  ipCache.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

async function findExistingIssue(token, title) {
  const q = encodeURIComponent(
    `repo:${GITHUB_OWNER}/${GITHUB_REPO} is:issue is:open "${title}" in:title`
  );
  try {
    const res = await fetch(`${GITHUB_API}/search/issues?q=${q}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.total_count > 0;
  } catch {
    return false;
  }
}

async function createIssue(token, title, body) {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body }),
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // IP rate limiting
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a while.' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server misconfigured' });

  const { message, email, site_url, detected_anime, browser, extension_version, name } =
    req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isSiteReport = message.startsWith('[SITE REPORT]');
  const isExtensionReport = !!extension_version;

  // Build issue title
  let issueTitle;
  if (isSiteReport) {
    let host = 'unknown site';
    try { host = new URL(site_url).hostname; } catch {}
    issueTitle = `[Site Report] Doesn't work on ${host}`;
  } else if (isExtensionReport) {
    issueTitle = `[Bug Report] ${detected_anime || 'N/A'} — ${extension_version}`;
  } else {
    issueTitle = `[Contact] Message from ${name || email || 'visitor'}`;
  }

  // Deduplication: skip if an open issue with the same title already exists
  if (isSiteReport || isExtensionReport) {
    const duplicate = await findExistingIssue(token, issueTitle);
    if (duplicate) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
  }

  // Build issue body
  const bodyLines = [
    message ? `**Message:** ${message}` : null,
    email ? `**Email:** ${email}` : null,
    name ? `**Name:** ${name}` : null,
    site_url ? `**Site URL:** ${site_url}` : null,
    detected_anime ? `**Detected:** ${detected_anime}` : null,
    extension_version ? `**Version:** ${extension_version}` : null,
    browser ? `**Browser:** ${browser}` : null,
  ].filter(Boolean).join('\n\n');

  const ok = await createIssue(token, issueTitle, bodyLines);
  if (!ok) return res.status(500).json({ error: 'Failed to create issue' });

  return res.status(200).json({ ok: true });
}
