import { useState } from "react";
import { useRouter } from "next/router";
import { Ornament } from "@/components/Ornament";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

interface Props {
  pollId: string;
  /** Where to navigate after a successful unlock. Defaults to /poll/[pollId]. */
  redirectTo?: string;
}

export function PasswordGate({ pollId, redirectTo }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(pin: string) {
    if (pin.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/poll/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, password: pin }),
      });
      if (res.ok) {
        const json = await res.json();
        // Set a cookie so getServerSideProps lets them through
        document.cookie = `poll_access_${pollId}=${json.accessToken}; path=/; max-age=86400; SameSite=Strict`;
        router.push(redirectTo ?? `/poll/${pollId}`);
      } else {
        const json = await res.json();
        setError(json.error || "Incorrect PIN");
        setPassword("");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-dark/60 px-5 backdrop-blur-md">
      <div className="w-full max-w-[300px] rounded-xl bg-white px-7 py-8 text-center shadow-[0_24px_64px_rgba(26,18,9,0.45)]">
        <Ornament className="mb-1" />
        <h2
          className="mb-2 text-[1.4rem] font-black leading-none tracking-tight text-dark"
          style={{ fontFamily: playfair }}
        >
          Movie <em className="italic text-brand-red">Night</em>
        </h2>
        <p className="mb-4 text-[0.65rem] uppercase tracking-[0.2em] text-brown opacity-45">
          Pin required
        </p>

        <div className="flex flex-col items-center gap-3">
          <InputOTP
            maxLength={4}
            value={password}
            onChange={(val) => {
              setPassword(val);
              setError("");
            }}
            onComplete={handleSubmit}
            disabled={loading}
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
          >
            <InputOTPGroup className="gap-2 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-[0.72rem] text-brand-red">{error}</p>}
        </div>
      </div>
    </div>
  );
}
