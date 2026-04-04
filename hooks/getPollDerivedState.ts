import type { Movie, SessionData } from "@/lib/types";

export interface PollDerivedState {
  maxVotes: number;
  maxVotesPerUser: number | null;
  remainingVotes: number;
  canStillSuggest: boolean;
  busy: boolean;
  canVote: (movieId: string) => boolean;
  canRemove: (movie: Movie) => boolean;
}

export function getPollDerivedState(
  data: SessionData | null,
  votedFor: Set<string>,
  voting: string | null,
  removing: string | null,
  submitting: boolean,
  fetchingPoster: boolean,
): PollDerivedState {
  const config = data?.config ?? null;

  const maxVotes = data
    ? Math.max(...(data.movies ?? []).map((m) => m.votes), 1)
    : 1;

  const maxVotesPerUser = config ? config.maxVotesPerUser : 1;

  const remainingVotes =
    maxVotesPerUser === null
      ? Infinity
      : Math.max(0, maxVotesPerUser - votedFor.size);

  const maxSuggestions = config ? config.maxSuggestionsPerUser : 1;
  const submittedCount = data?.submittedMovieIds?.length ?? 0;
  const canStillSuggest =
    data?.stage === 'submissions' &&
    (maxSuggestions === null || submittedCount < maxSuggestions);

  const busy = submitting || fetchingPoster;

  function canVote(movieId: string): boolean {
    if (data?.stage !== 'voting') return false;
    return votedFor.has(movieId) || remainingVotes > 0;
  }

  function canRemove(movie: Movie): boolean {
    if (!data) return false;
    const isMyMovie = (data.submittedMovieIds ?? []).includes(movie.id);
    if (!isMyMovie) return false;
    if (!(config?.allowRemoval ?? false)) return false;
    if (removing === movie.id) return false;

    const windowStart = Math.max(movie.submittedAt, config?.removalEnabledAt ?? 0);
    const withinWindow =
      config?.removalWindowMinutes === null ||
      (config?.removalWindowMinutes != null &&
        Date.now() - windowStart <= config.removalWindowMinutes * 60 * 1000);

    return withinWindow;
  }

  return {
    maxVotes,
    maxVotesPerUser,
    remainingVotes,
    canStillSuggest,
    busy,
    canVote,
    canRemove,
  };
}
