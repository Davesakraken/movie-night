import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { useConfirm } from "../../components/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Ornament } from "@/components/Ornament";
import { MovieCard } from "@/components/MovieCard";
import { FloatingHostPanel } from "@/components/FloatingHostPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getPoll } from "@/lib/store";
import { verifyAccessToken } from "@/lib/api";
import type { PollConfig, SessionData, PosterModal } from "@/lib/types";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

// ── Component ───────────────────────────────────────────────────
export default function PollPage() {
  const router = useRouter();
  const { id: pollId, host: hostToken } = router.query as { id?: string; host?: string };

  const [data, setData] = useState<SessionData | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [modal, setModal] = useState<PosterModal | null>(null);
  const [lightboxPoster, setLightboxPoster] = useState<{ url: string; title: string } | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostStatus, setHostStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const isDesktop = useMediaQuery("(min-width: 1300px)");

  const fetchSession = useCallback(async () => {
    if (!pollId) return;
    const params = new URLSearchParams({ pollId });
    if (hostToken) params.set("hostToken", hostToken);
    const res = await fetch(`/api/poll/session?${params}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const json = await res.json();
    setData(json);
    setVotedFor(new Set(json.votedMovieIds ?? []));
  }, [pollId, hostToken]);

  useEffect(() => {
    if (!router.isReady) return;
    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [router.isReady, fetchSession]);

  async function handleSubmitClick() {
    if (!input.trim()) return;
    setFetchingPoster(true);
    setError("");
    try {
      const res = await fetch(`/api/movies/search?title=${encodeURIComponent(input.trim())}`);
      const json = await res.json();
      if (json.poster) {
        setModal({ poster: json.poster, title: json.title || input.trim(), year: json.year || "" });
        setFetchingPoster(false);
        return;
      }
    } catch {}
    setFetchingPoster(false);
    await doSubmit();
  }

  async function doSubmit(posterUrl?: string) {
    setSubmitting(true);
    const res = await fetch("/api/poll/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, title: input.trim(), posterUrl }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error);
    } else {
      setInput("");
      setFlash("Movie added!");
      setTimeout(() => setFlash(null), 2500);
      fetchSession();
    }
  }

  async function vote(movieId: string) {
    setVoting(movieId);
    const res = await fetch("/api/poll/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, movieId }),
    });
    setVoting(null);
    if (res.ok) {
      setVotedFor((prev) => {
        const next = new Set(prev);
        if (next.has(movieId)) next.delete(movieId);
        else next.add(movieId);
        return next;
      });
      fetchSession();
    } else {
      const json = await res.json();
      setError(json.error || "Could not vote");
      setTimeout(() => setError(""), 3000);
    }
  }

  async function remove(movieId: string) {
    setRemoving(movieId);
    const res = await fetch("/api/poll/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, movieId }),
    });
    setRemoving(null);
    if (res.ok) {
      setFlash("Suggestion removed.");
      setTimeout(() => setFlash(null), 2500);
      fetchSession();
    } else {
      const json = await res.json();
      setError(json.error || "Could not remove suggestion");
      setTimeout(() => setError(""), 3000);
    }
  }

  async function hostAction(act: string, extra?: Record<string, unknown>) {
    setHostLoading(true);
    setHostStatus("");
    const res = await fetch("/api/poll/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, pollId, hostToken, ...extra }),
    });
    const json = await res.json();
    setHostLoading(false);
    if (!res.ok) {
      setHostStatus("Error: " + json.error);
    } else {
      if (json.closed) {
        router.push("/");
        return;
      }
      setHostStatus(json.message || "");
      if (json.isOpen !== undefined) {
        setData((prev) => (prev ? { ...prev, isOpen: json.isOpen } : prev));
      }
      if (json.config) {
        setData((prev) => (prev ? { ...prev, config: json.config, ...(json.passwordProtected !== undefined ? { passwordProtected: json.passwordProtected } : {}) } : prev));
      }
      if (act === "reset") fetchSession();
      if (hostStatus) setTimeout(() => setHostStatus(""), 3000);
    }
  }

  async function updateConfig(patch: Partial<PollConfig>) {
    await hostAction("updateConfig", { config: { ...(data?.config ?? {}), ...patch } });
  }

  function copyToClipboard(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/poll/${pollId}` : "";

  const maxVotes = data ? Math.max(...(data.movies ?? []).map((m) => m.votes), 1) : 1;
  const busy = submitting || fetchingPoster;

  const config = data?.config;
  const maxVotesPerUser = config ? config.maxVotesPerUser : 1;
  const remainingVotes = maxVotesPerUser === null ? Infinity : maxVotesPerUser - votedFor.size;
  const maxSuggestions = config ? config.maxSuggestionsPerUser : 1;
  const submittedCount = data?.submittedMovieIds?.length ?? 0;
  const canStillSuggest = maxSuggestions === null || submittedCount < maxSuggestions;

  if (notFound) {
    return (
      <>
        <Head>
          <title>Poll Not Found — Movie Night</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center">
          <div className="px-6 py-12 text-center">
            <div className="mb-5 text-[2.4rem]">🎞</div>
            <h2 className="mb-3 text-[1.6rem] text-dark" style={{ fontFamily: playfair }}>
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
    );
  }

  return (
    <>
      <Head>
        <title>Movie Night</title>
      </Head>

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
            <div
              className="mb-1 text-[1.05rem] font-bold leading-snug"
              style={{ fontFamily: playfair }}
            >
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
                onClick={() => {
                  setModal(null);
                  doSubmit(modal.poster);
                }}
              >
                That&apos;s the one
              </button>
              <button
                className="w-full rounded-md border border-brown/15 bg-transparent py-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-brown opacity-55 transition-opacity hover:opacity-100"
                onClick={() => {
                  setModal(null);
                  doSubmit();
                }}
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
            onClick={(e) => e.stopPropagation()}
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
          <div className={isDesktop ? undefined : "mb-6"}>
            <FloatingHostPanel
              mode={isDesktop ? "floating" : "inline"}
              data={data}
              hostLoading={hostLoading}
              hostStatus={hostStatus}
              copied={copied}
              shareUrl={shareUrl}
              onToggle={() => hostAction("toggle")}
              onReset={async () => {
                const ok = await confirm({
                  title: "Reset Poll",
                  message: "Reset all movies and votes? This cannot be undone.",
                  confirmLabel: "Reset",
                  danger: true,
                });
                if (ok) hostAction("reset");
              }}
              onClose={async () => {
                const ok = await confirm({
                  title: "Close Poll",
                  message:
                    "Permanently close this poll and delete all data? This cannot be undone.",
                  confirmLabel: "Close Poll",
                  danger: true,
                });
                if (ok) hostAction("close");
              }}
              onUpdateConfig={updateConfig}
              onCopy={copyToClipboard}
            />
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
              ✓{" "}
              {maxSuggestions === 1
                ? "Your suggestion has been added."
                : `You've submitted all ${maxSuggestions} suggestions.`}
            </p>
          ) : (
            <>
              <p className="mb-4.5 text-[0.7rem] tracking-[0.04em] text-brown opacity-50">
                {maxSuggestions === null
                  ? submittedCount > 0
                    ? `${submittedCount} submitted — add more anytime`
                    : "Unlimited suggestions"
                  : maxSuggestions === 1
                    ? "One suggestion per session"
                    : `${submittedCount} of ${maxSuggestions} suggestions used`}
              </p>
              <div className="flex gap-2.5 max-sm:flex-col">
                <Input
                  type="text"
                  placeholder="e.g. Legally Blonde..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitClick()}
                  disabled={busy || !data?.isOpen}
                  maxLength={100}
                  className="flex-1 border-brown/[0.18] bg-cream font-mono text-[0.85rem] text-dark placeholder:opacity-35 focus-visible:border-gold focus-visible:ring-gold/12"
                />
                <button
                  className="h-8 whitespace-nowrap rounded-md bg-brand-red px-5 font-mono text-[0.78rem] uppercase tracking-[0.1em] text-white transition-all hover:bg-[#a93226] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(192,57,43,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-sm:h-auto max-sm:w-full max-sm:py-3"
                  onClick={handleSubmitClick}
                  disabled={busy || !input.trim() || !data?.isOpen}
                >
                  {busy ? "..." : "Submit"}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-[0.74rem] tracking-[0.03em] text-brand-red">⚠ {error}</p>
              )}
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
                  ? `${votedFor.size} vote${votedFor.size !== 1 ? "s" : ""} cast`
                  : remainingVotes > 0
                    ? `${remainingVotes} vote${remainingVotes !== 1 ? "s" : ""} remaining`
                    : "All votes cast"}
              </span>
            )}
          </div>
          {data && (data.movies ?? []).length > 0 && (
            <p className="mb-5 text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-45">
              {(data.movies ?? []).length} film{(data.movies ?? []).length !== 1 ? "s" : ""} in the running
            </p>
          )}

          {!data || (data.movies ?? []).length === 0 ? (
            <div className="px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
              <div className="mb-3.5 text-[2.2rem]">🎞</div>
              No films yet — be the first to suggest one!
            </div>
          ) : (
            (data.movies ?? []).map((movie, i) => {
              const isMyMovie = (data.submittedMovieIds ?? []).includes(movie.id);
              const windowStart = Math.max(movie.submittedAt, config?.removalEnabledAt ?? 0);
              const withinWindow =
                config?.removalWindowMinutes === null ||
                (config?.removalWindowMinutes != null &&
                  Date.now() - windowStart <= config.removalWindowMinutes * 60 * 1000);
              const canRemove =
                isMyMovie &&
                (config?.allowRemoval ?? false) &&
                withinWindow &&
                removing !== movie.id;

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
                  onPosterClick={
                    movie.posterUrl
                      ? () => setLightboxPoster({ url: movie.posterUrl!, title: movie.title })
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { id } = ctx.params as { id: string };

  const poll = await getPoll(id);
  if (!poll) return { props: {} };

  const password = poll.config?.password;
  if (!password) return { props: {} };

  // Host bypass — if ?host= is in the query, let the page handle auth itself
  if (ctx.query.host) return { props: {} };

  // Check for a valid signed cookie
  const cookieToken = ctx.req.cookies[`poll_access_${id}`];
  if (verifyAccessToken(id, cookieToken)) return { props: {} };

  // No valid token — redirect to home with locked param
  return {
    redirect: {
      destination: `/?locked=${id}`,
      permanent: false,
    },
  };
};
