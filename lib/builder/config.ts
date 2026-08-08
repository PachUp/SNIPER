import fs from "fs";
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

/** Headline + entry blurbs from StockAnalysis (`company_blurbs.json`). */
export function builderBlurbsFile(): string {
  return (
    process.env.SNIPER_BLURBS_FILE?.trim() ||
    path.join(HOME_DOCS, "NoamShit", "company_blurbs.json")
  );
}

export function isMockBuilderEnabled(): boolean {
  // Explicit opt-in, or automatic on serverless hosts (no local Python/Fv files).
  if (process.env.SNIPER_USE_MOCK_BUILDER === "1") return true;
  if (process.env.SNIPER_USE_MOCK_BUILDER === "0") return false;
  return (
    process.env.VERCEL === "1" ||
    process.env.NETLIFY === "true" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

/** Runtime famous list path (seeded from data/famous_stocks.json). */
export function builderFamousFile(): string {
  const fromEnv = process.env.SNIPER_FAMOUS_FILE?.trim();
  if (fromEnv) return fromEnv;
  const dataDir =
    process.env.SNIPER_DATA_DIR?.trim() ||
    path.join(process.cwd(), "data");
  return path.join(path.resolve(dataDir), ".runtime", "famous_stocks.json");
}

/** Admin symbol disqualifications / replacements (AEG → BAH, etc.). */
export function builderOverridesFile(): string {
  const fromEnv = process.env.SNIPER_OVERRIDES_FILE?.trim();
  if (fromEnv) return fromEnv;
  const dataDir =
    process.env.SNIPER_DATA_DIR?.trim() ||
    path.join(process.cwd(), "data");
  return path.join(path.resolve(dataDir), "symbol_overrides.json");
}

/** Shared CLI path args for every Builder invocation. */
export function builderDataArgs(): string[] {
  const args = [
    "--fv-dir",
    builderFvDir(),
    "--universe",
    builderUniverse(),
    "--sharpe-file",
    builderSharpeFile(),
  ];
  const famousPath = builderFamousFile();
  if (fs.existsSync(famousPath)) {
    args.push("--famous-file", famousPath);
  }
  const overridesPath = builderOverridesFile();
  if (fs.existsSync(overridesPath)) {
    args.push("--overrides-file", overridesPath);
  }
  return args;
}
