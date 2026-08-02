import { readCollection } from "@/lib/data/store";

export type FamousStocksFile = {
  symbols?: string[];
  stocks?: { symbol: string; name?: string }[];
};

const DEFAULT_FAMOUS = [
  "DIS",
  "NFLX",
  "JPM",
  "IBM",
  "UBER",
  "T",
  "CMCSA",
  "MA",
  "V",
  "SPOT",
  "DASH",
  "DAL",
  "LYFT",
  "YUM",
  "ROKU",
  "LULU",
];

/** Admin-editable famous shortlist used by mock Builder and `--famous-file`. */
export async function loadFamousSymbols(): Promise<string[]> {
  try {
    const data = await readCollection<FamousStocksFile>("famous_stocks.json");
    const fromStocks = (data.stocks ?? [])
      .map((s) => String(s.symbol || "").toUpperCase())
      .filter(Boolean);
    const fromSymbols = (data.symbols ?? [])
      .map((s) => String(s).toUpperCase())
      .filter(Boolean);
    const list = fromStocks.length > 0 ? fromStocks : fromSymbols;
    if (list.length > 0) return [...new Set(list)];
  } catch {
    // fall through
  }
  return [...DEFAULT_FAMOUS];
}

export function famousFilePayload(symbols: string[]): FamousStocksFile {
  return { symbols: [...new Set(symbols.map((s) => s.toUpperCase()))] };
}
