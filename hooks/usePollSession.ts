import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionData } from "@/lib/types";

export interface UsePollSessionResult {
  data: SessionData | null;
  notFound: boolean;
  refetch: () => void;
}

export function usePollSession(
  pollId: string | undefined,
  hostToken: string | undefined,
  isRouterReady: boolean,
): UsePollSessionResult {
  const [data, setData] = useState<SessionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [triggerTick, setTriggerTick] = useState(0);
  const generationRef = useRef(0);

  const refetch = useCallback(() => {
    setTriggerTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isRouterReady || !pollId) return;

    async function _fetch() {
      const gen = ++generationRef.current;
      const params = new URLSearchParams({ pollId: pollId! });
      if (hostToken) params.set("hostToken", hostToken);
      if (typeof document !== "undefined") {
        const match = document.cookie.match(
          new RegExp(`(?:^|; )poll_access_${pollId}=([^;]*)`)
        );
        if (match) params.set("accessToken", decodeURIComponent(match[1]));
      }
      let res: Response;
      try {
        res = await fetch(`/api/poll/session?${params}`);
      } catch {
        return;
      }
      if (gen !== generationRef.current) return;
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) return; // 401 auth-gate or other error — ignore
      const json: SessionData = await res.json();
      if (gen !== generationRef.current) return;
      setData(json);
    }

    _fetch();
    const interval = setInterval(_fetch, 3000);
    return () => clearInterval(interval);
  }, [isRouterReady, pollId, hostToken, triggerTick]);

  return { data, notFound, refetch };
}
