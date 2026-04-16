'use client'

import { useState } from 'react'
import './landing.css'

type Screen = 'home' | 'choice' | 'anon' | 'login'

export default function Home() {
  const [screen, setScreen]     = useState<Screen>('home')
  const [slug, setSlug]         = useState('')
  const [slugHint, setSlugHint] = useState<{ text: string; ok: boolean } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function handleSlugInput(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    setSlug(clean)
    if (!clean)              { setSlugHint(null); return }
    if (clean.length < 3)   { setSlugHint({ text: 'Too short — minimum 3 characters', ok: false }); return }
    setSlugHint({ text: `yumearchive.com/${clean}`, ok: true })
  }

  async function startAnon() {
    setError('')
    if (slug.length < 3)     { setError('Please enter a valid URL slug.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setLoading(true)
    const res  = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, password }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error || 'Something went wrong.'); return }

    sessionStorage.setItem('ys_slug', slug)
    sessionStorage.setItem('ys_password', password)
    window.location.href = `/${slug}/edit`
  }

  return (
    <>
      {screen === 'home' && (
        <section className="screen">
          <div className="home">
            <p className="home__eyebrow">✦</p>
            <h1 className="home__title">yumearchive</h1>
            <p className="home__sub">an archive for your one true ship</p>
            <button className="btn btn--primary" onClick={() => setScreen('choice')}>
              Get started
            </button>
          </div>
        </section>
      )}

      {screen === 'choice' && (
        <section className="screen">
          <div className="choice">
            <button className="back-btn" onClick={() => setScreen('home')}>← back</button>
            <h2 className="choice__title">How do you want to continue?</h2>
            <div className="choice-cards">

              <div className="choice-card" onClick={() => setScreen('login')}>
                <div className="choice-card__icon">◎</div>
                <h3 className="choice-card__heading">Log in</h3>
                <p className="choice-card__desc">Access your archive from any device. Autosave keeps your work safe.</p>
                <span className="choice-card__cta">Log in or create account →</span>
              </div>

              <div className="choice-card" onClick={() => setScreen('anon')}>
                <div className="choice-card__icon">✦</div>
                <h3 className="choice-card__heading">Get started right away</h3>
                <p className="choice-card__desc">No account needed. Just pick a URL and a password.</p>
                <div className="warning-pill">⚠ No autosave — you must publish to save</div>
                <span className="choice-card__cta">Continue without account →</span>
              </div>

            </div>
          </div>
        </section>
      )}

      {screen === 'anon' && (
        <section className="screen">
          <div className="setup">
            <button className="back-btn" onClick={() => setScreen('choice')}>← back</button>
            <h2 className="setup__title">Create your archive</h2>

            <div className="setup-form">
              <div className="setup-field">
                <label className="setup-label">Your archive URL</label>
                <div className="slug-row">
                  <span className="slug-prefix">yumearchive.com /</span>
                  <input
                    className="slug-input"
                    type="text"
                    placeholder="levi-shrine"
                    value={slug}
                    onChange={e => handleSlugInput(e.target.value)}
                  />
                </div>
                {slugHint && (
                  <p className={`setup-hint ${slugHint.ok ? 'setup-hint--ok' : 'setup-hint--error'}`}>
                    {slugHint.text}
                  </p>
                )}
              </div>

              <div className="setup-field">
                <label className="setup-label">Password</label>
                <input
                  className="setup-input"
                  type="password"
                  placeholder="choose a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <input
                  className="setup-input"
                  type="password"
                  placeholder="confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ marginTop: '0.5rem' }}
                />
              </div>

              <div className="warning-box">
                <p><strong>Before you continue:</strong></p>
                <ul>
                  <li>There is <strong>no autosave</strong> — you must click Publish to save your archive.</li>
                  <li>There is <strong>no password recovery</strong>. If you lose it, your archive cannot be edited again.</li>
                  <li>Want autosave? <button className="link-btn" onClick={() => setScreen('login')}>Create a free account instead.</button></li>
                </ul>
              </div>

              {error && <p className="setup-hint setup-hint--error">{error}</p>}

              <button className="btn btn--primary btn--full" onClick={startAnon} disabled={loading}>
                {loading ? 'Creating…' : 'Create my archive →'}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === 'login' && (
        <section className="screen">
          <div className="setup">
            <button className="back-btn" onClick={() => setScreen('choice')}>← back</button>
            <h2 className="setup__title">Log in or sign up</h2>
            <div className="setup-form">
              <div className="setup-field">
                <label className="setup-label">Email</label>
                <input className="setup-input" type="email" placeholder="you@example.com" />
              </div>
              <div className="setup-field">
                <label className="setup-label">Password</label>
                <input className="setup-input" type="password" placeholder="••••••••" />
              </div>
              <button className="btn btn--primary btn--full">Log in</button>
              <p className="setup-or">or</p>
              <button className="btn btn--outline btn--full">Create account</button>
              <p className="setup-note">Account login coming soon in beta.</p>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
