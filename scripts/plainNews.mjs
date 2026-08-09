/**
 * News presentation for beginners.
 * Keep the original headline unless it's an EDGAR/SEC-style filing
 * or the wording is truly advanced — only then rewrite in plain English.
 */

const CLICKBAIT =
  /\bvs\.?\b|comparing revenue|here'?s what|what would|closer look at the transaction|artificial intelligence c|cutting-edge|here's a closer|how much do you need|out-earn the average|social security check|morning brew|weekend morning|market breadth|market highlights|house of cards|duct tape|just made a decision that could move/i;

const USEFUL =
  /\bearnings|profit|sales|revenue|deal|acquir|merger|lawsuit|probe|fda|dividend|buyback|guidance|ceo|cfo|launch|product|customers?|orders?|layoff|cut jobs|raises? prices?|beats?|miss(?:es|ed)?|upgrade|downgrade|recall|fine|settlement|ipo|split|insider|regulator|fact-checking\b/i;

/** SEC / EDGAR-style filings and ownership paperwork. */
const EDGAR =
  /\bedgar\b|\bsec filing\b|\bform\s*4\b|\bform\s*8-?k\b|\bform\s*10-?[kq]\b|\bschedule\s*13[dg]\b|\b13f\b|\bbeneficial (?:owner|ownership)\b|\boption exercise\b|\bstrike price\b|\btax-related transaction\b|\bdisposes? \d|\bdisposition of\b|\bequity holdings?\b|\bdirect equity\b|\bshares they own\b|\binsider (?:sells?|sold|sale)\b|\bceo .{0,40} sells? .{0,20}shares\b|\bcfo .{0,40} sells? .{0,20}shares\b|\bchief .{0,40} (?:sells?|disposes?)\b|\bwealth management\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its holdings\b|\bacquires? [\d,]+\s+shares\b|\bstake (?:trimmed|boosted|cut|reduced|increased)\b|\bboosts? stake\b|\binvestment counsel\b|\btrust division\b|\binvestment solutions\b|\bstock holdings in\b|\bcloser look at the transaction\b/i;

/** Truly advanced finance jargon — everyday words like "earnings" do NOT count. */
const ADVANCED_TERMS = [
  /\bdilution\b/i,
  /\bQoQ\b/,
  /\bYoY\b/,
  /\bEPS\b/,
  /\bEBITDA\b/i,
  /\bP\/E\b/i,
  /\bmultiple\b/i,
  /\bmarket capitalization\b/i,
  /\bheadwinds?\b/i,
  /\btailwinds?\b/i,
  /\bsecular\b/i,
  /\bmoat\b/i,
  /\bcatalyst\b/i,
  /\bproprietary channels?\b/i,
  /\benterprise clients?\b/i,
  /\bquarter-over-quarter\b/i,
  /\byear-over-year\b/i,
  /\bfree cash flow yield\b/i,
  /\boperating leverage\b/i,
  /\bamortization\b/i,
  /\bgoodwill impairment\b/i,
  /\bshare-based compensation\b/i,
  /\bnon-GAAP\b/i,
  /\bGAAP\b/,
  /\bcapex\b/i,
  /\bworking capital\b/i,
];

