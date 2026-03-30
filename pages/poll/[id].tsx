import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useConfirm } from '../../components/ConfirmModal'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

const playfair = 'var(--font-playfair, "Playfair Display", serif)'

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
  const [copied, setCopied] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirm()

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
      if (json.closed) { router.push('/'); return }
      setHostStatus(json.message || 'Done')
      if (json.isOpen !== undefined) {
        setData(prev => prev ? { ...prev, isOpen: json.isOpen } : prev)
      }
      if (act === 'reset') fetchSession()
      setTimeout(() => setHostStatus(''), 3000)
    }
  }

  function copyToClipboard(text: string, which: string) {
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
        <div className="flex min-h-screen items-center justify-center">
          <div className="px-6 py-12 text-center">
            <div className="mb-5 text-[2.4rem]">🎞</div>
            <h2
              className="mb-3 text-[1.6rem] text-dark"
              style={{ fontFamily: playfair }}
            >
              Poll not found
            </h2>
            <p className="mb-7 text-[0.78rem] text-brown opacity-50">
              This poll may have expired or the link is invalid.
            </p>
            <a href="/" className="text-[0.78rem] text-brand-red no-underline">
              Start a new poll
            </a>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>Movie Night</title></Head>

      {confirmDialog}

      {/* ── Poster confirmation modal ── */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-xl bg-white px-7 py-8 text-center shadow-[0_24px_64px_rgba(26,18,9,0.45)]">
            <p className="mb-4 text-[0.65rem] uppercase tracking-[0.2em] text-brown opacity-45">
              Is this the right film?
            </p>
            <img
              className="mx-auto mb-5 block h-[222px] w-[150px] rounded-md object-cover shadow-[0_6px_24px_rgba(26,18,9,0.25)]"
              src={modal.poster}
              alt={modal.title}
            />
            <div className="mb-1 text-[1.05rem] font-bold leading-snug" style={{ fontFamily: playfair }}>
              {modal.title}
            </div>
            {modal.year && (
              <div className="mb-6 text-[0.68rem] tracking-[0.12em] text-brown opacity-45">
                {modal.year}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-md bg-dark py-3 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-cream transition-colors hover:bg-brown"
                onClick={() => { setModal(null); doSubmit(modal.poster) }}
              >
                That&apos;s the one
              </button>
              <button
                className="w-full rounded-md border border-brown/15 bg-transparent py-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-brown opacity-55 transition-opacity hover:opacity-100"
                onClick={() => { setModal(null); doSubmit() }}
              >
                Wrong film, skip poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxPoster && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-dark/85 p-5"
          onClick={() => setLightboxPoster(null)}
        >
          <div
            className="relative flex w-full max-w-[340px] flex-col items-center gap-3.5"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightboxPoster.url}
              alt={lightboxPoster.title}
              className="block h-auto w-full max-w-[300px] rounded-lg shadow-[0_12px_40px_rgba(26,18,9,0.5)]"
            />
            <div className="text-center text-[1.1rem] text-cream" style={{ fontFamily: playfair }}>
              {lightboxPoster.title}
            </div>
            <button
              className="absolute -right-3.5 -top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-[0.9rem] text-white"
              onClick={() => setLightboxPoster(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[700px] px-5 py-14 pb-20">

        {/* ── Page header ── */}
        <header className="mb-13 text-center">
          <div className="mb-4.5 flex items-center justify-center gap-2.5">
            <span className="h-px w-12 bg-brown opacity-35" />
            <span className="text-[1.1rem] opacity-55">✦</span>
            <span className="h-px w-12 bg-brown opacity-35" />
          </div>
          <h1
            className="text-[clamp(2.6rem,8vw,4.2rem)] font-black leading-none tracking-tight text-dark"
            style={{ fontFamily: playfair }}
          >
            Movie <em className="italic text-brand-red">Night</em>
          </h1>
          <p className="mt-3 text-[0.7rem] uppercase tracking-[0.22em] text-brown opacity-60">
            Suggest a movie · Cast your vote
          </p>
        </header>

        {/* ── Host Panel ── */}
        {data?.isHost && (
          <div className="mb-7 rounded-[10px] border border-gold/25 bg-dark px-6 pt-6 pb-5 text-cream shadow-[0_4px_20px_rgba(26,18,9,0.25)]">
            <div className="mb-4.5 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-[1rem] font-bold tracking-[0.02em] text-gold" style={{ fontFamily: playfair }}>
                Host Panel
              </span>
              <div className="flex items-center gap-2">
                {data && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em]',
                    data.isOpen
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-brand-red/25 text-red-400',
                  )}>
                    ● {data.isOpen ? 'Voting Open' : 'Voting Closed'}
                  </span>
                )}
                <button
                  className="flex items-center p-0.5 text-red-400 opacity-50 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Close Poll',
                      message: 'Permanently close this poll and delete all data? This cannot be undone.',
                      confirmLabel: 'Close Poll',
                      danger: true,
                    })
                    if (ok) hostAction('close')
                  }}
                  disabled={hostLoading}
                  title="Close poll"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                    <line x1="12" y1="2" x2="12" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-3.5 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              <button
                className="truncate rounded-md bg-white/10 px-3.5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-cream transition-all hover:opacity-80 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => hostAction('toggle')}
                disabled={hostLoading}
              >
                {hostLoading ? '...' : data?.isOpen ? 'Pause Voting' : 'Open Voting'}
              </button>
              <button
                className="truncate rounded-md bg-brand-red/70 px-3.5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-white transition-all hover:opacity-80 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Reset Poll',
                    message: 'Reset all movies and votes? This cannot be undone.',
                    confirmLabel: 'Reset',
                    danger: true,
                  })
                  if (ok) hostAction('reset')
                }}
                disabled={hostLoading}
              >
                Reset Poll
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[{ label: 'Guest', url: shareUrl, key: 'share' }, { label: 'Host', url: hostUrl, key: 'host' }].map(({ label, url, key }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-[34px] shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-cream/40">
                    {label}
                  </span>
                  <div className="flex flex-1 items-center overflow-hidden rounded-md border border-white/[0.08] bg-black/35">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="min-w-0 flex-1 cursor-default border-none bg-transparent px-2.5 py-2 font-mono text-[0.65rem] text-cream/55 outline-none"
                    />
                    <button
                      className="shrink-0 border-l border-white/[0.08] px-2.5 py-2 text-cream/40 transition-colors hover:text-gold"
                      onClick={() => copyToClipboard(url, key)}
                      title={`Copy ${label.toLowerCase()} link`}
                    >
                      {copied === key
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hostStatus && (
              <p className="mt-2.5 min-h-[18px] text-[0.7rem] tracking-[0.04em] opacity-55">
                {hostStatus}
              </p>
            )}
          </div>
        )}

        {/* ── Closed banner (guests only) ── */}
        {data && !data.isOpen && !data.isHost && (
          <div className="mb-7 flex items-center justify-center gap-2.5 rounded-md border border-white/[0.06] bg-dark px-6 py-3.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cream">
            <span>🎬</span> Voting is now closed
          </div>
        )}

        {/* ── Suggest a Film ── */}
        <div className="mb-3 rounded-lg border border-brown/[0.12] border-t-gold border-t-[3px] bg-white px-7 pt-7 pb-6 shadow-[0_2px_16px_rgba(26,18,9,0.14)]">
          <h2 className="mb-1 text-[1.15rem] font-bold text-dark" style={{ fontFamily: playfair }}>
            Suggest a Film
          </h2>
          {data?.hasSubmitted ? (
            <p className="flex items-center gap-2 py-2 text-[0.78rem] tracking-[0.04em] text-gold">
              ✓ Your suggestion has been added.
            </p>
          ) : (
            <>
              <p className="mb-4.5 text-[0.7rem] tracking-[0.04em] text-brown opacity-50">
                One suggestion per session
              </p>
              <div className="flex gap-2.5 max-sm:flex-col">
                <Input
                  type="text"
                  placeholder="e.g. Legally Blonde..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitClick()}
                  disabled={busy || !data?.isOpen}
                  maxLength={100}
                  className="flex-1 border-brown/[0.18] bg-cream font-mono text-[0.85rem] text-dark placeholder:opacity-35 focus-visible:border-gold focus-visible:ring-gold/12"
                />
                <button
                  className="whitespace-nowrap rounded-md bg-brand-red px-5 py-3 font-mono text-[0.78rem] uppercase tracking-[0.1em] text-white transition-all hover:bg-[#a93226] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(192,57,43,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-sm:w-full"
                  onClick={handleSubmitClick}
                  disabled={busy || !input.trim() || !data?.isOpen}
                >
                  {busy ? '...' : 'Submit'}
                </button>
              </div>
              {error && <p className="mt-3 text-[0.74rem] tracking-[0.03em] text-brand-red">⚠ {error}</p>}
              {flash && <p className="mt-3 text-[0.74rem] tracking-[0.03em] text-gold">{flash}</p>}
            </>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="my-9 flex items-center gap-3.5">
          <span className="h-px flex-1 bg-brown opacity-20" />
          <span className="text-[0.9rem] opacity-40">✦</span>
          <span className="h-px flex-1 bg-brown opacity-20" />
        </div>

        {/* ── The Contenders ── */}
        <div>
          <h2 className="mb-4 text-[1.5rem] font-bold text-dark" style={{ fontFamily: playfair }}>
            The Contenders
          </h2>
          {data && data.movies.length > 0 && (
            <p className="mb-5 text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-45">
              {data.movies.length} film{data.movies.length !== 1 ? 's' : ''} in the running
            </p>
          )}

          {!data || data.movies.length === 0 ? (
            <div className="px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
              <div className="mb-3.5 text-[2.2rem]">🎞</div>
              No films yet — be the first to suggest one!
            </div>
          ) : (
            data.movies.map((movie, i) => {
              const isLeader = i === 0 && movie.votes > 0
              const isVoted = votedFor === movie.id
              const votePct = (movie.votes / maxVotes) * 100

              return (
                <div
                  key={movie.id}
                  className={cn(
                    'animate-[fadeIn_0.3s_ease_both] relative mb-2.5 flex items-center gap-3.5 overflow-hidden rounded-lg border border-brown/10 bg-white px-4 py-3.5',
                    'shadow-[0_1px_6px_rgba(26,18,9,0.14)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(26,18,9,0.14)] hover:-translate-y-0.5',
                    isLeader && 'border-gold/50 bg-gradient-to-br from-white via-white to-gold/[0.04]',
                  )}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Vote bar */}
                  <div
                    className="absolute bottom-0 left-0 h-[3px] rounded-[0_2px_0_6px] bg-gradient-to-r from-gold to-brand-red transition-[width] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ width: `${votePct}%` }}
                  />

                  {/* Rank */}
                  <span
                    className={cn(
                      'w-[42px] shrink-0 text-center text-[2.8rem] font-black italic leading-none',
                      isLeader ? 'text-gold' : 'text-brown/55',
                    )}
                    style={{ fontFamily: playfair }}
                  >
                    {i + 1}
                  </span>

                  {/* Poster thumbnail */}
                  {movie.posterUrl && (
                    <img
                      className="h-14 w-[38px] shrink-0 cursor-pointer rounded-sm object-cover shadow-[0_2px_6px_rgba(26,18,9,0.2)]"
                      src={movie.posterUrl}
                      alt={movie.title}
                      onClick={() => setLightboxPoster({ url: movie.posterUrl!, title: movie.title })}
                    />
                  )}

                  {/* Movie info */}
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[1rem] font-bold leading-snug"
                      style={{ fontFamily: playfair }}
                    >
                      {isLeader ? '🏆 ' : ''}{movie.title}
                    </div>
                    <div className="mt-0.5 text-[0.67rem] tracking-[0.06em] text-brown opacity-45">
                      {movie.votes === 1 ? '1 vote' : `${movie.votes} votes`}
                    </div>
                  </div>

                  {/* Vote button */}
                  <button
                    className={cn(
                      'flex shrink-0 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-lg border px-3.5 py-2.5 font-mono transition-all duration-150',
                      'disabled:cursor-not-allowed disabled:opacity-35',
                      isVoted
                        ? 'border-dark bg-dark text-cream shadow-[0_2px_8px_rgba(26,18,9,0.25)]'
                        : 'border-brown/15 bg-transparent hover:border-gold hover:bg-gold/[0.07] hover:-translate-y-px',
                    )}
                    onClick={() => vote(movie.id)}
                    disabled={!!voting || !data.isOpen}
                    title={isVoted ? 'Remove vote' : 'Vote for this'}
                  >
                    <span className="text-[1.05rem] font-medium leading-none">
                      {voting === movie.id ? '…' : isVoted ? '✓' : '▲'}
                    </span>
                    <span className="text-[0.58rem] uppercase tracking-[0.14em] opacity-55">Vote</span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
