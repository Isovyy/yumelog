'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Script from 'next/script'

type State = 'loading' | 'auth' | 'builder'

export default function EditPage() {
  const { slug }                      = useParams<{ slug: string }>()
  const [state, setState]             = useState<State>('loading')
  const [password, setPassword]       = useState('')
  const [authError, setAuthError]     = useState('')
  const [publishMsg, setPublishMsg]   = useState('')
  const [publishing, setPublishing]   = useState(false)
  const [previewing, setPreviewing]   = useState(false)
  const [scriptReady, setScriptReady] = useState(false)
  const existingData                  = useRef<any>(null)
  const authedPassword                = useRef('')

  // On mount — check sessionStorage first (just came from create flow)
  useEffect(() => {
    const storedSlug = sessionStorage.getItem('ys_slug')
    const storedPw   = sessionStorage.getItem('ys_password')
    if (storedSlug === slug && storedPw) {
      authedPassword.current = storedPw
      sessionStorage.removeItem('ys_slug')
      sessionStorage.removeItem('ys_password')
      fetchAndLoad(storedPw)
    } else {
      setState('auth')
    }
  }, [slug])

  async function fetchAndLoad(pw: string) {
    // Fetch existing published data
    const res = await fetch(`/api/archive/${slug}`)
    if (res.ok) {
      const json = await res.json()
      existingData.current = json.data_published
    }
    authedPassword.current = pw
    setState('builder')
  }

  async function handleAuth() {
    setAuthError('')
    const res  = await fetch(`/api/archive/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setAuthError(res.status === 401 ? 'Wrong password.' : (json.error || `Error ${res.status}`))
      return
    }
    await fetchAndLoad(password)
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishMsg('')
    const result = await (window as any).publishArchive(authedPassword.current)
    setPublishing(false)
    if (result.ok) {
      setPublishMsg('Published ✓')
      setTimeout(() => setPublishMsg(''), 3000)
    } else {
      setPublishMsg(result.error || 'Failed to publish')
    }
  }

  function handlePreview() {
    setPreviewing(p => !p)
    document.body.classList.toggle('preview-mode')
  }

  // Once script is ready and we're in builder state, init the builder
  useEffect(() => {
    if (scriptReady && state === 'builder') {
      const w = window as any
      const hasDraft = w.loadDraft(slug)
      if (!hasDraft) {
        w.initBuilder(slug, existingData.current)
      } else {
        w.__ys_slug = slug
      }
    }
  }, [scriptReady, state, slug])

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f2' }}>
      <p style={{ color: '#888', fontFamily: 'system-ui' }}>Loading…</p>
    </div>
  )

  if (state === 'auth') return (
    <>
      <link rel="stylesheet" href="/builder.css" />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f2f2' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 360, fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1rem' }}>/{slug}</p>
          <p style={{ fontSize: '0.85rem', color: '#888' }}>Enter your password to edit this archive.</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ padding: '0.55em 0.75em', border: '1px solid #e2e2e2', borderRadius: 6, fontSize: '0.95rem', fontFamily: 'system-ui', outline: 'none' }}
            autoFocus
          />
          {authError && <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>{authError}</p>}
          <button
            onClick={handleAuth}
            style={{ background: '#7c6af7', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6em 1em', fontFamily: 'system-ui', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Enter
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <link rel="stylesheet" href="/builder.css" />
      <Script src="/builder.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />

      {/* App bar */}
      <div className="app-bar">
        <span className="app-bar__title">/{slug}</span>
        <span className="app-bar__spacer"></span>
        {publishMsg && <span className="save-indicator">{publishMsg}</span>}
        <button className="app-btn" onClick={handlePreview}>
          {previewing ? 'Edit' : 'Preview'}
        </button>
        <button
          className="app-btn"
          onClick={handlePublish}
          disabled={publishing}
          style={{ background: '#7c6af7', color: '#fff', borderColor: '#7c6af7' }}
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      {/* Builder canvas */}
      <div className="page" id="page">
        <div className="empty-state" id="empty-state">
          <p className="empty-state__icon">✦</p>
          <p>Add your first container to start building.</p>
        </div>
      </div>

      <div className="page page--footer">
        <button className="add-container-btn" id="add-container-btn">+ Add container</button>
      </div>

      {/* Container picker */}
      <div className="picker" id="container-picker" style={{ display: 'none' }}>
        <div className="picker__header">Choose a layout</div>
        <button className="picker__option" data-cols="1">
          <span className="picker__layout picker__layout--1"><span></span></span>
          <span>1 column</span>
        </button>
        <button className="picker__option" data-cols="2">
          <span className="picker__layout picker__layout--2"><span></span><span></span></span>
          <span>2 columns</span>
        </button>
        <button className="picker__option" data-cols="3">
          <span className="picker__layout picker__layout--3"><span></span><span></span><span></span></span>
          <span>3 columns</span>
        </button>
        <div className="picker__divider"></div>
        <button className="picker__option picker__option--preset" data-preset="five-minutes">
          <span className="picker__preset-icon">✦</span>
          <span>
            <strong>Ship in Five Minutes</strong>
            <small>3-col preset with all dynamic blocks</small>
          </span>
        </button>
      </div>

      {/* Block picker */}
      <div className="picker picker--blocks" id="block-picker" style={{ display: 'none' }}>
        <div className="picker__header">Add a block</div>
        <div className="picker__group-label">Core</div>
        <button className="picker__option" data-type="ship-header"><span className="picker__icon">✦</span> Ship Header</button>
        <button className="picker__option" data-type="about"><span className="picker__icon">♡</span> About This Ship</button>
        <button className="picker__option" data-type="ship-tags"><span className="picker__icon">◇</span> Ship Tags</button>
        <button className="picker__option" data-type="links"><span className="picker__icon">↗</span> Links</button>
        <button className="picker__option" data-type="dni"><span className="picker__icon">⊘</span> DNI / Boundaries</button>
        <div className="picker__group-label">Yume-native</div>
        <button className="picker__option" data-type="character-portrait"><span className="picker__icon">◫</span> Character Portrait</button>
        <button className="picker__option" data-type="speech-bubbles"><span className="picker__icon">❝</span> Speech Bubbles</button>
        <button className="picker__option" data-type="dynamic-axis"><span className="picker__icon">⊟</span> Dynamic Axis</button>
        <button className="picker__option" data-type="who-does-what"><span className="picker__icon">☑</span> Who Does What</button>
        <button className="picker__option" data-type="height-diff"><span className="picker__icon">↕</span> Height</button>
        <button className="picker__option" data-type="age-diff"><span className="picker__icon">∞</span> Age Diff</button>
        <div className="picker__group-label">Optional</div>
        <button className="picker__option" data-type="headcanons"><span className="picker__icon">✎</span> Headcanons</button>
        <button className="picker__option" data-type="gallery"><span className="picker__icon">▦</span> Gallery</button>
        <button className="picker__option" data-type="quote-letter"><span className="picker__icon">✉</span> Quote / Letter</button>
        <button className="picker__option" data-type="ship-stats"><span className="picker__icon">◑</span> Ship Stats</button>
        <button className="picker__option" data-type="fic-recs"><span className="picker__icon">✦</span> Fic Rec List</button>
        <div className="picker__group-label">Layout</div>
        <button className="picker__option" data-type="heading"><span className="picker__icon">T</span> Heading</button>
        <button className="picker__option" data-type="text"><span className="picker__icon">¶</span> Text</button>
        <button className="picker__option" data-type="divider"><span className="picker__icon">—</span> Divider</button>
        <button className="picker__option" data-type="color-code"><span className="picker__icon">◉</span> Color Code</button>
      </div>

      {/* Format bar */}
      <div className="format-bar" id="format-bar" style={{ display: 'none' }}>
        <select className="format-bar__select" id="fmt-size">
          <option value="">Size</option>
          <option value="1">XS</option><option value="2">S</option>
          <option value="3">M</option><option value="4">L</option>
          <option value="5">XL</option><option value="6">2X</option>
        </select>
        <div className="format-bar__sep"></div>
        <button className="format-bar__btn" data-cmd="bold"><b>B</b></button>
        <button className="format-bar__btn" data-cmd="italic"><i>I</i></button>
        <button className="format-bar__btn" data-cmd="underline"><u>U</u></button>
        <button className="format-bar__btn" data-cmd="strikeThrough"><s>S</s></button>
        <div className="format-bar__sep"></div>
        <button className="format-bar__btn" data-cmd="justifyLeft">←</button>
        <button className="format-bar__btn" data-cmd="justifyCenter">≡</button>
        <button className="format-bar__btn" data-cmd="justifyRight">→</button>
        <div className="format-bar__sep"></div>
        <button className="format-bar__btn" data-cmd="removeFormat">✕ fmt</button>
      </div>
    </>
  )
}
