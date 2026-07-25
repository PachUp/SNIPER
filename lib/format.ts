export function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(n: number, withSign = true): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/**
 * Plain-language risk level derived from beta, for people with no market
 * experience. Low = calmer, High = swings more.
 */
export function riskLevel(beta: number): "Low" | "Medium" | "High" {
  if (beta < 0.8) return "Low";
  if (beta <= 1.2) return "Medium";
  return "High";
}

export function riskColorClass(beta: number): string {
  const level = riskLevel(beta);
  if (level === "Low") return "text-terminal-good";
  if (level === "Medium") return "text-terminal-accent";
  return "text-terminal-bad";
}

// Beginner-friendly names for the trade levels (EP / TP / SL).
export const LEVEL_LABELS = {
  ep: "Buy around",
  tp: "Sell target",
  sl: "Safety exit",
} as const;

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
