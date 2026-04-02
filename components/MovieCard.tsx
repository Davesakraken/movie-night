import { cn } from "@/lib/utils";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

interface MovieCardProps {
  rank: number;
  title: string;
  votes: number;
  maxVotes: number;
  posterUrl?: string;
  isLeader: boolean;
  isVoted: boolean;
  isVoting: boolean;
  canVote: boolean;
  canRemove: boolean;
  animationDelay: number;
  onVote: () => void;
  onRemove?: () => void;
  onPosterClick?: () => void;
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
  canRemove,
  animationDelay,
  onVote,
  onRemove,
  onPosterClick,
}: MovieCardProps) {
  const votePct = (votes / maxVotes) * 100;

  return (
    <div
      className={cn(
        "animate-[fadeIn_0.3s_ease_both] relative mb-2.5 flex items-center gap-3.5 overflow-hidden rounded-lg border border-brown/10 bg-white px-4 py-3.5",
        "shadow-[0_1px_6px_rgba(26,18,9,0.14)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(26,18,9,0.14)] hover:-translate-y-0.5",
        isLeader && "border-gold/50 bg-gradient-to-br from-white via-white to-gold/[0.04]",
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
          "w-[42px] shrink-0 text-center text-[2.8rem] font-black italic leading-none",
          isLeader ? "text-gold" : "text-brown/55",
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
          {isLeader ? "🏆 " : ""}
          {title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.67rem] tracking-[0.06em] text-brown opacity-45">
          <span>{votes === 1 ? "1 vote" : `${votes} votes`}</span>
          {canRemove && (
            <button
              className="flex items-center gap-1.5 rounded px-2 py-1 opacity-100 text-[0.72rem] font-medium text-brand-red transition-colors hover:bg-brand-red/10"
              onClick={onRemove}
              title="Remove your suggestion"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Vote button */}
      <button
        className={cn(
          "flex min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-3.5 py-2.5 font-mono transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-35",
          isVoted
            ? "border-dark bg-dark text-cream shadow-[0_2px_8px_rgba(26,18,9,0.25)]"
            : "border-brown/15 bg-transparent hover:border-gold hover:bg-gold/[0.07] hover:-translate-y-px",
        )}
        onClick={onVote}
        disabled={isVoting || !canVote}
        title={isVoted ? "Remove vote" : "Vote for this"}
      >
        <span className="text-[1.05rem] font-medium leading-none">
          {isVoting ? "…" : isVoted ? "✓" : "▲"}
        </span>
        <span className="text-[0.58rem] uppercase tracking-[0.14em] opacity-55">Vote</span>
      </button>
    </div>
  );
}
