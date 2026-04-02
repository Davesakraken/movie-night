import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useConfirm } from '../../components/ConfirmModal'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Ornament } from '@/components/Ornament'
import { MovieCard } from '@/components/MovieCard'
import { CopyLinkRow } from '@/components/CopyLinkRow'
import type { PollConfig } from '@/lib/store'

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
  config: PollConfig
  hasSubmitted: boolean
  submittedMovieIds: string[]
  votedMovieIds: string[]
  isHost: boolean
}

interface PosterModal {
  poster: string
  title: string
  year: string
}

const playfair = 'var(--font-playfair, "Playfair Display", serif)'

// ── Toggle switch ────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-gold' : 'bg-white/20',
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
        checked && 'translate-x-4',
      )} />
    </button>
  )
}

// ── Component ───────────────────────────────────────────────────
export default function PollPage() {
  const router = useRouter()
  const { id: pollId, host: hostToken } = router.query as { id?: string; host?: string }

  const [data, setData] = useState<SessionData | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set())
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
    const res = await fetch(`/api/poll/session?${params}`)
    if (res.status === 404) { setNotFound(true); return }
    const json = await res.json()
    setData(json)
    setVotedFor(new Set(json.votedMovieIds ?? []))
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
      const res = await fetch(`/api/movies/search?title=${encodeURIComponent(input.trim())}`)
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
    const res = await fetch('/api/poll/submit', {
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
    const res = await fetch('/api/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, movieId }),
    })
    setVoting(null)
    if (res.ok) {
      setVotedFor(prev => {
        const next = new Set(prev)
        if (next.has(movieId)) next.delete(movieId)
        else next.add(movieId)
        return next
      })
      fetchSession()
    } else {
      const json = await res.json()
      setError(json.error || 'Could not vote')
      setTimeout(() => setError(''), 3000)
    }
  }

  async function remove(movieId: string) {
    setRemoving(movieId)
    const res = await fetch('/api/poll/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, movieId }),
    })
    setRemoving(null)
    if (res.ok) {
      setFlash('Suggestion removed.')
      setTimeout(() => setFlash(null), 2500)
      fetchSession()
    } else {
      const json = await res.json()
      setError(json.error || 'Could not remove suggestion')
      setTimeout(() => setError(''), 3000)
    }
  }

  async function hostAction(act: string, extra?: Record<string, unknown>) {
    setHostLoading(true)
    setHostStatus('')
    const res = await fetch('/api/poll/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, pollId, hostToken, ...extra }),
    })
    const json = await res.json()
    setHostLoading(false)
    if (!res.ok) {
      setHostStatus('Error: ' + json.error)
    } else {
      if (json.closed) { router.push('/'); return }
      setHostStatus(json.message || '')
      if (json.isOpen !== undefined) {
        setData(prev => prev ? { ...prev, isOpen: json.isOpen } : prev)
      }
      if (json.config) {
        setData(prev => prev ? { ...prev, config: json.config } : prev)
      }
      if (act === 'reset') fetchSession()
      if (hostStatus) setTimeout(() => setHostStatus(''), 3000)
    }
  }

  async function updateConfig(patch: Partial<PollConfig>) {
    await hostAction('updateConfig', { config: { ...(data?.config ?? {}), ...patch } })
  }

  function copyToClipboard(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}` : ''
  const hostUrl  = typeof window !== 'undefined' ? `${window.location.origin}/poll/${pollId}?host=${hostToken}` : ''
  const maxVotes = data ? Math.max(...data.movies.map(m => m.votes), 1) : 1
  const busy = submitting || fetchingPoster

  const config = data?.config
  const maxVotesPerUser = config ? config.maxVotesPerUser : 1
  const remainingVotes = maxVotesPerUser === null ? Infinity : maxVotesPerUser - votedFor.size
  const maxSuggestions = config ? config.maxSuggestionsPerUser : 1
  const submittedCount = data?.submittedMovieIds.length ?? 0
  const canStillSuggest = maxSuggestions === null || submittedCount < maxSuggestions

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
          <Ornament className="mb-4.5" />
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

            {/* Header row */}
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

            {/* Action buttons */}
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

            {/* Share links */}
            <div className="flex flex-col gap-2">
              <CopyLinkRow label="Guest" url={shareUrl} copied={copied === 'share'} onCopy={() => copyToClipboard(shareUrl, 'share')} />
              <CopyLinkRow label="Host"  url={hostUrl}  copied={copied === 'host'}  onCopy={() => copyToClipboard(hostUrl, 'host')} />
            </div>

            {/* ── Poll Settings ── */}
            {config && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-3.5 text-[0.6rem] uppercase tracking-[0.16em] text-cream/40">
                  Poll Settings
                </p>
                <div className="flex flex-col gap-4">

                  {/* Allow multiple votes */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.72rem] tracking-[0.03em] text-cream/80">Allow multiple votes</span>
                      <Toggle
                        checked={config.maxVotesPerUser !== 1}
                        onChange={() => updateConfig({
                          maxVotesPerUser: config.maxVotesPerUser === 1 ? 3 : 1,
                        })}
                      />
                    </div>
                    {config.maxVotesPerUser !== 1 && (
                      <div className="mt-2.5 flex items-center gap-3 pl-1">
                        <span className="text-[0.65rem] text-cream/45">Max per person</span>
                        <input
                          key={String(config.maxVotesPerUser)}
                          type="number"
                          min={2}
                          max={100}
                          defaultValue={config.maxVotesPerUser ?? 3}
                          onBlur={e => {
                            const v = parseInt(e.target.value, 10)
                            if (v >= 2) updateConfig({ maxVotesPerUser: v })
                          }}
                          disabled={config.maxVotesPerUser === null}
                          className="w-14 rounded border border-white/15 bg-white/8 px-2 py-1 font-mono text-[0.68rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-30"
                        />
                        <label className="flex cursor-pointer items-center gap-1.5 text-[0.65rem] text-cream/55">
                          <input
                            key={`nolimit-votes-${String(config.maxVotesPerUser)}`}
                            type="checkbox"
                            defaultChecked={config.maxVotesPerUser === null}
                            onChange={e => updateConfig({ maxVotesPerUser: e.target.checked ? null : 3 })}
                            className="accent-gold"
                          />
                          No limit
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Allow multiple suggestions */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.72rem] tracking-[0.03em] text-cream/80">Allow multiple suggestions</span>
                      <Toggle
                        checked={config.maxSuggestionsPerUser !== 1}
                        onChange={() => updateConfig({
                          maxSuggestionsPerUser: config.maxSuggestionsPerUser === 1 ? 3 : 1,
                        })}
                      />
                    </div>
                    {config.maxSuggestionsPerUser !== 1 && (
                      <div className="mt-2.5 flex items-center gap-3 pl-1">
                        <span className="text-[0.65rem] text-cream/45">Max per person</span>
                        <input
                          key={String(config.maxSuggestionsPerUser)}
                          type="number"
                          min={2}
                          max={100}
                          defaultValue={config.maxSuggestionsPerUser ?? 3}
                          onBlur={e => {
                            const v = parseInt(e.target.value, 10)
                            if (v >= 2) updateConfig({ maxSuggestionsPerUser: v })
                          }}
                          disabled={config.maxSuggestionsPerUser === null}
                          className="w-14 rounded border border-white/15 bg-white/8 px-2 py-1 font-mono text-[0.68rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-30"
                        />
                        <label className="flex cursor-pointer items-center gap-1.5 text-[0.65rem] text-cream/55">
                          <input
                            key={`nolimit-suggestions-${String(config.maxSuggestionsPerUser)}`}
                            type="checkbox"
                            defaultChecked={config.maxSuggestionsPerUser === null}
                            onChange={e => updateConfig({ maxSuggestionsPerUser: e.target.checked ? null : 3 })}
                            className="accent-gold"
                          />
                          No limit
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Allow removal */}
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.72rem] tracking-[0.03em] text-cream/80">Allow removal</span>
                      <Toggle
                        checked={config.allowRemoval}
                        onChange={() => updateConfig({ allowRemoval: !config.allowRemoval })}
                      />
                    </div>
                    {config.allowRemoval && (
                      <div className="mt-2.5 flex items-center gap-3 pl-1">
                        <span className="text-[0.65rem] text-cream/45">Time window</span>
                        <select
                          value={config.removalWindowMinutes === null ? 'unlimited' : 'timed'}
                          onChange={e => updateConfig({
                            removalWindowMinutes: e.target.value === 'unlimited' ? null : 10,
                          })}
                          className="rounded border border-white/15 bg-white/8 px-2 py-1 font-mono text-[0.68rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40"
                        >
                          <option value="unlimited">Any time</option>
                          <option value="timed">Within</option>
                        </select>
                        {config.removalWindowMinutes !== null && (
                          <>
                            <input
                              key={config.removalWindowMinutes}
                              type="number"
                              min={1}
                              max={1440}
                              defaultValue={config.removalWindowMinutes}
                              onBlur={e => {
                                const v = parseInt(e.target.value, 10)
                                if (v >= 1) updateConfig({ removalWindowMinutes: v })
                              }}
                              className="w-14 rounded border border-white/15 bg-white/8 px-2 py-1 font-mono text-[0.68rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40"
                            />
                            <span className="text-[0.65rem] text-cream/45">min</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

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

          {!canStillSuggest ? (
            <p className="flex items-center gap-2 py-2 text-[0.78rem] tracking-[0.04em] text-gold">
              ✓ {maxSuggestions === 1
                ? 'Your suggestion has been added.'
                : `You've submitted all ${maxSuggestions} suggestions.`}
            </p>
          ) : (
            <>
              <p className="mb-4.5 text-[0.7rem] tracking-[0.04em] text-brown opacity-50">
                {maxSuggestions === null
                  ? submittedCount > 0 ? `${submittedCount} submitted — add more anytime` : 'Unlimited suggestions'
                  : maxSuggestions === 1
                    ? 'One suggestion per session'
                    : `${submittedCount} of ${maxSuggestions} suggestions used`}
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
                  className="h-8 whitespace-nowrap rounded-md bg-brand-red px-5 font-mono text-[0.78rem] uppercase tracking-[0.1em] text-white transition-all hover:bg-[#a93226] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(192,57,43,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-sm:h-auto max-sm:w-full max-sm:py-3"
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

        <Ornament variant="fill" />

        {/* ── The Contenders ── */}
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[1.5rem] font-bold text-dark" style={{ fontFamily: playfair }}>
              The Contenders
            </h2>
            {data?.isOpen && maxVotesPerUser !== 1 && (
              <span className="text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-45">
                {maxVotesPerUser === null
                  ? `${votedFor.size} vote${votedFor.size !== 1 ? 's' : ''} cast`
                  : remainingVotes > 0
                    ? `${remainingVotes} vote${remainingVotes !== 1 ? 's' : ''} remaining`
                    : 'All votes cast'}
              </span>
            )}
          </div>
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
              const isMyMovie = data.submittedMovieIds.includes(movie.id)
              const withinWindow = config?.removalWindowMinutes === null
                || (config?.removalWindowMinutes != null
                  && Date.now() - movie.submittedAt <= config.removalWindowMinutes * 60 * 1000)
              const canRemove = isMyMovie && (config?.allowRemoval ?? false) && withinWindow
                && removing !== movie.id

              return (
                <MovieCard
                  key={movie.id}
                  rank={i + 1}
                  title={movie.title}
                  votes={movie.votes}
                  maxVotes={maxVotes}
                  posterUrl={movie.posterUrl}
                  isLeader={i === 0 && movie.votes > 0}
                  isVoted={votedFor.has(movie.id)}
                  isVoting={voting === movie.id}
                  canVote={data.isOpen && (votedFor.has(movie.id) || remainingVotes > 0)}
                  canRemove={canRemove}
                  animationDelay={i * 0.05}
                  onVote={() => vote(movie.id)}
                  onRemove={() => remove(movie.id)}
                  onPosterClick={movie.posterUrl ? () => setLightboxPoster({ url: movie.posterUrl!, title: movie.title }) : undefined}
                />
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