export function cleanSpaces(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTickerNoise(text) {
  return cleanSpaces(text)
    .replace(/\([A-Z]{1,5}\s*[+\-]?\d+(\.\d+)?%?\)/g, "")
    .replace(/\b[A-Z]{1,5}\s*[+\-]\d+(\.\d+)?%/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripSeoTail(title) {
  return cleanSpaces(title)
    .replace(/\.\s*Here'?s a Closer Look.*$/i, ".")
    .replace(/:\s*Here'?s What.*$/i, "")
    .replace(/\s*-\s*What Investors Need.*$/i, "")
    .trim();
}

function firstSentences(text, maxChars = 320) {
  const t = cleanSpaces(text);
  if (!t) return "";
  const parts = t.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > maxChars && out) break;
    out = next;
    if (out.length >= 140) break;
  }
  return out || t.slice(0, maxChars);
}

function advancedHitCount(blob) {
  let n = 0;
  for (const re of ADVANCED_TERMS) {
    if (re.test(blob)) n += 1;
  }
  return n;
}

export function isEdgarReport(title, text) {
  return EDGAR.test(`${title} ${text}`);
}

/** Rewrite only EDGAR filings or copy packed with advanced jargon. */
export function needsRewrite(title, text) {
  const blob = `${title || ""} ${text || ""}`;
  if (isEdgarReport(title, text)) return true;
  return advancedHitCount(blob) >= 2;
}

/** Higher = better pick for the feed (recency + usefulness). */
export function storyQuality(title, text, publishedIso) {
  const blob = `${title} ${text}`;
  let score = 50;

  const ageMs = Date.now() - new Date(publishedIso || Date.now()).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  score -= Math.min(40, ageHours);

  if (CLICKBAIT.test(title)) score -= 45;
  if (isEdgarReport(title, text)) score -= 10; // keep some, but prefer real news
  if (USEFUL.test(blob)) score += 30;
  if (/\d/.test(blob)) score += 8;
  if ((text || "").length > 80) score += 6;
  if ((title || "").length > 160) score -= 10;

  return score;
}

export function isClickbait(title) {
  return CLICKBAIT.test(title || "");
}

function finalizeLine(line) {
  let s = cleanSpaces(line);
  if (s.length > 200) {
    const slice = s.slice(0, 200);
    const stop = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? ")
    );
    const space = slice.lastIndexOf(" ");
    s =
      stop > 80
        ? slice.slice(0, stop + 1).trim()
        : space > 80
          ? slice.slice(0, space).trim()
          : slice.trim();
  }
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

function finalizeDetails(details, max = 520) {
  let s = cleanSpaces(details);
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const stop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (stop > 160) return slice.slice(0, stop + 1).trim();
  return `${slice.trimEnd()}…`;
}

/**
 * Keep original wording when it's already readable.
 * Rewrite only EDGAR / advanced jargon into a short beginner lesson.
 */
export function presentStory({ ticker, name, title, text, sentiment }) {
  const company = name || ticker;
  const rawTitle = stripSeoTail(title);
  const rawText = stripTickerNoise(text || title);
  const blob = `${rawTitle} ${rawText}`.toLowerCase();

  if (!needsRewrite(rawTitle, rawText)) {
    return {
      line: finalizeLine(rawTitle),
      details: finalizeDetails(
        firstSentences(rawText, 400) || rawTitle
      ),
      rewritten: false,
    };
  }

  // —— Rewrite path: EDGAR or advanced jargon only ——
  let line = "";
  let details = "";

  if (isEdgarReport(rawTitle, rawText)) {
    if (
      (/\binsider\b/.test(blob) ||
        /\b(ceo|cfo|chief|executive|president|officer)\b/.test(blob)) &&
      /\b(sell|sold|selling|dispose|disposed|liquidat)/.test(blob)
    ) {
      const tax = /\btax\b/.test(blob);
      line = tax
        ? `${company}: a company leader sold shares — often for taxes, not a bet against the business.`
        : `${company}: a top leader sold some of their shares (SEC filing).`;
      details =
        `This comes from an SEC / EDGAR ownership filing. Leaders sell for many personal reasons — taxes, a house, diversifying — so it is not always a red flag. Beginners still notice very large sales. ` +
        firstSentences(rawText, 200);
    } else if (
      /\b(holdings|stake|shares of|13f|wealth management|investment)\b/.test(
        blob
      )
    ) {
      line = `${company}: a big investor reported changing how many shares they own (SEC-style filing).`;
      details =
        `Funds buy and sell all the time. One filing rarely tells you if the company itself is healthier. For someone who owns ${ticker}: focus on ${company}'s customers and profits, not every fund tweak. ` +
        firstSentences(rawText, 180);
    } else {
      line = `${company}: new SEC / company filing — explained simply.`;
      details =
        `Filings are official paperwork. They can matter, but the language is dense. Plain takeaway: ${firstSentences(rawText, 240)} For someone who owns ${ticker}: ask whether this changes how ${company} makes money.`;
    }
  } else {
    // Advanced jargon in otherwise normal news
    line = finalizeLine(`${company}: ${simplifyAdvancedTitle(rawTitle, company)}`);
    details = finalizeDetails(
      `${simplifyAdvancedBody(rawText)} For someone who owns ${ticker}: this used heavy finance words — the idea above is the simple version. Sentiment leans ${
        sentiment === "bad" ? "cautious" : "constructive"
      }.`
    );
  }

  return {
    line: finalizeLine(line),
    details: finalizeDetails(details),
    rewritten: true,
  };
}

/** @deprecated use presentStory */
export function rewriteForBeginners(args) {
  return presentStory(args);
}

function simplifyAdvancedTitle(title, company) {
  let t = title;
  const re = new RegExp(`^${escapeRe(company)}\\s*[:\\-–—]?\\s*`, "i");
  t = t.replace(re, "");
  t = t
    .replace(/\bquarter-over-year\b/gi, "vs last year")
    .replace(/\bquarter-over-quarter\b/gi, "vs the last 3 months")
    .replace(/\byear-over-year\b/gi, "vs a year ago")
    .replace(/\bQoQ\b/g, "vs the last 3 months")
    .replace(/\bYoY\b/g, "vs a year ago")
    .replace(/\bEPS\b/g, "profit per share")
    .replace(/\bEBITDA\b/gi, "operating profit")
    .replace(/\bmarket capitalization\b/gi, "total company value")
    .replace(/\bdilution\b/gi, "extra shares that can shrink your slice")
    .replace(/\bheadwinds?\b/gi, "problems")
    .replace(/\btailwinds?\b/gi, "helpful trends")
    .replace(/\bnon-GAAP\b/gi, "adjusted")
    .replace(/\bcapex\b/gi, "spending on equipment");
  return cleanSpaces(t) || title;
}

function simplifyAdvancedBody(text) {
  return firstSentences(
    text
      .replace(/\bquarter-over-quarter\b/gi, "vs the last 3 months")
      .replace(/\byear-over-year\b/gi, "vs a year ago")
      .replace(/\bEPS\b/g, "profit per share")
      .replace(/\bEBITDA\b/gi, "operating profit")
      .replace(/\bmarket capitalization\b/gi, "total company value")
      .replace(/\bdilution\b/gi, "issuing more shares")
      .replace(/\bheadwinds?\b/gi, "problems")
      .replace(/\btailwinds?\b/gi, "helpful trends")
      .replace(/\bnon-GAAP\b/gi, "adjusted numbers")
      .replace(/\bproprietary channels?\b/gi, "its own sales channels")
      .replace(/\benterprise clients?\b/gi, "big business customers"),
    320
  );
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
