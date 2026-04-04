import { cn } from "@/lib/utils";
import type { Movie } from "@/lib/types";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

interface WinnersDisplayProps {
  movies: Movie[];
}

export function WinnersDisplay({ movies }: WinnersDisplayProps) {
  if (movies.length === 0) {
    return (
      <div className="animate-[fadeIn_0.5s_ease_both] px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
        <div className="mb-3.5 text-[2.2rem]">🎞</div>
        No films were in the running.
      </div>
    );
  }

  const topVotes = movies[0].votes;

  if (topVotes === 0) {
    return (
      <div className="animate-[fadeIn_0.5s_ease_both] px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
        <div className="mb-3.5 text-[2.2rem]">🫙</div>
        No votes were cast.
      </div>
    );
  }

  const winners = movies.filter((m) => m.votes === topVotes);
  const isTie = winners.length > 1;
  const runnerUp = movies.find((m) => m.votes < topVotes) ?? null;

  return (
    <div>
      {/* Header */}
      <p
        className="animate-[fadeIn_0.5s_ease_both] mb-5 flex items-center justify-center gap-2 text-[2rem] font-bold tracking-tight text-dark"
        style={{ fontFamily: playfair }}
      >
        <span>{isTie ? "🤝" : "🎬"}</span>
        {isTie ? "It's a tie!" : "And the winner is…"}
      </p>

      {/* Winner card(s) */}
      <div className="flex flex-col gap-3">
        {winners.map((movie, i) => (
          <WinnerCard key={movie.id} movie={movie} index={i} isTie={isTie} />
        ))}
      </div>

      {/* Runner-up */}
      {runnerUp && (
        <div
          className="animate-[fadeIn_0.4s_ease_both] mt-5 flex items-center gap-3 rounded-lg border border-brown/10 bg-white/60 px-4 py-3"
          style={{ animationDelay: "0.6s", animationFillMode: "both" }}
        >
          <span className="text-[1.4rem]">🥈</span>
          <div className="min-w-0 flex-1">
            <span
              className="block truncate text-[0.82rem] font-semibold text-dark/70"
              style={{ fontFamily: playfair }}
            >
              {runnerUp.title}
            </span>
            <span className="text-[0.63rem] uppercase tracking-[0.1em] text-brown opacity-45">
              Runner-up &middot; {runnerUp.votes} vote{runnerUp.votes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Winner card ──────────────────────────────────────────────────

interface WinnerCardProps {
  movie: Movie;
  index: number;
  isTie: boolean;
}

function WinnerCard({ movie, index, isTie }: WinnerCardProps) {
  return (
    <div
      className={cn(
        "animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]",
        "relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-br from-white via-white to-gold/[0.06]",
        "px-5 py-4 shadow-[0_4px_20px_rgba(26,18,9,0.12)]",
        "flex items-center gap-4",
      )}
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      {/* Shimmer vote bar */}
      <div
        className="absolute bottom-0 left-0 h-[3px] w-full rounded-[0_2px_0_8px]"
        style={{
          background: "linear-gradient(90deg, #c9952a, #e8b84b, #c9952a, #e8b84b)",
          backgroundSize: "200% auto",
          animation: "shimmer 2.4s linear infinite",
          animationDelay: `${index * 0.12 + 0.5}s`,
        }}
      />

      {/* Medal */}
      <span className="shrink-0 text-[2.4rem] leading-none">
        {isTie ? "🥇" : "🏆"}
      </span>

      {/* Poster */}
      {movie.posterUrl && (
        <img
          className="h-24 w-16 shrink-0 rounded-sm object-cover shadow-[0_3px_10px_rgba(26,18,9,0.22)]"
          src={movie.posterUrl}
          alt={movie.title}
        />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[1.2rem] font-bold leading-snug text-dark"
          style={{ fontFamily: playfair }}
        >
          {movie.title}
        </div>
        <div className="mt-1 text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-55">
          {movie.votes} vote{movie.votes !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
