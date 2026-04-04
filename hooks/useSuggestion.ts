import { useState, useRef } from "react";
import type { PosterModal } from "@/lib/types";

export interface UseSuggestionResult {
  input: string;
  setInput: (v: string) => void;
  submitting: boolean;
  fetchingPoster: boolean;
  error: string;
  flash: string | null;
  modal: PosterModal | null;
  handleSubmitClick: () => Promise<void>;
  confirmPoster: (posterUrl: string) => void;
  skipPoster: () => void;
}

export function useSuggestion(
  pollId: string | undefined,
  refetch: () => void,
): UseSuggestionResult {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingPoster, setFetchingPoster] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [modal, setModal] = useState<PosterModal | null>(null);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showFlash(msg: string) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(msg);
    flashTimerRef.current = setTimeout(() => setFlash(null), 2500);
  }

  function showError(msg: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    errorTimerRef.current = setTimeout(() => setError(""), 3000);
  }

  async function doSubmit(posterUrl?: string) {
    if (!pollId) return;
    setSubmitting(true);
    let res: Response;
    try {
      res = await fetch("/api/poll/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, title: input.trim(), posterUrl }),
      });
    } catch {
      setSubmitting(false);
      showError("Network error");
      return;
    }
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      showError(json.error);
    } else {
      setInput("");
      showFlash("Movie added!");
      refetch();
    }
  }

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

  function confirmPoster(posterUrl: string) {
    setModal(null);
    doSubmit(posterUrl);
  }

  function skipPoster() {
    setModal(null);
    doSubmit();
  }

  return {
    input,
    setInput,
    submitting,
    fetchingPoster,
    error,
    flash,
    modal,
    handleSubmitClick,
    confirmPoster,
    skipPoster,
  };
}
