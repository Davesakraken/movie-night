import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleHostPoll() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-poll', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create poll')
      const { pollId, hostToken } = await res.json()
      router.push(`/poll/${pollId}?host=${hostToken}`)
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
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
          display: flex;
          align-items: center;
          justify-content: center;
          background-image:
            radial-gradient(ellipse at 15% 0%, rgba(201,149,42,0.15) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 100%, rgba(192,57,43,0.1) 0%, transparent 55%);
        }

        .container {
          max-width: 480px;
          width: 100%;
          padding: 48px 24px;
          text-align: center;
        }

        .header-ornament {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
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
          font-size: clamp(2.6rem, 10vw, 4.2rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--dark);
          margin-bottom: 14px;
        }

        h1 em {
          font-style: italic;
          color: var(--red);
        }

        .tagline {
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--brown);
          opacity: 0.55;
          margin-bottom: 52px;
          line-height: 1.8;
        }

        .btn-host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 40px;
          background: var(--dark);
          color: var(--cream);
          border: none;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 18px rgba(26,18,9,0.2);
        }

        .btn-host:hover:not(:disabled) {
          background: var(--brown);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(26,18,9,0.28);
        }

        .btn-host:active:not(:disabled) { transform: translateY(0); }

        .btn-host:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .hint {
          margin-top: 22px;
          font-size: 0.67rem;
          color: var(--brown);
          opacity: 0.4;
          letter-spacing: 0.06em;
          line-height: 1.7;
        }

        .error-msg {
          margin-top: 16px;
          font-size: 0.74rem;
          color: var(--red);
          letter-spacing: 0.03em;
        }

        .ornament-footer {
          margin-top: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 0.2;
        }
        .ornament-footer::before,
        .ornament-footer::after {
          content: '';
          width: 32px;
          height: 1px;
          background: var(--brown);
        }
      `}</style>

      <div className="container">
        <div className="header-ornament"><span>✦</span></div>
        <h1>Movie <em>Night</em></h1>
        <p className="tagline">
          Pick a film · Cast your vote<br />
          Start a poll and share it with your group
        </p>

        <button className="btn-host" onClick={handleHostPoll} disabled={loading}>
          {loading ? (
            <>
              <span style={{ opacity: 0.6 }}>Creating</span>
              <span>...</span>
            </>
          ) : (
            <>
              <span>Host a Poll</span>
            </>
          )}
        </button>

        {error && <p className="error-msg">⚠ {error}</p>}

        <p className="hint">
          You&apos;ll get a shareable link for your guests.<br />
          Polls expire after 24 hours.
        </p>

        <div className="ornament-footer"><span>✦</span></div>
      </div>
    </>
  )
}
