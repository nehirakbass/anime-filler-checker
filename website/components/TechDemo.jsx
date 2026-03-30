'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const PIPELINE = [
  {
    step: 1,
    label: 'URL Analysis',
    icon: '🔗',
    lines: [
      { type: 'comment', text: '// Parsing current page URL…' },
      { type: 'code', text: 'url = "youranimestreamsite.com/watch/', highlight: 'naruto-shippuden/ep-176', after: '"' },
      { type: 'result', text: '→ pattern matched: /{show}/ep-{num}' },
      { type: 'extract', text: '→ anime: "naruto shippuden"  episode: 176' },
    ],
    duration: 3200,
  },
  {
    step: 2,
    label: 'Page Title Scan',
    icon: '📄',
    lines: [
      { type: 'comment', text: '// Reading <title> tag…' },
      { type: 'code', text: 'document.title = "Watch ', highlight: 'Naruto Shippuden Episode 176', after: ' — YourAnimeSite"' },
      { type: 'result', text: '→ regex match: /(.+?)\\s*(?:episode|ep)\\s*(\\d+)/i' },
      { type: 'extract', text: '→ confirmed: "Naruto Shippuden" EP 176 ✓' },
    ],
    duration: 3000,
  },
  {
    step: 3,
    label: 'DOM Deep Search',
    icon: '🔎',
    tooltip: 'DOM (Document Object Model) is the structured representation of a web page that allows scripts to read and change the content, structure, and style of the page.',
    lines: [
      { type: 'comment', text: '// Searching page source for episode data…' },
      { type: 'code', text: 'querySelector(".ep-title") → "', highlight: 'Rookie Instructor Iruka', after: '"' },
      { type: 'code', text: 'querySelector(".ep-number") → "', highlight: 'Episode 176', after: '"' },
      { type: 'extract', text: '→ episode title: "Rookie Instructor Iruka"' },
    ],
    duration: 2800,
  },
  {
    step: 4,
    label: 'AnimeFillerList Lookup',
    icon: '🌐',
    lines: [
      { type: 'comment', text: '// Fetching filler data from AnimeFillerList…' },
      { type: 'fetch', text: 'GET animefillerlist.com/shows/naruto-shippuden' },
      { type: 'response', text: '← 200 OK · parsing episode list…' },
      { type: 'result', text: '→ EP 176 found in filler range [136-219]' },
    ],
    duration: 3200,
  },
  {
    step: 5,
    label: 'Verdict',
    icon: '🏷️',
    lines: [
      { type: 'comment', text: '// Rendering floating badge…' },
      { type: 'verdict', text: '⛔ FILLER', sub: 'Naruto Shippuden · EP 176 · "Rookie Instructor Iruka"' },
      { type: 'skip', text: '→ auto-skip: next canon EP → 220 ⏭️' },
    ],
    duration: 4000,
  },
]

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!show) return
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [show])

  return (
    <span className="info-tooltip-wrap" ref={ref}>
      <button
        className="info-tooltip-btn"
        onClick={(e) => { e.stopPropagation(); setShow((s) => !s) }}
        aria-label="Info"
      >ⓘ</button>
      {show && <span className="info-tooltip-bubble">{text}</span>}
    </span>
  )
}

export default function TechDemo() {
  const [activeStep, setActiveStep] = useState(0)
  const [visibleLines, setVisibleLines] = useState(0)
  const [completed, setCompleted] = useState([])
  const [paused, setPaused] = useState(false)

  const totalSteps = PIPELINE.length

  const goToStep = useCallback((index) => {
    setPaused(false)
    setActiveStep(index)
    setVisibleLines(0)
    setCompleted(Array.from({ length: index }, (_, i) => i))
  }, [])

  const advanceStep = useCallback(() => {
    if (paused) return
    setCompleted((prev) => [...prev, activeStep])
    if (activeStep < totalSteps - 1) {
      setActiveStep((s) => s + 1)
      setVisibleLines(0)
    } else {
      setPaused(true)
      setTimeout(() => {
        setActiveStep(0)
        setVisibleLines(0)
        setCompleted([])
        setPaused(false)
      }, 4500)
    }
  }, [activeStep, totalSteps, paused])

  useEffect(() => {
    if (paused) return
    const step = PIPELINE[activeStep]
    if (!step) return

    if (visibleLines < step.lines.length) {
      const delay = activeStep === 4 && visibleLines === 1 ? 1100 : 550 + Math.random() * 250
      const t = setTimeout(() => setVisibleLines((v) => v + 1), delay)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(advanceStep, step.duration - step.lines.length * 500)
      return () => clearTimeout(t)
    }
  }, [activeStep, visibleLines, advanceStep, paused])

  const currentStep = PIPELINE[activeStep]

  return (
    <div className="tech-demo">
      <div className="tech-pipeline">
        {PIPELINE.map((p, i) => (
          <button
            key={p.step}
            className={`tech-pip-step ${i === activeStep ? 'active' : ''} ${completed.includes(i) ? 'done' : ''}`}
            onClick={() => goToStep(i)}
            type="button"
          >
            <div className="tech-pip-icon">{p.icon}</div>
            <div className="tech-pip-label">
              {p.label}
              {p.tooltip && <InfoTooltip text={p.tooltip} />}
            </div>
            {i < totalSteps - 1 && (
              <div className={`tech-pip-arrow ${completed.includes(i) ? 'done' : ''}`}>→</div>
            )}
          </button>
        ))}
      </div>

      <div className="tech-terminal">
        <div className="tech-terminal-bar">
          <span className="tech-dot red" />
          <span className="tech-dot yellow" />
          <span className="tech-dot green" />
          <span className="tech-terminal-title">
            anime-filler-checker — {currentStep.label}
          </span>
        </div>
        <div className="tech-terminal-body">
          {currentStep.lines.slice(0, visibleLines).map((line, i) => (
            <div key={`${activeStep}-${i}`} className={`tech-line tech-line-${line.type}`}>
              {line.type === 'comment' && <span className="tech-comment">{line.text}</span>}
              {line.type === 'code' && (
                <span>
                  <span className="tech-code">{line.text}</span>
                  <span className="tech-highlight">{line.highlight}</span>
                  <span className="tech-code">{line.after}</span>
                </span>
              )}
              {(line.type === 'result' || line.type === 'extract' || line.type === 'skip') && (
                <span className={`tech-${line.type}`}>{line.text}</span>
              )}
              {line.type === 'fetch' && (
                <span className="tech-fetch">
                  <span className="tech-method">GET</span> {line.text.replace('GET ', '')}
                  <span className="tech-spinner">⟳</span>
                </span>
              )}
              {line.type === 'response' && <span className="tech-response">{line.text}</span>}
              {line.type === 'verdict' && (
                <div className="tech-verdict-box">
                  <span className="tech-verdict-badge">{line.text}</span>
                  <span className="tech-verdict-sub">{line.sub}</span>
                </div>
              )}
            </div>
          ))}
          {visibleLines < currentStep.lines.length && <span className="tech-cursor">▋</span>}
        </div>
      </div>
    </div>
  )
}
