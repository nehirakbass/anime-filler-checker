'use client'

import Link from 'next/link'
import { useState } from 'react'
import InteractiveDemo from '@/components/InteractiveDemo'
import TechDemo from '@/components/TechDemo'

const CHROME_URL = 'https://chromewebstore.google.com/detail/anime-filler-checker/fnlpgfcmglenllblijbciadeldljjebj'
const FIREFOX_URL = 'https://addons.mozilla.org/en-US/firefox/addon/anime-filler-checker/'

export default function HomeClient() {
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
            <span className="toast-icon">{toast.type === 'success' ? 'Ô£ô' : 'Ô£ò'}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav>
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <img src="/icon48.png" alt="Anime Filler Checker" />
            <span>Anime Filler Checker</span>
          </Link>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <h1>
              Skip the Filler,<br />
              <span className="gradient">Watch What Matters</span>
            </h1>
            <p>
              Auto-detects the anime &amp; episode you&apos;re watching and shows a floating badge
              FILLER, CANON, or MIXED  right on the page. No more tab-switching and manual searching.
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
            <h2 className="section-title">Built for how you actually watch</h2>
            <p className="section-sub">Auto-detection, zero setup, no lists to bookmark.</p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-num">01</div>
                <h3>Auto-Detect</h3>
                <p>Reads the anime and episode from the URL, page title, and DOM  no manual input needed.</p>
              </div>
              <div className="feature-card">
                <div className="feature-num">02</div>
                <h3>On-Page Badge</h3>
                <p>A floating FILLER / CANON / MIXED badge appears right on the page. Draggable and dismissible.</p>
              </div>
              <div className="feature-card">
                <div className="feature-num">03</div>
                <h3>MAL Score</h3>
                <p>MyAnimeList rating, member count, and airing status  visible without leaving your tab.</p>
              </div>
              <div className="feature-card">
                <div className="feature-num">04</div>
                <h3>Manual Search</h3>
                <p>Type any anime and episode in the popup when auto-detect can&apos;t pick it up.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="how" id="how-it-works">
          <div className="container">
            <h2 className="section-title">How It Works</h2>
            <p className="section-sub">Here&apos;s what happens under the hood in milliseconds.</p>

            <TechDemo />
          </div>
        </section>

        {/* FAQ */}
        <section className="faq" id="faq">
          <div className="container">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-sub">Everything you need to know about skipping anime filler.</p>

            <div className="faq-grid">
              <div className="faq-item">
                <h3>Does Anime Filler Checker work on Crunchyroll?</h3>
                <p>Yes. The Crunchyroll filler extension detects the anime and episode you&apos;re watching and overlays a badge  FILLER, CANON, or MIXED  directly on the Crunchyroll page. It acts as a Crunchyroll filler labeler so you never have to leave the tab to check.</p>
              </div>

              <div className="faq-item">
                <h3>Does it work on 9anime and other streaming sites?</h3>
                <p>Yes  the extension works on any anime streaming site including 9anime, GogoAnime, Zoro, and more. It reads the episode from the URL and page title, so it adapts to whatever site you watch on.</p>
              </div>

              <div className="faq-item">
                <h3>Which Naruto episodes are filler?</h3>
                <p>Naruto has a notoriously high filler rate  around 41% of episodes. With Anime Filler Checker installed, each Naruto episode is automatically labeled when you open it. You can also open the popup to look up any episode in the Naruto filler list manually.</p>
              </div>

              <div className="faq-item">
                <h3>What is a filler episode in anime?</h3>
                <p>A filler episode is one not based on the original manga. Studios produce them to avoid overtaking the source material. Filler episodes don&apos;t advance the main story and can generally be skipped  though some are worth watching for character moments.</p>
              </div>

              <div className="faq-item">
                <h3>How do I know if an episode is filler without Googling it?</h3>
                <p>That&apos;s exactly what Anime Filler Checker solves. Once installed, it auto-detects the episode and shows its status on-screen  no tab-switching, no spoiler risk from search results. It&apos;s a live filler detector built into your browser.</p>
              </div>

              <div className="faq-item">
                <h3>Does it support One Piece and Bleach?</h3>
                <p>Yes. One Piece filler episodes and Bleach filler arcs are fully supported. Both series have large filler stretches, so the badge is especially useful there. In total, 500+ anime are supported including Dragon Ball Z, Boruto, Black Clover, and Fairy Tail.</p>
              </div>

              <div className="faq-item">
                <h3>Is the extension safe to install?</h3>
                <p>Yes. Anime Filler Checker is fully open source you can read every line of code on <a href="https://github.com/nehirakbass/anime-filler-checker" target="_blank" rel="noopener">GitHub</a>. It requests no personal data, collects no analytics, and has no ads. It&apos;s listed on the Chrome Web Store and Firefox Add-ons.</p>
              </div>

              <div className="faq-item">
                <h3>Can I use it without installing a browser extension?</h3>
                <p>Currently no, but the extension is free and easy to install and you dont need to create an account. For the future there is a stremio addon in the works. Stay tuned!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sponsor + Contact */}
        <section className="bottom-section">
          <div className="container">
            <div className="bottom-grid">

              {/* Left: Sponsor + Contribute */}
              <div className="bottom-left">
                <div className="sponsor-col">
                  <p className="sponsor-eyebrow">Free to use &amp; ad-free</p>
                  <h2>Kept alive by one person.<br />Supported by people like you.</h2>
                  <p>If this extension has ever saved you from sitting through a Naruto flashback arc, consider sponsoring.</p>
                  <a href="https://github.com/sponsors/nehirakbass" className="btn-primary sponsor-btn" target="_blank" rel="noopener">
                    Support the project
                  </a>
                </div>

                <div className="bottom-left-divider" />

                <div className="sponsor-col">
                  <p className="sponsor-eyebrow">Open source</p>
                  <h2>Want to contribute?</h2>
                  <p>Have a feature in mind or found a bug? The repo is open  PRs and issues are always welcome.</p>
                  <a href="https://github.com/nehirakbass/anime-filler-checker" className="btn-secondary" target="_blank" rel="noopener">
                    <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" width="16" height="16" /> View on GitHub
                  </a>
                </div>
              </div>

              <div className="bottom-divider" />

              {/* Contact */}
              <div className="contact-col">
                <p className="contact-eyebrow">Contact</p>
                <h2>Say something</h2>
                <p>Bug report, feature idea, or just a message  all welcome.</p>

                <form className="contact-form" onSubmit={async (e) => {
                  e.preventDefault()
                  const btn = e.target.querySelector('button')
                  const originalText = btn.textContent
                  btn.disabled = true
                  btn.textContent = 'Sending...'

                  try {
                    const res = await fetch('https://formspree.io/f/xaqlykwb', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                    })

                    if (res.ok) {
                      showToast('Message sent! Thanks for reaching out.')
                      e.target.reset()
                    } else {
                      throw new Error('Failed')
                    }
                  } catch {
                    showToast('Something went wrong. Try again?', 'error')
                  } finally {
                    btn.disabled = false
                    btn.textContent = originalText
                  }
                }}>
                  <div className="contact-row">
                    <div className="contact-field">
                      <label className="contact-label">Name</label>
                      <input type="text" name="name" placeholder="Your name" required className="contact-input" />
                    </div>
                    <div className="contact-field">
                      <label className="contact-label">Email</label>
                      <input type="email" name="email" placeholder="your@email.com" required className="contact-input" />
                    </div>
                  </div>
                  <div className="contact-field">
                    <label className="contact-label">Message</label>
                    <textarea name="message" placeholder="What&apos;s on your mind?" required className="contact-input contact-textarea" rows={4} />
                  </div>
                  <button type="submit" className="btn-primary send-btn" style={{ alignSelf: 'flex-start' }}>Send it <span className="send-arrow">ÔåÆ</span></button>
                </form>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
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
            <a href="https://nehirakbas.com" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Nehir Akba┼ş</a>
          </div>
        </div>
      </footer>
    </>
  )
}
