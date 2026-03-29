import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

interface Movie {
  id: string
  title: string
  submittedBy: string
  votes: number
  submittedAt: number
  posterUrl?: string
}

interface SessionData {
  movies: Movie[]
  isOpen: boolean
  hasSubmitted: boolean
  submittedMovieId: string | null
  isHost: boolean
}

interface PosterModal {
  poster: string
  title: string
  year: string
}

export default function PollPage() {
  const router = useRouter()
  const { id: pollId, host: hostToken } = router.query as { id?: string; host?: string }

  const [data, setData] = useState<SessionData | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [fetchingPoster, setFetchingPoster] = useState(false)
  const [modal, setModal] = useState<PosterModal | null>(null)
  const [lightboxPoster, setLightboxPoster] = useState<{ url: string; title: string } | null>(null)
  const [hostLoading, setHostLoading] = useState(false)
  const [hostStatus, setHostStatus] = useState('')
  const [copied, setCopied] = useState<'share' | 'host' | null>(null)
  const [notFound, setNotFound] = useState(false)

  const fetchSession = useCallback(async () => {
    if (!pollId) return
    const params = new URLSearchParams({ pollId })
    if (hostToken) params.set('hostToken', hostToken)
    const res = await fetch(`/api/session?${params}`)
    if (res.status === 404) { setNotFound(true); return }
    const json = await res.json()
    setData(json)
    if (json.votedMovieId) setVotedFor(json.votedMovieId)
  }, [pollId, hostToken])

  useEffect(() => {
    if (!router.isReady) return
    fetchSession()
    const interval = setInterval(fetchSession, 3000)
    return () => clearInterval(interval)
  }, [router.isReady, fetchSession])

  async function handleSubmitClick() {
    if (!input.trim()) return
    setFetchingPoster(true)
    setError('')
    try {
      const res = await fetch(`/api/movie-search?title=${encodeURIComponent(input.trim())}`)
      const json = await res.json()
      if (json.poster) {
        setModal({ poster: json.poster, title: json.title || input.trim(), year: json.year || '' })
        setFetchingPoster(false)
        return
      }
    } catch {}
    setFetchingPoster(false)
    await doSubmit()
  }

  async function doSubmit(posterUrl?: string) {
    setSubmitting(true)
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, title: input.trim(), posterUrl }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(json.error)
    } else {
      setInput('')
      setFlash('Movie added!')
      setTimeout(() => setFlash(null), 2500)
      fetchSession()
    }
  }

  async function vote(movieId: string) {
    setVoting(movieId)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, movieId }),
    })
    setVoting(null)
    if (res.ok) {
      setVotedFor(prev => (prev === movieId ? null : movieId))
      fetchSession()
    }
  }

  async function hostAction(act: string) {
    setHostLoading(true)
    setHostStatus('')
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, pollId, hostToken }),
    })
    const json = await res.json()
    setHostLoading(false)
    if (!res.ok) {
      setHostStatus('Error: ' + json.error)
    } else {
      setHostStatus(json.message || 'Done')
      if (json.isOpen !== undefined) {
        setData(prev => prev ? { ...prev, isOpen: json.isOpen } : prev)
      }
      if (act === 'reset') fetchSession()
      setTimeout(() => setHostStatus(''), 3000)
    }
  }

  function copyToClipboard(text: string, which: 'share' | 'host') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}` : ''
  const hostUrl = typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}?host=${hostToken}` : ''
  const maxVotes = data ? Math.max(...data.movies.map(m => m.votes), 1) : 1
  const busy = submitting || fetchingPoster

  if (notFound) {
    return (
      <>
        <Head><title>Poll Not Found — Movie Night</title></Head>
        <style jsx global>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #f5efe0; font-family: 'DM Mono', monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .not-found { text-align: center; padding: 48px 24px; }
          .not-found h2 { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #1a1209; margin-bottom: 12px; }
          .not-found p { font-size: 0.78rem; color: #3d2b1f; opacity: 0.5; margin-bottom: 28px; }
          .not-found a { font-size: 0.78rem; color: #c0392b; text-decoration: none; }
        `}</style>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400&display=swap" rel="stylesheet" />
        <div className="not-found">
          <div style={{ fontSize: '2.4rem', marginBottom: 20 }}>🎞</div>
          <h2>Poll not found</h2>
          <p>This poll may have expired or the link is invalid.</p>
          <a href="/">Start a new poll</a>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Movie Night</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cream: #f5efe0;
          --parchment: #ede3cc;
          --dark: #1a1209;
          --red: #c0392b;
          --gold: #c9952a;
          --brown: #3d2b1f;
          --shadow: rgba(26,18,9,0.14);
        }

        body {
          background: var(--cream);
          color: var(--dark);
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
          background-image:
            radial-gradient(ellipse at 15% 0%, rgba(201,149,42,0.15) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 100%, rgba(192,57,43,0.1) 0%, transparent 55%);
        }

        .container {
          max-width: 700px;
          margin: 0 auto;
          padding: 56px 20px 80px;
        }

        header {
          text-align: center;
          margin-bottom: 52px;
        }

        .header-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .header-ornament::before,
        .header-ornament::after {
          content: '';
          width: 48px;
          height: 1px;
          background: var(--brown);
          opacity: 0.35;
        }
        .header-ornament span { font-size: 1.1rem; opacity: 0.55; }

        h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.6rem, 8vw, 4.2rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--dark);
        }
        h1 em { font-style: italic; color: var(--red); }

        .subtitle {
          margin-top: 12px;
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--brown);
          opacity: 0.6;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 36px 0;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--brown);
          opacity: 0.2;
        }
        .divider-icon { font-size: 0.9rem; opacity: 0.4; }

        /* ── Host Panel ── */
        .host-panel {
          background: var(--dark);
          color: var(--cream);
          border-radius: 10px;
          padding: 24px 24px 20px;
          margin-bottom: 28px;
          border: 1px solid rgba(201,149,42,0.25);
          box-shadow: 0 4px 20px rgba(26,18,9,0.25);
        }

        .host-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .host-panel-title {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.02em;
        }

        .state-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 3px;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .badge-open { background: rgba(39,174,96,0.18); color: #2ecc71; }
        .badge-closed { background: rgba(192,57,43,0.25); color: #e74c3c; }

        .host-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }

        .host-share {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .btn-host-action {
          padding: 10px 14px;
          border: none;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .btn-host-action:hover:not(:disabled) { opacity: 0.82; transform: translateY(-1px); }
        .btn-host-action:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-toggle { background: rgba(255,255,255,0.1); color: var(--cream); }
        .btn-reset { background: rgba(192,57,43,0.7); color: white; }
        .btn-copy-share { background: rgba(201,149,42,0.25); color: var(--gold); }
        .btn-copy-host { background: rgba(255,255,255,0.07); color: rgba(245,239,224,0.6); }

        .host-status {
          margin-top: 10px;
          font-size: 0.7rem;
          opacity: 0.55;
          letter-spacing: 0.04em;
          min-height: 18px;
        }

        /* ── Closed banner ── */
        .closed-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--dark);
          color: var(--cream);
          padding: 13px 24px;
          border-radius: 6px;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 28px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        /* ── Suggest a Film card ── */
        .submit-area {
          background: white;
          border: 1.5px solid rgba(61,43,31,0.12);
          border-top: 3px solid var(--gold);
          border-radius: 8px;
          padding: 28px 28px 24px;
          box-shadow: 0 2px 16px var(--shadow);
          margin-bottom: 12px;
        }
        .submit-area h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--dark);
        }
        .submit-hint {
          font-size: 0.7rem;
          color: var(--brown);
          opacity: 0.5;
          letter-spacing: 0.04em;
          margin-bottom: 18px;
        }
        .already-submitted {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: var(--gold);
          letter-spacing: 0.04em;
          padding: 8px 0 4px;
        }
        .input-row { display: flex; gap: 10px; }

        input[type="text"] {
          flex: 1;
          padding: 12px 16px;
          border: 1.5px solid rgba(61,43,31,0.18);
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          background: var(--cream);
          color: var(--dark);
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        input[type="text"]:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(201,149,42,0.12);
        }
        input[type="text"]::placeholder { opacity: 0.35; }
        input[type="text"]:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-submit {
          padding: 12px 22px;
          background: var(--red);
          color: white;
          border: none;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .btn-submit:hover:not(:disabled) {
          background: #a93226;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(192,57,43,0.3);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        .error-msg { margin-top: 12px; font-size: 0.74rem; color: var(--red); letter-spacing: 0.03em; }
        .flash { margin-top: 12px; font-size: 0.74rem; color: var(--gold); letter-spacing: 0.03em; }

        /* ── Contenders ── */
        .movies-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--dark);
        }
        .movies-count {
          font-size: 0.68rem;
          color: var(--brown);
          opacity: 0.45;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .empty {
          text-align: center;
          padding: 52px 24px;
          opacity: 0.35;
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          line-height: 1.8;
        }

        /* ── Movie cards ── */
        .movie-card {
          background: white;
          border: 1.5px solid rgba(61,43,31,0.1);
          border-radius: 8px;
          padding: 14px 16px 14px 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 1px 6px var(--shadow);
          transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.3s ease both;
        }
        .movie-card:hover { box-shadow: 0 6px 20px var(--shadow); transform: translateY(-2px); }
        .movie-card.leader {
          border-color: rgba(201,149,42,0.5);
          background: linear-gradient(135deg, white 80%, rgba(201,149,42,0.04) 100%);
        }
        .vote-bar {
          position: absolute;
          bottom: 0; left: 0;
          height: 3px;
          background: linear-gradient(to right, var(--gold), var(--red));
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          border-radius: 0 2px 0 6px;
        }
        .rank {
          font-family: 'Playfair Display', serif;
          font-size: 2.8rem;
          font-weight: 900;
          font-style: italic;
          color: rgba(61,43,31,0.55);
          min-width: 42px;
          text-align: center;
          line-height: 1;
          flex-shrink: 0;
        }
        .movie-card.leader .rank { color: var(--gold); }
        .movie-poster {
          width: 38px; height: 56px;
          object-fit: cover;
          border-radius: 3px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(26,18,9,0.2);
        }
        .movie-info { flex: 1; min-width: 0; }
        .movie-title {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .movie-meta {
          font-size: 0.67rem;
          color: var(--brown);
          opacity: 0.45;
          margin-top: 3px;
          letter-spacing: 0.06em;
        }

        /* ── Vote button ── */
        .vote-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: none;
          border: 1.5px solid rgba(61,43,31,0.15);
          border-radius: 8px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 60px;
          font-family: 'DM Mono', monospace;
          flex-shrink: 0;
        }
        .vote-btn:hover:not(:disabled) {
          border-color: var(--gold);
          background: rgba(201,149,42,0.07);
          transform: translateY(-1px);
        }
        .vote-btn.voted {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--cream);
          box-shadow: 0 2px 8px rgba(26,18,9,0.25);
        }
        .vote-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .vote-count { font-size: 1.05rem; font-weight: 500; line-height: 1; }
        .vote-label { font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; }

        /* ── Poster modal ── */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(26,18,9,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 20px;
        }
        .modal {
          background: white; border-radius: 12px;
          padding: 32px 28px 28px;
          max-width: 300px; width: 100%;
          box-shadow: 0 24px 64px rgba(26,18,9,0.45);
          text-align: center;
        }
        .modal-eyebrow {
          font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--brown); opacity: 0.45; margin-bottom: 16px;
        }
        .modal-poster {
          width: 150px; height: 222px; object-fit: cover;
          border-radius: 6px; margin: 0 auto 20px; display: block;
          box-shadow: 0 6px 24px rgba(26,18,9,0.25);
        }
        .modal-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; line-height: 1.3; }
        .modal-year { font-size: 0.68rem; color: var(--brown); opacity: 0.45; letter-spacing: 0.12em; margin-bottom: 24px; }
        .modal-buttons { display: flex; flex-direction: column; gap: 8px; }
        .btn-confirm {
          padding: 12px; background: var(--dark); color: var(--cream); border: none; border-radius: 6px;
          font-family: 'DM Mono', monospace; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: background 0.2s;
        }
        .btn-confirm:hover { background: var(--brown); }
        .btn-skip {
          padding: 11px; background: none; color: var(--brown);
          border: 1.5px solid rgba(61,43,31,0.15); border-radius: 6px;
          font-family: 'DM Mono', monospace; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; opacity: 0.55; transition: opacity 0.2s;
        }
        .btn-skip:hover { opacity: 1; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .container { padding: 36px 16px 60px; }
          .submit-area { padding: 22px 18px 20px; }
          .input-row { flex-direction: column; }
          .btn-submit { width: 100%; text-align: center; }
          h1 { font-size: 2.6rem; }
          .host-actions { grid-template-columns: 1fr; }
          .host-share { grid-template-columns: 1fr; }
        }

        .lightbox-backdrop {
          position: fixed; inset: 0;
          background: rgba(26,18,9,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .lightbox-content {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 14px; max-width: 340px; width: 100%;
        }
        .lightbox-img {
          width: 100%; max-width: 300px; height: auto;
          border-radius: 8px; box-shadow: 0 12px 40px rgba(26,18,9,0.5); display: block;
        }
        .lightbox-title { color: var(--cream); font-family: 'Playfair Display', serif; font-size: 1.1rem; text-align: center; }
        .lightbox-close {
          position: absolute; top: -14px; right: -14px;
          background: var(--red); color: white; border: none;
          border-radius: 50%; width: 32px; height: 32px; font-size: 0.9rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;
        }
      `}</style>

      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="modal-eyebrow">Is this the right film?</p>
            <img className="modal-poster" src={modal.poster} alt={modal.title} />
            <div className="modal-title">{modal.title}</div>
            {modal.year && <div className="modal-year">{modal.year}</div>}
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={() => { setModal(null); doSubmit(modal.poster) }}>
                That&apos;s the one
              </button>
              <button className="btn-skip" onClick={() => { setModal(null); doSubmit() }}>
                Wrong film, skip poster
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxPoster && (
        <div className="lightbox-backdrop" onClick={() => setLightboxPoster(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxPoster.url} alt={lightboxPoster.title} className="lightbox-img" />
            <div className="lightbox-title">{lightboxPoster.title}</div>
            <button className="lightbox-close" onClick={() => setLightboxPoster(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="container">
        <header>
          <div className="header-ornament"><span>✦</span></div>
          <h1>Movie <em>Night</em></h1>
          <p className="subtitle">Suggest a movie · Cast your vote</p>
        </header>

        {/* ── Host Panel ── */}
        {data?.isHost && (
          <div className="host-panel">
            <div className="host-panel-header">
              <span className="host-panel-title">Host Panel</span>
              {data && (
                <span className={`state-badge ${data.isOpen ? 'badge-open' : 'badge-closed'}`}>
                  ● {data.isOpen ? 'Voting Open' : 'Voting Closed'}
                </span>
              )}
            </div>

            <div className="host-actions">
              <button
                className="btn-host-action btn-toggle"
                onClick={() => hostAction('toggle')}
                disabled={hostLoading}
              >
                {hostLoading ? '...' : data?.isOpen ? 'Close Voting' : 'Open Voting'}
              </button>
              <button
                className="btn-host-action btn-reset"
                onClick={() => {
                  if (confirm('Reset all movies and votes? This cannot be undone.')) {
                    hostAction('reset')
                  }
                }}
                disabled={hostLoading}
              >
                Reset Poll
              </button>
            </div>

            <div className="host-share">
              <button
                className="btn-host-action btn-copy-share"
                onClick={() => copyToClipboard(shareUrl, 'share')}
              >
                {copied === 'share' ? '✓ Copied!' : 'Copy Guest Link'}
              </button>
              <button
                className="btn-host-action btn-copy-host"
                onClick={() => copyToClipboard(hostUrl, 'host')}
              >
                {copied === 'host' ? '✓ Copied!' : 'Copy My Host Link'}
              </button>
            </div>

            {hostStatus && <p className="host-status">{hostStatus}</p>}
          </div>
        )}

        {data && !data.isOpen && !data.isHost && (
          <div className="closed-banner">
            <span>🎬</span> Voting is now closed
          </div>
        )}

        <div className="submit-area">
          <h2>Suggest a Film</h2>
          {data?.hasSubmitted ? (
            <p className="already-submitted">✓ Your suggestion has been added.</p>
          ) : (
            <>
              <p className="submit-hint">One suggestion per session</p>
              <div className="input-row">
                <input
                  type="text"
                  placeholder="e.g. Legally Blonde..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitClick()}
                  disabled={busy || !data?.isOpen}
                  maxLength={100}
                />
                <button
                  className="btn-submit"
                  onClick={handleSubmitClick}
                  disabled={busy || !input.trim() || !data?.isOpen}
                >
                  {fetchingPoster ? '...' : submitting ? '...' : 'Submit'}
                </button>
              </div>
              {error && <p className="error-msg">⚠ {error}</p>}
              {flash && <p className="flash">{flash}</p>}
            </>
          )}
        </div>

        <div className="divider"><span className="divider-icon">✦</span></div>

        <div className="movies-section">
          <h2>The Contenders</h2>
          {data && data.movies.length > 0 && (
            <p className="movies-count">{data.movies.length} film{data.movies.length !== 1 ? 's' : ''} in the running</p>
          )}

          {!data || data.movies.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>🎞</div>
              No films yet — be the first to suggest one!
            </div>
          ) : (
            data.movies.map((movie, i) => (
              <div
                key={movie.id}
                className={`movie-card${i === 0 && movie.votes > 0 ? ' leader' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="vote-bar" style={{ width: `${(movie.votes / maxVotes) * 100}%` }} />
                <span className="rank">{i + 1}</span>
                {movie.posterUrl && (
                  <img
                    className="movie-poster"
                    src={movie.posterUrl}
                    alt={movie.title}
                    onClick={() => setLightboxPoster({ url: movie.posterUrl!, title: movie.title })}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <div className="movie-info">
                  <div className="movie-title">
                    {i === 0 && movie.votes > 0 ? '🏆 ' : ''}{movie.title}
                  </div>
                  <div className="movie-meta">
                    {movie.votes === 1 ? '1 vote' : `${movie.votes} votes`}
                  </div>
                </div>
                <button
                  className={`vote-btn${votedFor === movie.id ? ' voted' : ''}`}
                  onClick={() => vote(movie.id)}
                  disabled={!!voting || !data.isOpen}
                  title={votedFor === movie.id ? 'Remove vote' : 'Vote for this'}
                >
                  <span className="vote-count">
                    {voting === movie.id ? '…' : votedFor === movie.id ? '✓' : '▲'}
                  </span>
                  <span className="vote-label">Vote</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
