/** Company website domains — used for favicon fallback when stock logos fail. */
const TICKER_DOMAINS: Record<string, string> = {
  DIS: "disney.com",
  NFLX: "netflix.com",
  JPM: "jpmorganchase.com",
  IBM: "ibm.com",
  UBER: "uber.com",
  T: "att.com",
  CMCSA: "corporate.comcast.com",
  MA: "mastercard.com",
  V: "visa.com",
  SPOT: "spotify.com",
  DASH: "doordash.com",
  DAL: "delta.com",
  LYFT: "lyft.com",
  YUM: "yum.com",
  ROKU: "roku.com",
  LULU: "lululemon.com",
  GOOGL: "google.com",
  GOOG: "google.com",
  META: "meta.com",
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  AMZN: "amazon.com",
  NVDA: "nvidia.com",
  TSLA: "tesla.com",
  HON: "honeywell.com",
  BAH: "boozallen.com",
  FANG: "diamondbackenergy.com",
  AA: "alcoa.com",
  INCY: "incyte.com",
  CAE: "cae.com",
  AMH: "americanhomes4rent.com",
  RELY: "remitly.com",
  UGP: "ultra.com.br",
  IDCC: "interdigital.com",
  TIGO: "tigo.com",
  BAP: "credicorpnet.com",
  DOO: "brp.com",
  AXIA: "axiaenergia.com.br",
  // SNIPER house book
  CHWY: "chewy.com",
  BA: "boeing.com",
  FLR: "fluor.com",
  HAL: "halliburton.com",
};

export function tickerDomain(symbol: string): string | null {
  return TICKER_DOMAINS[symbol.toUpperCase()] ?? null;
}

/** Primary logo CDN (by ticker). Clearbit is deprecated / blocked. */
export function tickerLogoUrl(symbol: string): string {
  return `https://financialmodelingprep.com/image-stock/${symbol
    .toUpperCase()
    .trim()}.png`;
}

/** Secondary logo CDN. */
export function tickerLogoUrlIex(symbol: string): string {
  return `https://storage.googleapis.com/iex/api/logos/${symbol
    .toUpperCase()
    .trim()}.png`;
}

export function tickerFaviconUrl(symbol: string): string | null {
  const domain = tickerDomain(symbol);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=128`;
}
