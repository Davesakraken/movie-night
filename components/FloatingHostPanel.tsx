import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CopyLinkRow } from "@/components/CopyLinkRow";
import type { PollConfig, SessionData } from "@/lib/types";

const playfair = 'var(--font-playfair, "Playfair Display", serif)';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-gold" : "bg-white/20",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

interface FloatingHostPanelProps {
  data: SessionData;
  hostLoading: boolean;
  hostStatus: string;
  copied: string | null;
  shareUrl: string;
  onToggle: () => void;
  onReset: () => void;
  onClose: () => void;
  onUpdateConfig: (patch: Partial<PollConfig>) => void;
  onCopy: (text: string, which: string) => void;
  mode?: "floating" | "inline";
}

export function FloatingHostPanel({
  data,
  hostLoading,
  hostStatus,
  copied,
  shareUrl,
  onToggle,
  onReset,
  onClose,
  onUpdateConfig,
  onCopy,
  mode = "floating",
}: FloatingHostPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Partial<PollConfig> | null>(null);
  const [revertKey, setRevertKey] = useState(0);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const isFloating = mode === "floating";

  // Default position: top-right with some margin (floating only)
  useEffect(() => {
    if (!isFloating) return;
    if (pos === null && typeof window !== "undefined") {
      setPos({ x: window.innerWidth - 320 - 20, y: 20 });
    }
  }, [pos, isFloating]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isFloating) return;
      if ((e.target as HTMLElement).closest("button, input, select, label")) return;
      dragging.current = true;
      const rect = panelRef.current!.getBoundingClientRect();
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      e.preventDefault();
    },
    [isFloating],
  );

  useEffect(() => {
    if (!isFloating) return;
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 320 - 20, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offset.current.y)),
      });
    }
    function onMouseUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isFloating]);

  if (isFloating && pos === null) return null;

  const config = data.config;
  const displayConfig = draft ? { ...config, ...draft } : config;

  function patchDraft(patch: Partial<PollConfig>) {
    setDraft((d) => {
      const next = { ...(d ?? {}), ...patch };
      const isClean = (Object.keys(next) as (keyof PollConfig)[]).every(
        (k) => next[k] === config[k],
      );
      return isClean ? null : next;
    });
  }

  async function handleApply() {
    if (!draft) return;
    await onUpdateConfig(draft);
    setDraft(null);
  }

  function handleRevert() {
    setDraft(null);
    setRevertKey((k) => k + 1);
  }

  return (
    <div
      ref={panelRef}
      style={isFloating ? { left: pos!.x, top: pos!.y, width: 320 } : undefined}
      className={isFloating ? "fixed z-50 select-none" : "select-none"}
    >
      <div className="rounded-[10px] border border-gold/25 bg-dark text-cream shadow-[0_8px_32px_rgba(26,18,9,0.5)]">
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-4 py-3",
            isFloating && "cursor-grab active:cursor-grabbing",
          )}
          onMouseDown={onMouseDown}
        >
          <span
            className="text-[0.9rem] font-bold tracking-[0.02em] text-gold"
            style={{ fontFamily: playfair }}
          >
            Host Panel
          </span>
          <div className="flex items-center gap-2">
            {data && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.1em]",
                  data.isOpen ? "bg-green-500/20 text-green-400" : "bg-brand-red/25 text-red-400",
                )}
              >
                ● {data.isOpen ? "Open" : "Closed"}
              </span>
            )}
            {/* Collapse */}
            <button
              className="p-0.5 text-cream/40 transition-colors hover:text-cream"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {collapsed ? (
                  <>
                    <polyline points="6 9 12 15 18 9" />
                  </>
                ) : (
                  <>
                    <polyline points="18 15 12 9 6 15" />
                  </>
                )}
              </svg>
            </button>
            {/* Close */}
            <button
              className="p-0.5 text-red-400/50 transition-colors hover:text-red-400 disabled:opacity-20"
              onClick={onClose}
              disabled={hostLoading}
              title="Close poll"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        {!collapsed && (
          <div className="border-t border-white/10 px-4 pb-4 pt-3.5">
            {/* Action buttons */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                className="truncate rounded-md bg-white/10 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-cream transition-all hover:opacity-80 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onToggle}
                disabled={hostLoading}
              >
                {hostLoading ? "..." : data.isOpen ? "Pause" : "Open"}
              </button>
              <button
                className="truncate rounded-md bg-brand-red/70 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-white transition-all hover:opacity-80 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onReset}
                disabled={hostLoading}
              >
                Reset
              </button>
            </div>

            {/* Share link */}
            <CopyLinkRow
              label="Guest"
              url={shareUrl}
              copied={copied === "share"}
              onCopy={() => onCopy(shareUrl, "share")}
            />

            {/* Poll Settings */}
            {config && (
              <div className="mt-4 border-t border-white/10 pt-3.5">
                <p className="mb-3 text-[0.58rem] uppercase tracking-[0.16em] text-cream/40">
                  Poll Settings
                </p>
                <div className="flex flex-col gap-3.5">
                  {/* Multiple votes */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.68rem] tracking-[0.03em] text-cream/80">
                        Multiple votes
                      </span>
                      <Toggle
                        checked={displayConfig.maxVotesPerUser !== 1}
                        onChange={() =>
                          patchDraft({
                            maxVotesPerUser: displayConfig.maxVotesPerUser === 1 ? 3 : 1,
                          })
                        }
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        displayConfig.maxVotesPerUser === 1
                          ? "pointer-events-none opacity-30"
                          : "opacity-100",
                      )}
                    >
                      <input
                        key={`${revertKey}-${String(displayConfig.maxVotesPerUser)}`}
                        type="number"
                        min={2}
                        max={100}
                        defaultValue={displayConfig.maxVotesPerUser ?? 3}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (v >= 2) patchDraft({ maxVotesPerUser: v });
                        }}
                        disabled={
                          displayConfig.maxVotesPerUser === null ||
                          displayConfig.maxVotesPerUser === 1
                        }
                        className="w-12 rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[0.65rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-30"
                      />
                      <label className="flex cursor-pointer items-center gap-1 text-[0.62rem] text-cream/55">
                        <input
                          key={`${revertKey}-nolimit-votes-${String(displayConfig.maxVotesPerUser)}`}
                          type="checkbox"
                          defaultChecked={displayConfig.maxVotesPerUser === null}
                          onChange={(e) =>
                            patchDraft({ maxVotesPerUser: e.target.checked ? null : 3 })
                          }
                          className="accent-gold"
                        />
                        No limit
                      </label>
                    </div>
                  </div>

                  {/* Multiple suggestions */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.68rem] tracking-[0.03em] text-cream/80">
                        Multiple suggestions
                      </span>
                      <Toggle
                        checked={displayConfig.maxSuggestionsPerUser !== 1}
                        onChange={() =>
                          patchDraft({
                            maxSuggestionsPerUser:
                              displayConfig.maxSuggestionsPerUser === 1 ? 3 : 1,
                          })
                        }
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        displayConfig.maxSuggestionsPerUser === 1
                          ? "pointer-events-none opacity-30"
                          : "opacity-100",
                      )}
                    >
                      <input
                        key={`${revertKey}-${String(displayConfig.maxSuggestionsPerUser)}`}
                        type="number"
                        min={2}
                        max={100}
                        defaultValue={displayConfig.maxSuggestionsPerUser ?? 3}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (v >= 2) patchDraft({ maxSuggestionsPerUser: v });
                        }}
                        disabled={
                          displayConfig.maxSuggestionsPerUser === null ||
                          displayConfig.maxSuggestionsPerUser === 1
                        }
                        className="w-12 rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[0.65rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-30"
                      />
                      <label className="flex cursor-pointer items-center gap-1 text-[0.62rem] text-cream/55">
                        <input
                          key={`${revertKey}-nolimit-suggestions-${String(displayConfig.maxSuggestionsPerUser)}`}
                          type="checkbox"
                          defaultChecked={displayConfig.maxSuggestionsPerUser === null}
                          onChange={(e) =>
                            patchDraft({ maxSuggestionsPerUser: e.target.checked ? null : 3 })
                          }
                          className="accent-gold"
                        />
                        No limit
                      </label>
                    </div>
                  </div>

                  {/* Password protection */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.68rem] tracking-[0.03em] text-cream/80">
                        Password protection
                      </span>
                      <Toggle
                        checked={
                          draft?.password !== undefined
                            ? draft.password !== null
                            : data.passwordProtected
                        }
                        onChange={() =>
                          patchDraft({
                            password: (
                              draft?.password !== undefined
                                ? draft.password !== null
                                : data.passwordProtected
                            )
                              ? null
                              : "",
                          })
                        }
                      />
                    </div>
                    <div
                      className={cn(
                        "transition-opacity",
                        !(draft?.password !== undefined
                          ? draft.password !== null
                          : data.passwordProtected)
                          ? "pointer-events-none opacity-30"
                          : "opacity-100",
                      )}
                    >
                      <input
                        key={`${revertKey}-password`}
                        type="text"
                        placeholder="Enter password…"
                        defaultValue={draft?.password ?? ""}
                        onChange={(e) => patchDraft({ password: e.target.value || null })}
                        className="w-full rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[0.65rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40"
                      />
                    </div>
                  </div>

                  {/* Allow removal */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.68rem] tracking-[0.03em] text-cream/80">
                        Allow removal
                      </span>
                      <Toggle
                        checked={displayConfig.allowRemoval}
                        onChange={() => patchDraft({ allowRemoval: !displayConfig.allowRemoval })}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        !displayConfig.allowRemoval
                          ? "pointer-events-none opacity-30"
                          : "opacity-100",
                      )}
                    >
                      <select
                        value={displayConfig.removalWindowMinutes === null ? "unlimited" : "timed"}
                        onChange={(e) =>
                          patchDraft({
                            removalWindowMinutes: e.target.value === "unlimited" ? null : 10,
                          })
                        }
                        disabled={!displayConfig.allowRemoval}
                        className="rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[0.65rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-30"
                      >
                        <option value="unlimited">Any time</option>
                        <option value="timed">Within</option>
                      </select>
                      <div
                        style={{
                          visibility:
                            displayConfig.removalWindowMinutes !== null ? "visible" : "hidden",
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          key={`${revertKey}-${displayConfig.removalWindowMinutes ?? "null"}`}
                          type="number"
                          min={1}
                          max={1440}
                          defaultValue={displayConfig.removalWindowMinutes ?? 10}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (v >= 1) patchDraft({ removalWindowMinutes: v });
                          }}
                          disabled={!displayConfig.allowRemoval}
                          className="w-12 rounded border border-white/15 bg-white/8 px-1.5 py-0.5 font-mono text-[0.65rem] text-cream focus:outline-none focus:ring-1 focus:ring-gold/40"
                        />
                        <span className="text-[0.62rem] text-cream/45">min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apply / Revert row */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200",
                    draft ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleRevert}
                        title="Revert changes"
                        className="p-1 text-cream/40 transition-colors hover:text-cream"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleApply}
                        disabled={hostLoading}
                        className="rounded-md bg-gold/20 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-gold transition-all hover:bg-gold/30 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {hostLoading ? "..." : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hostStatus && (
              <p className="mt-2.5 text-[0.67rem] tracking-[0.04em] opacity-55">{hostStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
