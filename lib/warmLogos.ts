import { ensureLogosAsync } from "@/lib/logos/ensureLogo";

/**
 * Guarantee logos for tickers (in-process). Used by admin write routes.
 */
export function warmLogos(symbols: string[]): void {
  ensureLogosAsync(symbols);
}
