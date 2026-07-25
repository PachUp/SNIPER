import path from "path";

const HOME_DOCS = path.join(
  process.env.HOME ?? "/Users/noambelinkis",
  "Documents",
  "StockAnalysis"
);

export const BUILDER_SCRIPT = path.join(
  process.cwd(),
  "valuation",
  "Builder"
);

export function builderPython(): string {
  return process.env.SNIPER_PYTHON?.trim() || "python3";
}

export function builderFvDir(): string {
  return (
    process.env.SNIPER_FV_DIR?.trim() ||
    path.join(HOME_DOCS, "FvIndustries-0-0-")
  );
}

export function builderUniverse(): string {
  return (
    process.env.SNIPER_UNIVERSE?.trim() ||
    path.join(HOME_DOCS, "NoamShit", "extracted_symbols_newest.json")
  );
}

export function builderSharpeFile(): string {
  return (
    process.env.SNIPER_SHARPE_FILE?.trim() ||
    path.join(builderFvDir(), "all_stocks_sharpe_ratios.json")
  );
}

export function isMockBuilderEnabled(): boolean {
  // Explicit opt-in, or automatic on Vercel (no Python/Fv files there).
  return (
    process.env.SNIPER_USE_MOCK_BUILDER === "1" ||
    process.env.VERCEL === "1"
  );
}

/** Shared CLI path args for every Builder invocation. */
export function builderDataArgs(): string[] {
  return [
    "--fv-dir",
    builderFvDir(),
    "--universe",
    builderUniverse(),
    "--sharpe-file",
    builderSharpeFile(),
  ];
}
