import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

interface Movie {
  id: string
  title: string
  submittedBy: string
  votes: number
  submittedAt: number
}

interface SessionData {
  movies: Movie[]
  isOpen: boolean
  hasSubmitted: boolean
  submittedMovieId: string | null
}

export default function Home() {
  const [data, setData] = useState<SessionData | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

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

  async function submitMovie() {
    if (!input.trim()) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
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
          --shadow: rgba(26,18,9,0.18);
        }

        body {
          background: var(--cream);
          color: var(--dark);
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
          background-image:
            radial-gradient(ellipse at 20% 0%, rgba(201,149,42,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 100%, rgba(192,57,43,0.08) 0%, transparent 60%);
        }

        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 999;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 150px;
        }

        .container {
          max-width: 680px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        header {
          text-align: center;
          margin-bottom: 48px;
          position: relative;
        }

        .filmstrip {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 20px;
        }

        .frame {
          width: 28px;
          height: 20px;
          border: 2px solid var(--brown);
          border-radius: 2px;
          position: relative;
          background: var(--parchment);
        }

        .frame::before, .frame::after {
          content: '';
          position: absolute;
          width: 5px;
          height: 5px;
          background: var(--dark);
          border-radius: 1px;
          top: 50%;
          transform: translateY(-50%);
        }
        .frame::before { left: 2px; }
        .frame::after { right: 2px; }

        h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 7vw, 3.8rem);
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
          margin-top: 10px;
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--brown);
          opacity: 0.7;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 32px 0;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--brown);
          opacity: 0.25;
        }
        .divider-icon {
          font-size: 1rem;
          opacity: 0.5;
        }

        .closed-banner {
          text-align: center;
          background: var(--dark);
          color: var(--cream);
          padding: 14px 24px;
          border-radius: 4px;
          font-size: 0.8rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 32px;
        }

        .submit-area {
          background: white;
          border: 1.5px solid rgba(61,43,31,0.15);
          border-radius: 6px;
          padding: 24px;
          box-shadow: 0 2px 12px var(--shadow);
          margin-bottom: 40px;
        }

        .submit-area h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--brown);
        }

        .already-submitted {
          font-size: 0.78rem;
          color: var(--gold);
          letter-spacing: 0.05em;
          padding: 10px 0;
        }

        .input-row {
          display: flex;
          gap: 10px;
        }

        input[type="text"] {
          flex: 1;
          padding: 11px 14px;
          border: 1.5px solid rgba(61,43,31,0.2);
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          background: var(--cream);
          color: var(--dark);
          transition: border-color 0.2s;
          outline: none;
        }

        input[type="text"]:focus {
          border-color: var(--gold);
        }

        input[type="text"]::placeholder {
          opacity: 0.4;
        }

        .btn-submit {
          padding: 11px 20px;
          background: var(--red);
          color: white;
          border: none;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          white-space: nowrap;
        }

        .btn-submit:hover:not(:disabled) {
          background: #a93226;
          transform: translateY(-1px);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--red);
          letter-spacing: 0.04em;
        }

        .flash {
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--gold);
          letter-spacing: 0.04em;
        }

        .movies-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 20px;
          color: var(--dark);
        }

        .empty {
          text-align: center;
          padding: 48px 24px;
          opacity: 0.4;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
        }

        .movie-card {
          background: white;
          border: 1.5px solid rgba(61,43,31,0.12);
          border-radius: 6px;
          padding: 16px 18px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 6px var(--shadow);
          transition: box-shadow 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }

        .movie-card:hover {
          box-shadow: 0 4px 16px var(--shadow);
          transform: translateY(-1px);
        }

        .movie-card.leader {
          border-color: var(--gold);
        }

        .vote-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(to right, var(--gold), var(--red));
          transition: width 0.5s ease;
          border-radius: 0 2px 0 0;
        }

        .rank {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 900;
          font-style: italic;
          color: var(--parchment);
          min-width: 32px;
          text-align: center;
          line-height: 1;
        }

        .movie-card.leader .rank {
          color: var(--gold);
        }

        .movie-info {
          flex: 1;
          min-width: 0;
        }

        .movie-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .movie-meta {
          font-size: 0.68rem;
          color: var(--brown);
          opacity: 0.5;
          margin-top: 3px;
          letter-spacing: 0.05em;
        }

        .vote-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: none;
          border: 1.5px solid rgba(61,43,31,0.15);
          border-radius: 6px;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 56px;
          font-family: 'DM Mono', monospace;
        }

        .vote-btn:hover:not(:disabled) {
          border-color: var(--gold);
          background: rgba(201,149,42,0.06);
        }

        .vote-btn.voted {
          background: var(--dark);
          border-color: var(--dark);
          color: var(--cream);
        }

        .vote-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .vote-count {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1;
        }

        .vote-label {
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.6;
        }

        footer {
          text-align: center;
          margin-top: 64px;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0.3;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .movie-card {
          animation: fadeIn 0.3s ease both;
        }
      `}</style>

      <div className="grain" />

      <div className="container">
        <header>
          <div className="filmstrip">
            {[...Array(7)].map((_, i) => <div key={i} className="frame" />)}
          </div>
          <h1>Movie <em>Night</em></h1>
          <p className="subtitle">Cast your vote · Suggest a film</p>
        </header>

        {data && !data.isOpen && (
          <div className="closed-banner">🎬 Voting is now closed</div>
        )}

        <div className="submit-area">
          <h2>Suggest a Film</h2>
          {data?.hasSubmitted ? (
            <p className="already-submitted">✓ You've already submitted a movie this session.</p>
          ) : (
            <>
              <div className="input-row">
                <input
                  type="text"
                  placeholder="e.g. Legally Blonde..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitMovie()}
                  disabled={submitting || !data?.isOpen}
                  maxLength={100}
                />
                <button
                  className="btn-submit"
                  onClick={submitMovie}
                  disabled={submitting || !input.trim() || !data?.isOpen}
                >
                  {submitting ? '...' : 'Submit'}
                </button>
              </div>
              {error && <p className="error-msg">⚠ {error}</p>}
              {flash && <p className="flash">{flash}</p>}
            </>
          )}
        </div>

        <div className="movies-section">
          <h2>The Contenders</h2>

          {!data || data.movies.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎞</div>
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

        <footer>Movie Night · Live Voting · Updates every 3s</footer>
      </div>
    </>
  )
}
