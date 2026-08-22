import taxonomyJson from "@/data/industry_build_styles.json";

export type BuildStyle = "broad" | "growth";
export type StyleAffinity = "broad" | "growth" | "both" | "unknown";

type StyleTaxonomy = {
  growth: string[];
  broad: string[];
  both: string[];
  growthKeywords?: string[];
  broadKeywords?: string[];
  bothKeywords?: string[];
};

const raw = taxonomyJson as StyleTaxonomy;

const taxonomy = {
  growth: (raw.growth ?? []).map(normIndustry),
  broad: (raw.broad ?? []).map(normIndustry),
  both: (raw.both ?? []).map(normIndustry),
  growthKeywords: raw.growthKeywords ?? [],
  broadKeywords: raw.broadKeywords ?? [],
  bothKeywords: raw.bothKeywords ?? [],
};

function normIndustry(s: string): string {
  return s.trim().toLowerCase();
}

function keywordHit(industry: string, keys: string[] | undefined): boolean {
  if (!keys?.length) return false;
  return keys.some((k) => industry.includes(k.toLowerCase()));
}

/**
 * Classify a Finviz / StockAnalysis industry into build-style affinity.
 * Exact list match first, then keyword fallback for unseen industries.
 */
export function industryStyleAffinity(
  industry?: string | null,
  sector?: string | null
): StyleAffinity {
  const ind = industry ? normIndustry(industry) : "";
  if (ind) {
    if (taxonomy.both.includes(ind)) return "both";
    if (taxonomy.growth.includes(ind)) return "growth";
    if (taxonomy.broad.includes(ind)) return "broad";
    if (keywordHit(ind, taxonomy.bothKeywords)) return "both";
    if (keywordHit(ind, taxonomy.growthKeywords)) return "growth";
    if (keywordHit(ind, taxonomy.broadKeywords)) return "broad";
  }

  // Sector fallback when industry is missing/unknown
  const sec = (sector || "").toLowerCase();
  if (
    sec.includes("information technology") ||
    sec.includes("communication") ||
    sec === "consumer discretionary"
  ) {
    return "growth";
  }
  if (
    sec.includes("utilit") ||
    sec.includes("energy") ||
    sec.includes("real estate") ||
    sec.includes("financial") ||
    sec.includes("consumer staples") ||
    sec.includes("material") ||
    sec.includes("industrial")
  ) {
    return "broad";
  }
  if (sec.includes("health")) return "both";
  return "unknown";
}

/** Whether a stock may fill a Broad or Growth book (user picks always allowed separately). */
export function matchesBuildStyle(
  style: BuildStyle,
  industry?: string | null,
  sector?: string | null
): boolean {
  const aff = industryStyleAffinity(industry, sector);
  if (aff === "both" || aff === "unknown") return true;
  return aff === style;
}

/** Score tilt: higher = better fit for this style. */
export function styleFitBonus(
  style: BuildStyle,
  industry?: string | null,
  sector?: string | null
): number {
  const aff = industryStyleAffinity(industry, sector);
  if (aff === "both") return 0.18;
  if (aff === style) return 0.28;
  if (aff === "unknown") return 0.05;
  return -0.22; // opposite bucket
}

export function parseBuildStyle(raw: unknown): BuildStyle | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "broad" || s === "growth") return s;
  return null;
}
