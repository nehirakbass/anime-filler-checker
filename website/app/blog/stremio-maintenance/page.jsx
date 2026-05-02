import Link from 'next/link'

export const metadata = {
  title: 'Stremio Addon — Temporary Maintenance | Anime Filler Checker',
  description: 'The Anime Filler Checker Stremio addon is temporarily under maintenance while we improve caching and performance. Read what changed and when it\'ll be back.',
  alternates: { canonical: 'https://animefillerchecker.com/blog/stremio-maintenance' },
}

export default function StremioMaintenance() {
  return (
    <>
      <nav>
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <img src="/icon48.png" alt="Anime Filler Checker" />
            <span>Anime Filler Checker</span>
          </Link>
        </div>
      </nav>

      <div className="privacy-content">
        <h1>Stremio Addon — Temporary Maintenance</h1>
        <p className="subtitle">May 2, 2026</p>

        <h2>What's happening?</h2>
        <p>
          The Anime Filler Checker Stremio addon is temporarily in maintenance mode.
          During this time, the addon will show a <strong>🚧 MAINTENANCE</strong> message
          in the stream list instead of filler status badges.
        </p>

        <h2>Why?</h2>
        <p>
          We noticed the addon was receiving a very high volume of requests — including tens of
          thousands of requests for non-anime titles like <em>Game of Thrones</em>, <em>Invincible</em>,
          <em>The Boys</em>, and others that aren't in the AnimeFillerList database.
        </p>
        <p>
          Each of these requests was hitting our servers and making unnecessary external API calls,
          causing performance and cost issues. We needed to pause the addon briefly while we put
          the right infrastructure in place.
        </p>

        <h2>What we're fixing</h2>
        <ul>
          <li>
            <strong>Upstash Redis KV cache</strong> — persistent caching that survives serverless
            cold starts. Anime filler data is now cached for up to 14 days, so repeat requests
            for the same show are served instantly without hitting AnimeFillerList.com again.
          </li>
          <li>
            <strong>Negative caching</strong> — non-anime titles (like western TV shows) are now
            cached as "not found" for 6 hours, so we never make repeated API calls for shows that
            will never be in our database.
          </li>
          <li>
            <strong>Edge caching</strong> — Vercel's CDN now caches stream and subtitle responses
            at the edge, so the same episode request from different users only invokes the function once.
          </li>
          <li>
            <strong>Maintenance short-circuit</strong> — during maintenance, requests are intercepted
            before reaching the router, keeping server load near zero.
          </li>
        </ul>

        <h2>When will it be back?</h2>
        <p>
          We're aiming to re-enable the addon very shortly — once we've confirmed the caching layer
          is working correctly and the Upstash Redis environment variables are properly configured on
          the deployment. The browser extension is <strong>not affected</strong> and continues to
          work normally.
        </p>

        <h2>Browser extension users</h2>
        <p>
          If you use the <strong>Chrome or Firefox extension</strong>, everything is working as normal.
          The extension fetches filler data directly and is completely independent of the Stremio addon infrastructure.
        </p>

        <p style={{ marginTop: '2rem' }}>
          — <em>Anime Filler Checker team</em>
        </p>
      </div>
    </>
  )
}
