import { cn } from '@/lib/utils'

const playfair = 'var(--font-playfair, "Playfair Display", serif)'

interface MovieCardProps {
  rank: number
  title: string
  votes: number
  maxVotes: number
  posterUrl?: string
  isLeader: boolean
  isVoted: boolean
  isVoting: boolean
  canVote: boolean
  animationDelay: number
  onVote: () => void
  onPosterClick?: () => void
}

export function MovieCard({
  rank,
  title,
  votes,
  maxVotes,
  posterUrl,
  isLeader,
  isVoted,
  isVoting,
  canVote,
  animationDelay,
  onVote,
  onPosterClick,
}: MovieCardProps) {
  const votePct = (votes / maxVotes) * 100

  return (
    <div
      className={cn(
        'animate-[fadeIn_0.3s_ease_both] relative mb-2.5 flex items-center gap-3.5 overflow-hidden rounded-lg border border-brown/10 bg-white px-4 py-3.5',
        'shadow-[0_1px_6px_rgba(26,18,9,0.14)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(26,18,9,0.14)] hover:-translate-y-0.5',
        isLeader && 'border-gold/50 bg-gradient-to-br from-white via-white to-gold/[0.04]',
      )}
      style={{ animationDelay: `${animationDelay}s` }}
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
        {rank}
      </span>

      {/* Poster thumbnail */}
      {posterUrl && (
        <img
          className="h-14 w-[38px] shrink-0 cursor-pointer rounded-sm object-cover shadow-[0_2px_6px_rgba(26,18,9,0.2)]"
          src={posterUrl}
          alt={title}
          onClick={onPosterClick}
        />
      )}

      {/* Movie info */}
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[1rem] font-bold leading-snug"
          style={{ fontFamily: playfair }}
        >
          {isLeader ? '🏆 ' : ''}{title}
        </div>
        <div className="mt-0.5 text-[0.67rem] tracking-[0.06em] text-brown opacity-45">
          {votes === 1 ? '1 vote' : `${votes} votes`}
        </div>
      </div>

      {/* Vote button */}
      <button
        className={cn(
          'flex min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-3.5 py-2.5 font-mono transition-all duration-150',
          'disabled:cursor-not-allowed disabled:opacity-35',
          isVoted
            ? 'border-dark bg-dark text-cream shadow-[0_2px_8px_rgba(26,18,9,0.25)]'
            : 'border-brown/15 bg-transparent hover:border-gold hover:bg-gold/[0.07] hover:-translate-y-px',
        )}
        onClick={onVote}
        disabled={isVoting || !canVote}
        title={isVoted ? 'Remove vote' : 'Vote for this'}
      >
        <span className="text-[1.05rem] font-medium leading-none">
          {isVoting ? '…' : isVoted ? '✓' : '▲'}
        </span>
        <span className="text-[0.58rem] uppercase tracking-[0.14em] opacity-55">Vote</span>
      </button>
    </div>
  )
}
