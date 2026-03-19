import { useState, useEffect, useCallback } from 'react'

const SCENES = [
  {
    name: 'Naruto Shippuden',
    episode: 176,
    url: 'youranimestreamsite.com/watch/naruto-shippuden/ep-176',
    verdict: 'FILLER',
    verdictClass: 'filler',
    verdictIcon: '⛔',
    title: 'Rookie Instructor Iruka',
    score: 6.82,
    desc: 'Not part of the original manga storyline.',
  },
  {
    name: 'One Piece',
    episode: 51,
    url: 'youranimestreamsite.com/watch/one-piece/ep-51',
    verdict: 'ANIME CANON',
    verdictClass: 'anime-canon',
    verdictIcon: '🔵',
    title: 'Fiery Cooking Battle? Sanji vs. the…',
    score: 7.09,
    desc: 'Anime-original content, but part of the story.',
  },
  {
    name: 'Bleach',
    episode: 33,
    url: 'youranimestreamsite.com/watch/bleach/ep-33',
    verdict: 'CANON',
    verdictClass: 'canon',
    verdictIcon: '✅',
    title: 'Miracle! The Mysterious New Hero',
    score: 7.44,
    desc: 'Follows the original manga storyline.',
  },
  {
    name: 'Dragon Ball Z',
    episode: 125,
    url: 'youranimestreamsite.com/watch/dragon-ball-z/ep-125',
    verdict: 'MIXED',
    verdictClass: 'mixed',
    verdictIcon: '⚠️',
    title: 'Fight Android 19! Goku, Show the…',
    score: 7.61,
    desc: 'Mix of canon and filler content.',
  },
]

// Animation phases: idle → typing → loading → detecting → result → hold → fade
const PHASES = ['typing', 'loading', 'detecting', 'result', 'hold']
const PHASE_DURATIONS = [1400, 800, 1200, 600, 3000]

export default function InteractiveDemo() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const [phase, setPhase] = useState('typing')
  const [typedChars, setTypedChars] = useState(0)
  const [fading, setFading] = useState(false)

  const scene = SCENES[sceneIndex]

  const nextScene = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length)
      setTypedChars(0)
      setPhase('typing')
      setFading(false)
    }, 400)
  }, [])

  // Phase progression
  useEffect(() => {
    if (phase === 'typing') {
      // Type URL character by character
      if (typedChars < scene.url.length) {
        const speed = 25 + Math.random() * 35
        const t = setTimeout(() => setTypedChars((c) => c + 1), speed)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('loading'), 300)
        return () => clearTimeout(t)
      }
    }

    const idx = PHASES.indexOf(phase)
    if (idx < 0 || phase === 'typing') return

    if (phase === 'hold') {
      const t = setTimeout(nextScene, PHASE_DURATIONS[idx])
      return () => clearTimeout(t)
    }

    const nextPhase = PHASES[idx + 1]
    if (nextPhase) {
      const t = setTimeout(() => setPhase(nextPhase), PHASE_DURATIONS[idx])
      return () => clearTimeout(t)
    }
  }, [phase, typedChars, scene.url.length, nextScene])

  const showSite = phase !== 'typing'
  const showScanning = phase === 'detecting' || phase === 'result' || phase === 'hold'
  const showBadge = phase === 'result' || phase === 'hold'

  // Step indicator
  const currentStep = phase === 'typing' ? 1 : (phase === 'loading' ? 1 : (phase === 'detecting' ? 2 : 3))

  return (
    <div className={`browser-demo ${fading ? 'browser-demo-fade' : ''}`}>
      {/* Step indicators */}
      <div className="browser-steps">
        <div className={`browser-step ${currentStep >= 1 ? 'active' : ''} ${currentStep === 1 ? 'current' : ''}`}>
          <span className="browser-step-num">1</span>
          <span>Visit any anime site</span>
        </div>
        <div className="browser-step-line" />
        <div className={`browser-step ${currentStep >= 2 ? 'active' : ''} ${currentStep === 2 ? 'current' : ''}`}>
          <span className="browser-step-num">2</span>
          <span>Extension auto-detects</span>
        </div>
        <div className="browser-step-line" />
        <div className={`browser-step ${currentStep >= 3 ? 'active' : ''} ${currentStep === 3 ? 'current' : ''}`}>
          <span className="browser-step-num">3</span>
          <span>See the verdict</span>
        </div>
      </div>

      {/* Mock browser */}
      <div className="browser-chrome">
        {/* Title bar */}
        <div className="browser-titlebar">
          <div className="browser-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="browser-tabs">
            <div className="browser-tab active">
              <span className="browser-tab-icon">🎬</span>
              <span className="browser-tab-title">
                {showSite ? `${scene.name} EP ${scene.episode}` : 'New Tab'}
              </span>
            </div>
          </div>
        </div>

        {/* Address bar */}
        <div className="browser-addressbar">
          <div className="browser-url-bar">
            <span className="browser-lock">🔒</span>
            <span className="browser-url">
              {scene.url.slice(0, typedChars)}
              {phase === 'typing' && <span className="browser-cursor">|</span>}
            </span>
          </div>
          {showScanning && (
            <div className="browser-ext-icon">
              <img src="/icon48.png" alt="" width="18" height="18" />
            </div>
          )}
        </div>

        {/* Page content */}
        <div className="browser-page">
          {!showSite && (
            <div className="browser-blank">
              <div className="browser-blank-text">Navigate to an anime site…</div>
            </div>
          )}

          {showSite && (
            <div className="browser-site">
              {/* Mock site header */}
              <div className="mock-site-nav">
                <span className="mock-site-logo">YourAnimeSite</span>
                <div className="mock-site-links">
                  <span>Home</span><span>Genre</span><span>Movies</span>
                </div>
              </div>

              {/* Mock video player area */}
              <div className="mock-player">
                <div className="mock-player-inner">
                  <div className="mock-play-btn">▶</div>
                  <div className="mock-player-title">{scene.name} — Episode {scene.episode}</div>
                </div>
                <div className="mock-player-bar">
                  <div className="mock-player-progress" />
                </div>
              </div>

              {/* Episode title bar */}
              <div className="mock-ep-bar">
                <span className="mock-ep-title">{scene.title}</span>
              </div>

              {/* Scanning indicator */}
              {phase === 'detecting' && (
                <div className="browser-scanning">
                  <div className="scanning-pulse" />
                  <img src="/icon48.png" alt="" width="16" height="16" />
                  <span>Detecting episode…</span>
                </div>
              )}

              {/* Floating badge */}
              {showBadge && (
                <div className={`browser-badge ${scene.verdictClass}`}>
                  <span className="browser-badge-icon">{scene.verdictIcon}</span>
                  <div className="browser-badge-info">
                    <div className="browser-badge-verdict">EP {scene.episode} — {scene.verdict}</div>
                    <div className="browser-badge-anime">{scene.name} · {scene.title}</div>
                  </div>
                  <span className="browser-badge-score">★ {scene.score}</span>
                </div>
              )}
            </div>
          )}

          {/* Loading bar */}
          {phase === 'loading' && <div className="browser-loading-bar" />}
        </div>
      </div>

      {/* Scene selector */}
      <div className="demo-selector">
        {SCENES.map((s, i) => (
          <button
            key={s.name}
            className={`demo-selector-btn ${i === sceneIndex ? 'active' : ''}`}
            onClick={() => {
              if (i === sceneIndex) return
              setFading(true)
              setTimeout(() => {
                setSceneIndex(i)
                setTypedChars(0)
                setPhase('typing')
                setFading(false)
              }, 400)
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
