import { cn } from "@/lib/utils";

interface OrnamentProps {
  /** 'wide' uses fixed w-12 lines (page header/footer), 'fill' uses flex-1 lines (section divider) */
  variant?: "wide" | "fill";
  className?: string;
}

export function Ornament({ variant = "wide", className }: OrnamentProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2.5",
        variant === "fill" && "my-9",
        className,
      )}
    >
      <span
        className={cn(
          "h-px bg-brown",
          variant === "wide" ? "w-12 opacity-35" : "flex-1 opacity-20",
        )}
      />
      <span className={cn("text-[0.9rem]", variant === "wide" ? "opacity-55" : "opacity-40")}>
        ✦
      </span>
      <span
        className={cn(
          "h-px bg-brown",
          variant === "wide" ? "w-12 opacity-35" : "flex-1 opacity-20",
        )}
      />
    </div>
  );
}
