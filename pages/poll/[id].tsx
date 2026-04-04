import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { useConfirm } from "../../components/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Ornament } from "@/components/Ornament";
import { MovieCard } from "@/components/MovieCard";
import { FloatingHostPanel } from "@/components/FloatingHostPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePollSession } from "@/hooks/usePollSession";
import { useVoting } from "@/hooks/useVoting";
import { useSuggestion } from "@/hooks/useSuggestion";
import { useHostActions } from "@/hooks/useHostActions";
import { getPollDerivedState } from "@/hooks/getPollDerivedState";
import { getPoll } from "@/lib/store";
import { verifyAccessToken } from "@/lib/api";
import type { PollConfig } from "@/lib/types";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

// ── Component ───────────────────────────────────────────────────
export default function PollPage() {
  const router = useRouter();
  const { id: pollId, host: hostToken } = router.query as { id?: string; host?: string };

  const { confirm, dialog: confirmDialog } = useConfirm();
  const isDesktop = useMediaQuery("(min-width: 1300px)");

  // Layer 1: server state
  const { data, notFound, refetch } = usePollSession(pollId, hostToken, router.isReady);

  // Layer 2: interactions
  const suggestion = useSuggestion(pollId, refetch);
  const voting = useVoting(pollId, data?.votedMovieIds ?? [], refetch);
  const host = useHostActions(pollId, hostToken, refetch, () => router.push("/"));

  // Layer 3: derived state
  const derived = getPollDerivedState(
    data,
    voting.votedFor,
    voting.voting,
    voting.removing,
    suggestion.submitting,
    suggestion.fetchingPoster,
  );

  // Local UI state (pure feedback, no async, no side effects)
  const [lightboxPoster, setLightboxPoster] = useState<{ url: string; title: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/poll/${pollId}` : "";

  function copyToClipboard(text: string, which: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function updateConfig(patch: Partial<PollConfig>) {
    host.hostAction("updateConfig", { config: { ...(data?.config ?? {}), ...patch } });
  }

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
      {suggestion.modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-xl bg-white px-7 py-8 text-center shadow-[0_24px_64px_rgba(26,18,9,0.45)]">
            <p className="mb-4 text-[0.65rem] uppercase tracking-[0.2em] text-brown opacity-45">
              Is this the right film?
            </p>
            <img
              className="mx-auto mb-5 block h-[222px] w-[150px] rounded-md object-cover shadow-[0_6px_24px_rgba(26,18,9,0.25)]"
              src={suggestion.modal.poster}
              alt={suggestion.modal.title}
            />
            <div
              className="mb-1 text-[1.05rem] font-bold leading-snug"
              style={{ fontFamily: playfair }}
            >
              {suggestion.modal.title}
            </div>
            {suggestion.modal.year && (
              <div className="mb-6 text-[0.68rem] tracking-[0.12em] text-brown opacity-45">
                {suggestion.modal.year}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                className="w-full rounded-md bg-dark py-3 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-cream transition-colors hover:bg-brown"
                onClick={() => suggestion.confirmPoster(suggestion.modal!.poster)}
              >
                That&apos;s the one
              </button>
              <button
                className="w-full rounded-md border border-brown/15 bg-transparent py-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-brown opacity-55 transition-opacity hover:opacity-100"
                onClick={() => suggestion.skipPoster()}
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
              hostLoading={host.hostLoading}
              hostStatus={host.hostStatus}
              copied={copied}
              shareUrl={shareUrl}
              onAdvance={() => host.hostAction("advance")}
              onReset={async () => {
                const ok = await confirm({
                  title: "Reset Poll",
                  message: "Reset all movies and votes? This cannot be undone.",
                  confirmLabel: "Reset",
                  danger: true,
                });
                if (ok) host.hostAction("reset");
              }}
              onClose={async () => {
                const ok = await confirm({
                  title: "Close Poll",
                  message:
                    "Permanently close this poll and delete all data? This cannot be undone.",
                  confirmLabel: "Close Poll",
                  danger: true,
                });
                if (ok) host.hostAction("close");
              }}
              onUpdateConfig={updateConfig}
              onCopy={copyToClipboard}
            />
          </div>
        )}

        {/* ── Stage banners (guests only) ── */}
        {data && !data.isHost && data.stage === "closed" && (
          <div className="mb-7 flex items-center justify-center gap-2.5 rounded-md border border-white/[0.06] bg-dark px-6 py-3.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cream">
            <span>🎬</span> Voting is now closed
          </div>
        )}

        {/* ── Suggest a Film ── */}
        <div className="mb-3 rounded-lg border border-brown/[0.12] border-t-gold border-t-[3px] bg-white px-7 pt-7 pb-6 shadow-[0_2px_16px_rgba(26,18,9,0.14)]">
          <h2 className="mb-1 text-[1.15rem] font-bold text-dark" style={{ fontFamily: playfair }}>
            Suggest a Film
          </h2>

          {!data ? null : data.stage !== "submissions" ? (
            <p className="py-2 text-[0.78rem] tracking-[0.04em] text-brown opacity-50">
              Submissions are closed —{" "}
              {data.stage === "voting" ? "voting is now open." : "this poll has ended."}
            </p>
          ) : !derived.canStillSuggest ? (
            <p className="flex items-center gap-2 py-2 text-[0.78rem] tracking-[0.04em] text-gold">
              ✓{" "}
              {data.config.maxSuggestionsPerUser === 1
                ? "Your suggestion has been added."
                : `You've submitted all ${data.config.maxSuggestionsPerUser} suggestions.`}
            </p>
          ) : (
            <>
              <p className="mb-4.5 text-[0.7rem] tracking-[0.04em] text-brown opacity-50">
                {data.config.maxSuggestionsPerUser === null
                  ? (data.submittedMovieIds?.length ?? 0) > 0
                    ? `${data.submittedMovieIds?.length} submitted`
                    : "Unlimited suggestions"
                  : data.config.maxSuggestionsPerUser === 1
                    ? "One suggestion per session"
                    : `${data.submittedMovieIds?.length ?? 0} of ${data.config.maxSuggestionsPerUser} suggestions used`}
              </p>
              <div className="flex gap-2.5 max-sm:flex-col">
                <Input
                  type="text"
                  placeholder="e.g. Legally Blonde..."
                  value={suggestion.input}
                  onChange={(e) => suggestion.setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && suggestion.handleSubmitClick()}
                  disabled={derived.busy}
                  maxLength={100}
                  className="flex-1 border-brown/[0.18] bg-cream font-mono text-[0.85rem] text-dark placeholder:opacity-35 focus-visible:border-gold focus-visible:ring-gold/12"
                />
                <button
                  className="h-8 whitespace-nowrap rounded-md bg-brand-red px-5 font-mono text-[0.78rem] uppercase tracking-[0.1em] text-white transition-all hover:bg-[#a93226] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(192,57,43,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 max-sm:h-auto max-sm:w-full max-sm:py-3"
                  onClick={suggestion.handleSubmitClick}
                  disabled={derived.busy || !suggestion.input.trim()}
                >
                  {derived.busy ? "..." : "Submit"}
                </button>
              </div>
              {suggestion.error && (
                <p className="mt-3 text-[0.74rem] tracking-[0.03em] text-brand-red">
                  ⚠ {suggestion.error}
                </p>
              )}
              {suggestion.flash && (
                <p className="mt-3 text-[0.74rem] tracking-[0.03em] text-gold">
                  {suggestion.flash}
                </p>
              )}
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
            {data?.stage === "voting" && derived.maxVotesPerUser !== 1 && (
              <span className="text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-45">
                {derived.maxVotesPerUser === null
                  ? `${voting.votedFor.size} vote${voting.votedFor.size !== 1 ? "s" : ""} cast`
                  : derived.remainingVotes > 0
                    ? `${derived.remainingVotes} vote${derived.remainingVotes !== 1 ? "s" : ""} remaining`
                    : "All votes cast"}
              </span>
            )}
          </div>
          {data && (data.movies ?? []).length > 0 && (
            <p className="mb-5 text-[0.68rem] uppercase tracking-[0.1em] text-brown opacity-45">
              {(data.movies ?? []).length} film{(data.movies ?? []).length !== 1 ? "s" : ""} in the
              running
            </p>
          )}

          {data && !data.isHost && data.stage === "submissions" ? (
            <div className="px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
              <div className="mb-3.5 text-[2.2rem]">🎞</div>
              Submissions are being collected — the host will reveal them when voting opens.
            </div>
          ) : !data || (data.movies ?? []).length === 0 ? (
            <div className="px-6 py-[52px] text-center text-[0.78rem] leading-[1.8] tracking-[0.1em] opacity-35">
              <div className="mb-3.5 text-[2.2rem]">🎞</div>
              No films yet — be the first to suggest one!
            </div>
          ) : (
            (data.movies ?? []).map((movie, i) => (
              <MovieCard
                key={movie.id}
                rank={i + 1}
                title={movie.title}
                votes={movie.votes}
                maxVotes={derived.maxVotes}
                posterUrl={movie.posterUrl}
                isLeader={i === 0 && movie.votes > 0}
                isVoted={voting.votedFor.has(movie.id)}
                isVoting={voting.voting === movie.id}
                canVote={derived.canVote(movie.id)}
                canRemove={derived.canRemove(movie)}
                animationDelay={i * 0.05}
                onVote={() => voting.vote(movie.id)}
                onRemove={() => voting.remove(movie.id)}
                onPosterClick={
                  movie.posterUrl
                    ? () => setLightboxPoster({ url: movie.posterUrl!, title: movie.title })
                    : undefined
                }
              />
            ))
          )}

          {voting.voteError && (
            <p className="mt-3 text-center text-[0.74rem] tracking-[0.03em] text-brand-red">
              ⚠ {voting.voteError}
            </p>
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
