import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'

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
      </Head>

      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-[480px] px-6 py-12 text-center">

          {/* Header ornament */}
          <div className="mb-5 flex items-center justify-center gap-2.5">
            <span className="h-px w-12 bg-brown opacity-35" />
            <span className="text-lg opacity-55">✦</span>
            <span className="h-px w-12 bg-brown opacity-35" />
          </div>

          <h1
            className="mb-3.5 text-[clamp(2.6rem,10vw,4.2rem)] font-black leading-none tracking-tight text-dark"
            style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
          >
            Movie <em className="font-black not-italic text-brand-red">Night</em>
          </h1>

          <p className="mb-[52px] text-[0.72rem] uppercase leading-relaxed tracking-[0.18em] text-brown opacity-55">
            Pick a film · Cast your vote<br />
            Start a poll and share it with your group
          </p>

          <button
            onClick={handleHostPoll}
            disabled={loading}
            className={cn(
              'inline-flex items-center justify-center gap-2.5 rounded-lg border-none',
              'bg-dark px-10 py-4 font-mono text-[0.85rem] uppercase tracking-[0.14em] text-cream',
              'shadow-[0_4px_18px_rgba(26,18,9,0.2)] transition-all duration-200',
              'not-disabled:hover:bg-brown not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-[0_8px_28px_rgba(26,18,9,0.28)]',
              'not-disabled:active:translate-y-0',
              'disabled:cursor-not-allowed disabled:opacity-55',
            )}
          >
            {loading ? (
              <>
                <span className="opacity-60">Creating</span>
                <span>...</span>
              </>
            ) : (
              <span>Host a Poll</span>
            )}
          </button>

          {error && (
            <p className="mt-4 text-[0.74rem] tracking-[0.03em] text-brand-red">
              ⚠ {error}
            </p>
          )}

          <p className="mt-5 text-[0.67rem] leading-[1.7] tracking-[0.06em] text-brown opacity-40">
            You&apos;ll get a shareable link for your guests.<br />
            Polls expire after 24 hours.
          </p>

          {/* Footer ornament */}
          <div className="mt-14 flex items-center justify-center gap-2.5 opacity-20">
            <span className="h-px w-8 bg-brown" />
            <span>✦</span>
            <span className="h-px w-8 bg-brown" />
          </div>

        </div>
      </div>
    </>
  )
}
