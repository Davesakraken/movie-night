interface CopyLinkRowProps {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}

export function CopyLinkRow({ label, url, copied, onCopy }: CopyLinkRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[34px] shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-cream/40">
        {label}
      </span>
      <div className="flex flex-1 items-center overflow-hidden rounded-md border border-white/[0.08] bg-black/35">
        <input
          type="text"
          readOnly
          value={url}
          className="min-w-0 flex-1 cursor-default border-none bg-transparent px-2.5 py-2 font-mono text-[0.65rem] text-cream/55 outline-none"
        />
        <button
          className="shrink-0 border-l border-white/[0.08] px-2.5 py-2 text-cream/40 transition-colors duration-100 hover:text-gold"
          onClick={onCopy}
          title={`Copy ${label.toLowerCase()} link`}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
