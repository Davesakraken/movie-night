import { useState, useRef } from "react";
import type { ClientPollConfig } from "@/lib/types";

export interface UseHostActionsResult {
  hostLoading: boolean;
  hostStatus: string;
  hostAction: (act: string, extra?: Record<string, unknown>) => Promise<void>;
  updateConfig: (config: ClientPollConfig) => Promise<void>;
}

export function useHostActions(
  pollId: string | undefined,
  hostToken: string | undefined,
  refetch: () => void,
  onClose: () => void,
): UseHostActionsResult {
  const [hostLoading, setHostLoading] = useState(false);
  const [hostStatus, setHostStatus] = useState("");
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setStatus(msg: string) {
    setHostStatus(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (msg) {
      statusTimerRef.current = setTimeout(() => setHostStatus(""), 3000);
    }
  }

  async function hostAction(act: string, extra?: Record<string, unknown>) {
    if (!pollId) return;
    setHostLoading(true);
    setStatus("");
    let res: Response;
    try {
      res = await fetch("/api/poll/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, pollId, hostToken, ...extra }),
      });
    } catch {
      setHostLoading(false);
      setStatus("Error: Network error");
      return;
    }
    const json = await res.json();
    setHostLoading(false);
    if (!res.ok) {
      setStatus("Error: " + json.error);
      return;
    }
    if (json.closed) {
      onClose();
      return;
    }
    setStatus(json.message || "");
    refetch();
  }

  async function updateConfig(config: ClientPollConfig) {
    // Receives a fully merged config from the caller ([id].tsx merges before passing).
    await hostAction("updateConfig", { config });
  }

  return { hostLoading, hostStatus, hostAction, updateConfig };
}
