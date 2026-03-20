import { Link } from 'react-router-dom'
import { useState } from 'react'
import InteractiveDemo from '../components/InteractiveDemo'
import TechDemo from '../components/TechDemo'

const CHROME_URL = 'https://chromewebstore.google.com/detail/anime-filler-checker/TBD'
const FIREFOX_URL = 'https://addons.mozilla.org/en-US/firefox/addon/anime-filler-checker/'

export default function Home() {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <>
      <div className="glow-1" />
      <div className="glow-2" />
      <div className="glow-3" />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav>
        <div className="nav-inner">
          <Link to="/" className="nav-brand">
            <img src="/icon48.png" alt="Anime Filler Checker" />
            <span>Anime Filler Checker</span>
          </Link>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><a href="#install" className="nav-cta">Install Free</a></li>
          </ul>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <div className="hero-badge">✨ Fully Open Source · Works on Any Platform</div>
            <h1>
              Skip the Filler,<br />
              <span className="gradient">Watch What Matters</span>
            </h1>
            <p>
              Auto-detects the anime &amp; episode you're watching and shows a floating badge
              — FILLER, CANON, or MIXED — right on the page. No more tab-switching.
              <br /><strong style={{ color: 'var(--text)' }}>Fully open source.</strong> Works on any streaming platform.
            </p>
            <div className="hero-buttons" id="install">
              <a href={CHROME_URL} className="btn-primary">
                <img src="https://cdn.simpleicons.org/googlechrome/white" alt="Chrome" width="20" height="20" />
                Add to Chrome
              </a>
              <a href={FIREFOX_URL} className="btn-primary btn-firefox">
                <img src="https://cdn.simpleicons.org/firefoxbrowser/white" alt="Firefox" width="20" height="20" />
                Add to Firefox
              </a>
              <a href="https://github.com/nehirakbass/anime-filler-checker" className="btn-secondary" target="_blank" rel="noopener">
                <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" width="18" height="18" /> View on GitHub
              </a>
            </div>

            {/* Interactive Demo */}
            <InteractiveDemo />
          </div>
        </section>

        {/* Features */}
        <section className="features" id="features">
          <div className="container">
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-sub">One extension to never sit through filler again.</p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Auto-Detect</h3>
                <p>Detects anime name and episode number from the URL, page title, and DOM — no manual input needed.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏷️</div>
                <h3>On-Page Badge</h3>
                <p>A floating badge appears instantly on the page. Draggable, dismissible, and beautifully themed per verdict.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⭐</div>
                <h3>MAL Score</h3>
                <p>See MyAnimeList rating, member count, and airing status without leaving the page.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔎</div>
                <h3>Manual Search</h3>
                <p>Type any anime name and episode in the popup for a quick manual lookup.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="how" id="how-it-works">
          <div className="container">
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">Here's what happens under the hood in milliseconds.</p>

            <TechDemo />
          </div>
        </section>

        {/* CTA */}
        <section className="cta">
          <div className="container">
            <div className="cta-box">
              <h2>Stop Watching Filler</h2>
              <p>Get notified when the extension launches on Chrome &amp; Firefox.</p>
              
              {/* Waitlist Form */}
              <form className="waitlist-form" onSubmit={async (e) => {
                e.preventDefault()
                const email = e.target.email.value
                if (!email) return
                
                const btn = e.target.querySelector('button')
                const originalText = btn.textContent
                btn.disabled = true
                btn.textContent = 'Joining...'
                
                try {
                  const res = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                  })
                  
                  if (res.ok) {
                    showToast('Thanks! We\'ll notify you when we launch 🚀')
                    e.target.reset()
                  } else {
                    throw new Error('Failed')
                  }
                } catch (err) {
                  showToast('Something went wrong. Try again?', 'error')
                } finally {
                  btn.disabled = false
                  btn.textContent = originalText
                }
              }}>
                <input 
                  type="email" 
                  name="email"
                  placeholder="your@email.com" 
                  required 
                  className="waitlist-input"
                />
                <button type="submit" className="btn-primary waitlist-btn">
                  Join Waitlist
                </button>
              </form>

              <div className="cta-buttons" style={{ marginTop: '20px' }}>
                <a href="https://github.com/nehirakbass/anime-filler-checker" className="btn-secondary" target="_blank" rel="noopener">
                  <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" width="18" height="18" /> View on GitHub
                </a>
              </div>
              <p className="cta-note">Free &amp; open source — no ads, no tracking, no signup.</p>
            </div>
          </div>
        </section>

        {/* Sponsor */}
        <section className="sponsor-section">
          <div className="container">
            <div className="sponsor-box">
              <span className="sponsor-heart">💖</span>
              <h2>Support the Project</h2>
              <p>If you enjoy Anime Filler Checker, consider sponsoring to keep it free &amp; ad-free for everyone.</p>
              <a href="https://github.com/sponsors/nehirakbass" className="btn-primary sponsor-btn" target="_blank" rel="noopener">
                💖 Become a Sponsor
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-links">
            <Link to="/privacy">Privacy Policy</Link>
            <a href="https://github.com/nehirakbass/anime-filler-checker" target="_blank" rel="noopener">GitHub</a>
            <a href={CHROME_URL}>Chrome Web Store</a>
            <a href={FIREFOX_URL}>Firefox Add-ons</a>
          </div>
          <div className="footer-copy" style={{ marginTop: '12px' }}>
            Powered by the great community at{' '}
            <a href="https://www.animefillerlist.com" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>AnimeFillerList.com</a>
            {' '}&amp;{' '}
            <a href="https://jikan.moe" target="_blank" style={{ color: 'var(--text2)' }}>Jikan API</a>.
          </div>
          <div className="footer-copy" style={{ marginTop: '8px' }}>
            Built by{' '}
            <a href="https://nehirakbas.com" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Nehir Akbaş</a>
          </div>
        </div>
      </footer>
    </>
  )
}
