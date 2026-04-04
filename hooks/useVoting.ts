import { useState, useEffect } from "react";

export interface UseVotingResult {
  votedFor: Set<string>;
  voting: string | null;
  removing: string | null;
  voteError: string;
  vote: (movieId: string) => Promise<void>;
  remove: (movieId: string) => Promise<void>;
}

export function useVoting(
  pollId: string | undefined,
  serverVotedIds: string[],
  refetch: () => void,
): UseVotingResult {
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  // Sync local votedFor from server only when no vote is in-flight.
  // Use a joined string as the dependency to avoid firing on new array references with identical contents.
  const serverKey = serverVotedIds.join(",");
  useEffect(() => {
    if (voting !== null) return;
    setVotedFor(new Set(serverVotedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey, voting]);

  async function vote(movieId: string) {
    if (!pollId) return;
    setVoting(movieId);
    // Optimistic toggle
    setVotedFor((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
    let res: Response;
    try {
      res = await fetch("/api/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, movieId }),
      });
    } catch {
      setVoting(null);
      setVoteError("Network error");
      setTimeout(() => setVoteError(""), 3000);
      return;
    }
    setVoting(null);
    if (res.ok) {
      refetch();
    } else {
      const json = await res.json();
      setVoteError(json.error || "Could not vote");
      setTimeout(() => setVoteError(""), 3000);
    }
  }

  async function remove(movieId: string) {
    if (!pollId) return;
    setRemoving(movieId);
    let res: Response;
    try {
      res = await fetch("/api/poll/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, movieId }),
      });
    } catch {
      setRemoving(null);
      setVoteError("Network error");
      setTimeout(() => setVoteError(""), 3000);
      return;
    }
    setRemoving(null);
    if (res.ok) {
      refetch();
    } else {
      const json = await res.json();
      setVoteError(json.error || "Could not remove suggestion");
      setTimeout(() => setVoteError(""), 3000);
    }
  }

  return { votedFor, voting, removing, voteError, vote, remove };
}
