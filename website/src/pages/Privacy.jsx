import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <>
      <nav>
        <div className="nav-inner">
          <Link to="/" className="nav-brand">
            <img src="/icon48.png" alt="Anime Filler Checker" />
            <span>Anime Filler Checker</span>
          </Link>
        </div>
      </nav>

      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p className="subtitle">Last updated: March 2026</p>

        <h2>Overview</h2>
        <p>
          Anime Filler Checker is a browser extension that detects anime episode information from web
          pages and checks if episodes are filler using publicly available data from AnimeFillerList.com.
        </p>

        <h2>Data Collection</h2>
        <p>This extension does <strong>NOT</strong> collect, store, transmit, or sell any personal data.</p>
        <p>Specifically, we do NOT collect:</p>
        <ul>
          <li>Browsing history</li>
          <li>Personal information</li>
          <li>Account credentials</li>
          <li>IP addresses</li>
          <li>Usage analytics or telemetry</li>
          <li>Any form of user tracking</li>
        </ul>

        <h2>Data Storage</h2>
        <p>The only data stored locally on your device is:</p>
        <ul>
          <li>
            <strong>Filler list cache</strong>: Episode data fetched from AnimeFillerList.com is cached
            locally in your browser's storage for 14 days to improve performance. This cache contains only
            publicly available anime episode classifications (canon/filler/mixed). No personal data is included.
          </li>
          <li>
            <strong>MAL score cache</strong>: Anime score and info fetched from the Jikan API (MyAnimeList)
            is cached locally for 5 days. This contains only publicly available data (score, member count,
            airing status).
          </li>
        </ul>
        <p>This cached data:</p>
        <ul>
          <li>Is stored only on your local device using <code>storage.local</code> API</li>
          <li>Is never transmitted to any server</li>
          <li>Can be cleared at any time by removing the extension</li>
          <li>Contains no personal or identifying information</li>
        </ul>

        <h2>Network Requests</h2>
        <p>The extension makes network requests only to:</p>
        <ul>
          <li><code>https://www.animefillerlist.com</code> — To fetch publicly available anime filler/canon episode data</li>
          <li><code>https://api.jikan.moe</code> — To fetch anime scores, member counts, and airing status from MyAnimeList (via the public Jikan API)</li>
        </ul>
        <p>
          No other network requests are made. No data is sent to any analytics service, advertising network,
          or third-party server.
        </p>

        <h2>Permissions</h2>
        <ul>
          <li><strong>activeTab</strong>: Used to read the current page's DOM and URL to detect the anime name and episode number being watched. No page content is stored or transmitted.</li>
          <li><strong>storage</strong>: Used to cache anime filler data locally for faster subsequent lookups.</li>
          <li><strong>host_permissions (animefillerlist.com)</strong>: Required to fetch episode data from AnimeFillerList.com.</li>
          <li><strong>host_permissions (api.jikan.moe)</strong>: Required to fetch anime scores and info from MyAnimeList via the Jikan API.</li>
        </ul>

        <h2>Third-Party Services</h2>
        <ul>
          <li>
            <a href="https://www.animefillerlist.com" target="_blank" rel="noopener">AnimeFillerList.com</a> — Filler/canon episode data. We are not affiliated with AnimeFillerList.com.
          </li>
          <li>
            <a href="https://jikan.moe" target="_blank" rel="noopener">Jikan API</a> — Public REST API for MyAnimeList data. We are not affiliated with Jikan or MyAnimeList.
          </li>
        </ul>

        <h2>Changes</h2>
        <p>If this privacy policy changes, the updated version will be published alongside the extension update.</p>

        <h2>Contact</h2>
        <p>
          For questions about this privacy policy, please open an issue on the{' '}
          <a href="https://github.com/nehirakbass/anime-filler-checker" target="_blank" rel="noopener">GitHub repository</a>
          {' '}or visit{' '}
          <a href="https://nehirakbas.com" target="_blank" rel="noopener">nehirakbas.com</a>.
        </p>
      </div>
    </>
  )
}
