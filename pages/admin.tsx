import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Admin() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState<boolean | null>(null)

  async function fetchStatus() {
    const res = await fetch('/api/session')
    const data = await res.json()
    setIsOpen(data.isOpen)
  }

  async function action(act: string) {
    setLoading(true)
    setStatus('')
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, adminKey: key }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setStatus('❌ ' + data.error)
      if (res.status === 401) setAuthed(false)
    } else {
      setStatus('✓ ' + data.message || 'Done')
      if (data.isOpen !== undefined) setIsOpen(data.isOpen)
    }
  }

  function unlock() {
    if (!key.trim()) return
    fetchStatus().then(() => setAuthed(true))
  }

  return (
    <>
      <Head>
        <title>Admin — Movie Night</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #1a1209;
          color: #f5efe0;
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          background: #231810;
          border: 1px solid rgba(201,149,42,0.2);
          border-radius: 8px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
        }
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 900;
          margin-bottom: 8px;
          color: #c9952a;
        }
        .sub {
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0.4;
          margin-bottom: 32px;
        }
        input[type="password"], input[type="text"] {
          width: 100%;
          padding: 12px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(201,149,42,0.3);
          border-radius: 4px;
          color: #f5efe0;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          margin-bottom: 14px;
          transition: border-color 0.2s;
        }
        input:focus { border-color: #c9952a; }
        button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          margin-bottom: 10px;
        }
        button:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary { background: #c9952a; color: #1a1209; font-weight: 500; }
        .btn-danger { background: #c0392b; color: white; }
        .btn-neutral { background: rgba(255,255,255,0.08); color: #f5efe0; }
        .status {
          margin-top: 16px;
          font-size: 0.75rem;
          opacity: 0.7;
          letter-spacing: 0.05em;
          min-height: 20px;
        }
        .state-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 3px;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .open { background: rgba(39,174,96,0.2); color: #2ecc71; }
        .closed { background: rgba(192,57,43,0.2); color: #e74c3c; }
        .back { display: block; text-align: center; margin-top: 20px; font-size: 0.72rem; color: #c9952a; opacity: 0.6; text-decoration: none; letter-spacing: 0.1em; }
        .back:hover { opacity: 1; }
      `}</style>

      <div className="card">
        <h1>Host Panel</h1>
        <p className="sub">Movie Night Admin</p>

        {!authed ? (
          <>
            <input
              type="password"
              placeholder="Admin key..."
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && unlock()}
            />
            <button className="btn-primary" onClick={unlock}>Unlock</button>
            {status && <p className="status">{status}</p>}
          </>
        ) : (
          <>
            {isOpen !== null && (
              <span className={`state-badge ${isOpen ? 'open' : 'closed'}`}>
                {isOpen ? '● Voting Open' : '● Voting Closed'}
              </span>
            )}

            <button
              className="btn-neutral"
              onClick={() => action('toggle')}
              disabled={loading}
            >
              {loading ? '...' : isOpen ? 'Close Voting' : 'Open Voting'}
            </button>

            <button
              className="btn-danger"
              onClick={() => {
                if (confirm('Reset all movies and votes? This cannot be undone.')) {
                  action('reset')
                }
              }}
              disabled={loading}
            >
              Reset Session
            </button>

            {status && <p className="status">{status}</p>}
          </>
        )}

        <Link href="/" className="back">← Back to voting</Link>
      </div>
    </>
  )
}
