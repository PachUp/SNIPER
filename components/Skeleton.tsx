/** Lightweight placeholders — opacity pulse only (no layout animation). */
export default function Skeleton({
  variant = "line",
  className = "",
  count = 1,
}: {
  variant?: "line" | "row" | "block";
  className?: string;
  count?: number;
}) {
  const base =
    "animate-skeleton rounded-md bg-terminal-accent/15 will-change-transform";

  const shape =
    variant === "block"
      ? "h-40 w-full"
      : variant === "row"
        ? "h-11 w-full"
        : "h-3 w-full";

  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`${base} ${shape}`}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

/** Famous-logo wall placeholder for /build. */
export function BuildWallSkeleton() {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-terminal-border bg-gradient-to-b from-[#141414] to-black p-5">
      <div className="mb-4 space-y-2">
        <Skeleton variant="line" className="max-w-[8rem]" />
        <Skeleton variant="line" className="max-w-[16rem] opacity-70" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="h-14 w-14 animate-skeleton rounded-2xl bg-terminal-accent/15"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton variant="row" count={6} />
      </div>
    </div>
  );
}

/** Chart + panel placeholders for dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="space-y-2">
        <Skeleton variant="line" className="max-w-[10rem]" />
        <Skeleton variant="line" className="max-w-[14rem] opacity-60" />
      </div>
      <Skeleton variant="block" />
      <Skeleton variant="block" className="h-28 opacity-80" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Skeleton variant="row" count={4} />
      </div>
    </div>
  );
}
