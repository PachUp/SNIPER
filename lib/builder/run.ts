import { execFile } from "child_process";
import { promisify } from "util";
import type { BuiltPortfolio } from "@/lib/types";
import {
  BUILDER_SCRIPT,
  builderDataArgs,
  builderPython,
} from "@/lib/builder/config";
import {
  mapBuilderResult,
  type BuilderPortfolioResult,
  type FamousListResult,
} from "@/lib/builder/map";
import { provider } from "@/lib/data";

export type {
  BuilderHolding,
  BuilderPortfolioResult,
  FamousListResult,
  FamousPick,
} from "@/lib/builder/map";
export { mapBuilderResult, stockFromHolding } from "@/lib/builder/map";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 60_000;

export class BuilderError extends Error {
  status: number;
  details: Record<string, unknown>;

  constructor(
    message: string,
    status = 500,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "BuilderError";
    this.status = status;
    this.details = details;
  }
}

async function runBuilder(extraArgs: string[]): Promise<unknown> {
  const args = [BUILDER_SCRIPT, ...builderDataArgs(), ...extraArgs];
  try {
    const { stdout, stderr } = await execFileAsync(builderPython(), args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
    if (stderr?.trim()) {
      console.warn("[builder]", stderr.trim().slice(0, 500));
    }
    const text = stdout.trim();
    if (!text) {
      throw new BuilderError("Builder returned empty output", 502);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new BuilderError("Builder returned invalid JSON", 502, {
        stdout: text.slice(0, 400),
      });
    }
  } catch (err) {
    if (err instanceof BuilderError) throw err;
    const e = err as {
      code?: string;
      killed?: boolean;
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    if (e.killed || e.code === "ETIMEDOUT") {
      throw new BuilderError("Builder timed out", 504);
    }
    if (e.stdout?.trim()) {
      try {
        const parsed = JSON.parse(e.stdout.trim()) as BuilderPortfolioResult;
        if (parsed.error) {
          throw new BuilderError(
            parsed.error,
            400,
            parsed as Record<string, unknown>
          );
        }
      } catch (inner) {
        if (inner instanceof BuilderError) throw inner;
      }
    }
    const detail = (e.stderr || e.message || "unknown error").toString();
    throw new BuilderError(`Builder failed: ${detail.slice(0, 600)}`, 502, {
      stderr: e.stderr,
    });
  }
}

export async function listFamousPicks(): Promise<FamousListResult> {
  const { loadFamousSymbols } = await import("@/lib/builder/famousList");
  await loadFamousSymbols(); // seed runtime famous_stocks.json for --famous-file
  const data = (await runBuilder(["--list-famous-json"])) as FamousListResult;
  if (!data || !Array.isArray(data.picks)) {
    throw new BuilderError("Unexpected famous-list response", 502);
  }
  return data;
}

export async function buildFromPicks(
  tickers: string[],
  size = 12,
  style: "broad" | "growth" | null = null
): Promise<BuiltPortfolio> {
  const { loadFamousSymbols } = await import("@/lib/builder/famousList");
  await loadFamousSymbols();
  const picks = tickers.map((t) => t.toUpperCase());
  const args = [
    "--pick",
    ...picks,
    "--size",
    String(size),
    "--json-stdout",
  ];
  if (style) {
    args.push("--style", style);
  }
  const data = (await runBuilder(args)) as BuilderPortfolioResult;

  if (data.error) {
    throw new BuilderError(data.error, 400, data as Record<string, unknown>);
  }
  if (!Array.isArray(data.holdings) || data.holdings.length === 0) {
    throw new BuilderError(
      "Builder returned no holdings",
      502,
      data as Record<string, unknown>
    );
  }

  const catalog = await provider.getStocks();
  const { loadCompanyBlurbs } = await import("@/lib/builder/blurbs");
  const blurbs = await loadCompanyBlurbs();
  return mapBuilderResult(data, catalog, blurbs);
}
