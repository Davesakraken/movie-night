import { useState } from "react";
import { Ornament } from "@/components/Ornament";
import { Input } from "@/components/ui/input";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

interface Props {
  pollId: string;
  onUnlock: (token: string) => void;
}

export function PasswordGate({ pollId, onUnlock }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/poll/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, password }),
      });
      if (res.ok) {
        const json = await res.json();
        sessionStorage.setItem(`poll_access:${pollId}`, json.accessToken);
        onUnlock(json.accessToken);
      } else {
        const json = await res.json();
        setError(json.error || "Incorrect password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-dark/60 px-5 backdrop-blur-md">
      <div className="w-full max-w-[300px] rounded-xl bg-white px-7 py-8 text-center shadow-[0_24px_64px_rgba(26,18,9,0.45)]">
        <Ornament className="mb-4" />
        <p className="mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-brown opacity-45">
          Password required
        </p>
        <h2
          className="mb-6 text-[1.4rem] font-black leading-none tracking-tight text-dark"
          style={{ fontFamily: playfair }}
        >
          Movie <em className="italic text-brand-red">Night</em>
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Enter password…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={loading}
            className="text-center"
          />
          {error && (
            <p className="text-[0.72rem] text-brand-red">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="rounded-md bg-dark px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
