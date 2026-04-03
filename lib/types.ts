// ── Poll configuration ───────────────────────────────────────────
export interface PollConfig {
  maxVotesPerUser: number | null; // null = unlimited; default 1
  maxSuggestionsPerUser: number | null; // null = unlimited; default 1
  allowRemoval: boolean; // can users remove their suggestion; default false
  removalWindowMinutes: number | null; // null = no time limit; only applies when allowRemoval=true
  removalEnabledAt: number | null; // timestamp when allowRemoval was last turned on; resets the window
  password?: string | null; // null/undefined = no protection (server-side only, never sent to client)
}

/** Safe subset of PollConfig to send to the browser — password is omitted. */
export type ClientPollConfig = Omit<PollConfig, 'password'>;

// ── Stored (server-side) shapes ──────────────────────────────────
/** Full movie record as stored in Redis. Includes server-only fields. */
export interface StoredMovie {
  id: string;
  title: string;
  submittedBy: string; // IP address
  votes: number;
  voters: string[];
  submittedAt: number;
  posterUrl?: string;
}

export interface Poll {
  pollId: string;
  movies: StoredMovie[];
  isOpen: boolean;
  createdAt: number;
  config: PollConfig;
}

// ── Client-facing shapes ─────────────────────────────────────────
/** Movie shape returned to the browser (voters/submittedBy stripped). */
export interface Movie {
  id: string;
  title: string;
  votes: number;
  submittedAt: number;
  posterUrl?: string;
}

export interface SessionData {
  movies: Movie[];
  isOpen: boolean;
  config: ClientPollConfig;
  hasSubmitted: boolean;
  submittedMovieIds: string[];
  votedMovieIds: string[];
  isHost: boolean;
  passwordProtected: boolean;
}

export interface PosterModal {
  poster: string;
  title: string;
  year: string;
}
