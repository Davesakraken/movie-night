import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

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
}

interface PosterModal {
  poster: string
  title: string
  year: string
}

export default function Home() {
  const [data, setData] = useState<SessionData | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [fetchingPoster, setFetchingPoster] = useState(false)
  const [modal, setModal] = useState<PosterModal | null>(null)

  const fetchSession = useCallback(async () => {
    const res = await fetch('/api/session')
    const json = await res.json()
    setData(json)
    if (json.votedMovieId) setVotedFor(json.votedMovieId)
  }, [])

  useEffect(() => {
    fetchSession()
    const interval = setInterval(fetchSession, 3000)
    return () => clearInterval(interval)
  }, [fetchSession])

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
      body: JSON.stringify({ title: input.trim(), posterUrl }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(json.error)
    } else {
      setInput('')
      setFlash('🎬 Movie added!')
      setTimeout(() => setFlash(null), 2500)
      fetchSession()
    }
  }

  async function vote(movieId: string) {
    setVoting(movieId)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId }),
    })
    setVoting(null)
    if (res.ok) {
      setVotedFor(prev => (prev === movieId ? null : movieId))
      fetchSession()
    }
  }

  const maxVotes = data ? Math.max(...data.movies.map(m => m.votes), 1) : 1
  const busy = submitting || fetchingPoster

  return (
    <>
      <Head>
        <title>🎬 Movie Night</title>
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

        /* ── Header ── */
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
        .header-ornament span {
          font-size: 1.1rem;
          opacity: 0.55;
        }

        h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.6rem, 8vw, 4.2rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--dark);
        }

        h1 em {
          font-style: italic;
          color: var(--red);
        }

        .subtitle {
          margin-top: 12px;
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--brown);
          opacity: 0.6;
        }

        /* ── Section divider ── */
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
        .divider-icon {
          font-size: 0.9rem;
          opacity: 0.4;
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

        .input-row {
          display: flex;
          gap: 10px;
        }

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

        input[type="text"]::placeholder {
          opacity: 0.35;
        }

        input[type="text"]:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

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

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: 12px;
          font-size: 0.74rem;
          color: var(--red);
          letter-spacing: 0.03em;
        }

        .flash {
          margin-top: 12px;
          font-size: 0.74rem;
          color: var(--gold);
          letter-spacing: 0.03em;
        }

        /* ── The Contenders section ── */
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

        .movie-card:hover {
          box-shadow: 0 6px 20px var(--shadow);
          transform: translateY(-2px);
        }

        .movie-card.leader {
          border-color: rgba(201,149,42,0.5);
          background: linear-gradient(135deg, white 80%, rgba(201,149,42,0.04) 100%);
        }

        .vote-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(to right, var(--gold), var(--red));
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          border-radius: 0 2px 0 6px;
        }

        .rank {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 900;
          font-style: italic;
          color: rgba(61,43,31,0.35);
          min-width: 32px;
          text-align: center;
          line-height: 1;
          flex-shrink: 0;
        }

        .movie-card.leader .rank {
          color: var(--gold);
        }

        .movie-poster {
          width: 38px;
          height: 56px;
          object-fit: cover;
          border-radius: 3px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(26,18,9,0.2);
        }

        .movie-info {
          flex: 1;
          min-width: 0;
        }

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

        .vote-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .vote-count {
          font-size: 1.05rem;
          font-weight: 500;
          line-height: 1;
        }

        .vote-label {
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.55;
        }

        /* ── Poster confirmation modal ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(26,18,9,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 32px 28px 28px;
          max-width: 300px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(26,18,9,0.45);
          text-align: center;
        }

        .modal-eyebrow {
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--brown);
          opacity: 0.45;
          margin-bottom: 16px;
        }

        .modal-poster {
          width: 150px;
          height: 222px;
          object-fit: cover;
          border-radius: 6px;
          margin: 0 auto 20px;
          display: block;
          box-shadow: 0 6px 24px rgba(26,18,9,0.25);
        }

        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .modal-year {
          font-size: 0.68rem;
          color: var(--brown);
          opacity: 0.45;
          letter-spacing: 0.12em;
          margin-bottom: 24px;
        }

        .modal-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-confirm {
          padding: 12px;
          background: var(--dark);
          color: var(--cream);
          border: none;
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-confirm:hover {
          background: var(--brown);
        }

        .btn-skip {
          padding: 11px;
          background: none;
          color: var(--brown);
          border: 1.5px solid rgba(61,43,31,0.15);
          border-radius: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          opacity: 0.55;
          transition: opacity 0.2s;
        }

        .btn-skip:hover {
          opacity: 1;
        }

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

      <div className="container">
        <header>
          <div className="header-ornament"><span>✦</span></div>
          <h1>Movie <em>Night</em></h1>
          <p className="subtitle">Suggest a movie · Cast your vote</p>
        </header>

        {data && !data.isOpen && (
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
                <div
                  className="vote-bar"
                  style={{ width: `${(movie.votes / maxVotes) * 100}%` }}
                />
                <span className="rank">{i + 1}</span>
                {movie.posterUrl && (
                  <img className="movie-poster" src={movie.posterUrl} alt={movie.title} />
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
