/**
 * News for the feed: the list "title" is always a factual gist —
 * never a clickbait headline. EDGAR / heavy jargon get a plain rewrite;
 * other stories get a one-sentence gist from the article body or a
 * cleaned factual title.
 */

const CLICKBAIT =
  /\bvs\.?\b|comparing revenue|here'?s what|what would|closer look|cutting-edge|how much do you need|out-earn|social security|morning brew|market breadth|market highlights|house of cards|duct tape|could move|top \d+|top dividend|to buy in|to buy as|etfs?\s+to buy|stocks?\s+to buy|smarter .{0,20}to buy|not even close|rare discount|urges? .{0,40}stockholders|opportunity to join|fraud investigation|rosen law|have opportunity|you need invested|pays? up to|strong buy|especially on modest|\bis .{0,40}\ba buy\b|\bbuy on the dip\b|\bbuy points?\b|\bbull market\b|\bdividend dogs?\b|\baugust buys\b|\bideal\b.{0,30}dividend|\brating upgrade\b|\bprepare for phase\b|\bnear buy\b|\bdurable compounders\b|\bstand out as\b|\bbullish case\b/i;

const USEFUL =
  /\bearnings|profit|sales|revenue|deal|acquir|merger|lawsuit|probe|fda|dividend|buyback|guidance|ceo|cfo|launch|product|customers?|orders?|layoff|cut jobs|raises? prices?|beats?|miss(?:es|ed)?|upgrade|downgrade|recall|fine|settlement|ipo|split|insider|regulator|fact-checking|app store|security\b/i;

const EDGAR =
  /\bedgar\b|\bsec filing\b|\bform\s*4\b|\bform\s*8-?k\b|\bform\s*10-?[kq]\b|\bschedule\s*13[dg]\b|\b13f\b|\bbeneficial (?:owner|ownership)\b|\boption exercise\b|\bstrike price\b|\btax-related transaction\b|\bdisposes? \d|\bdisposition of\b|\bequity holdings?\b|\binsider (?:sells?|sold|sale)\b|\bceo .{0,40} sells? .{0,20}shares\b|\bcfo .{0,40} sells? .{0,20}shares\b|\bchief .{0,40} (?:sells?|disposes?)\b|\bwealth management\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its holdings\b|\bacquires? [\d,]+\s+shares\b|\bstake (?:trimmed|boosted|cut|reduced|increased)\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its stake\b|\bboosts? stake\b|\binvestment counsel\b|\btrust division\b|\binvestment solutions\b|\bstock holdings in\b|\bcloser look at the transaction\b|\babner herrman\b/i;

const ADVANCED_TERMS = [
  /\bdilution\b/i,
  /\bQoQ\b/,
  /\bYoY\b/,
  /\bEPS\b/,
  /\bEBITDA\b/i,
  /\bP\/E\b/i,
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
    .replace(/\$[A-Z]{1,5}\b/g, "")
    .replace(/\b[A-Z]{1,5}\s*[+\-]\d+(\.\d+)?%/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripSeoTail(title) {
  return cleanSpaces(title)
    .replace(/\.\s*Here'?s a Closer Look.*$/i, ".")
    .replace(/:\s*Here'?s What.*$/i, "")
    .replace(/\s*-\s*What Investors Need.*$/i, "")
    .replace(/\s*\(and It'?s Not Even Close\)\.?$/i, "")
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
    if (out.length >= 120) break;
  }
  return out || t.slice(0, maxChars);
}

function sentencesAbout(text, name, ticker) {
  const parts = cleanSpaces(text).split(/(?<=[.!?])\s+/);
  const nameL = String(name || "").toLowerCase();
  const tick = String(ticker || "").toUpperCase();
  const scored = parts
    .map((p) => {
      const u = p.toUpperCase();
      const l = p.toLowerCase();
      let s = 0;
      if (nameL && l.includes(nameL)) s += 3;
      if (tick && u.includes(tick)) s += 3;
      if (USEFUL.test(p)) s += 2;
      if (isClickbait(p) || /\?$/.test(p.trim())) s -= 5;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length) return cleanSpaces(scored.slice(0, 2).map((x) => x.p).join(" "));
  // Fall back to first non-tease sentence
  const plain = parts.find((p) => !isClickbait(p) && !/\?$/.test(p.trim()));
  return plain || firstSentences(text, 220);
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

export function isClickbait(title, text = "") {
  return CLICKBAIT.test(title || "") || CLICKBAIT.test(text.slice(0, 120));
}

function isFactualTitle(title) {
  if (!title || title.length < 16) return false;
  if (isClickbait(title)) return false;
  if (/\?$/.test(title.trim())) return false; // questions are usually teases
  return (
    USEFUL.test(title) ||
    /\b(q[1-4]|quarter|raises?|cuts?|sues?|settles?|launches?|opens?|closes?|wins?|loses?|reports?|says?|agrees?|signs?)\b/i.test(
      title
    )
  );
}

/** Higher = better for the feed. */
export function storyQuality(title, text, publishedIso) {
  const blob = `${title} ${text}`;
  let score = 50;

  const ageMs = Date.now() - new Date(publishedIso || Date.now()).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  score -= Math.min(40, ageHours);

  if (isClickbait(title)) score -= 55;
  if (isEdgarReport(title, text)) score -= 8;
  if (USEFUL.test(blob)) score += 30;
  if (isFactualTitle(title)) score += 12;
  if (/\d/.test(blob)) score += 8;
  if ((text || "").length > 80) score += 6;
  if ((title || "").length > 160) score -= 10;

  return score;
}

function finalizeLine(line) {
  let s = cleanSpaces(line);
  s = s.replace(/\s+\./g, ".").replace(/\.\.+/g, ".");
  if (s.length > 180) {
    const slice = s.slice(0, 180);
    const stop = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? ")
    );
    const space = slice.lastIndexOf(" ");
    s =
      stop > 70
        ? slice.slice(0, stop + 1).trim()
        : space > 70
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

function simplifyJargon(text) {
  return cleanSpaces(
    text
      .replace(/\bquarter-over-quarter\b/gi, "vs the last 3 months")
      .replace(/\byear-over-year\b/gi, "vs a year ago")
      .replace(/\bQoQ\b/g, "vs the last 3 months")
      .replace(/\bYoY\b/g, "vs a year ago")
      .replace(/\bEPS\b/g, "profit per share")
      .replace(/\bEBITDA\b/gi, "operating profit")
      .replace(/\bmarket capitalization\b/gi, "total company value")
      .replace(/\bdilution\b/gi, "issuing more shares")
      .replace(/\bheadwinds?\b/gi, "problems")
      .replace(/\btailwinds?\b/gi, "helpful trends")
      .replace(/\bnon-GAAP\b/gi, "adjusted")
      .replace(/\bcapex\b/gi, "equipment spending")
      .replace(/\bproprietary channels?\b/gi, "its own sales channels")
      .replace(/\benterprise clients?\b/gi, "big business customers")
  );
}

/**
 * One factual sentence for the list title slot (the gist).
 */
function gistLine(company, ticker, title, text) {
  const rawTitle = stripSeoTail(title);
  const rawText = stripTickerNoise(text || "");
  const blob = `${rawTitle} ${rawText}`.toLowerCase();

  // EDGAR / ownership filings → plain gist
  if (isEdgarReport(rawTitle, rawText)) {
    if (
      (/\binsider\b/.test(blob) ||
        /\b(ceo|cfo|chief|executive|president|officer)\b/.test(blob)) &&
      /\b(sell|sold|selling|dispose|disposed|liquidat)/.test(blob)
    ) {
      return /\btax\b/.test(blob)
        ? `${company}: a company leader sold shares (often for taxes — not always a warning).`
        : `${company}: a top leader sold some of their shares (SEC filing).`;
    }
    if (/\b(holdings|stake|shares of|13f|wealth management|investment)\b/.test(blob)) {
      return `${company}: a large investor reported changing its share count (ownership filing).`;
    }
    return `${company}: new SEC / company filing about ownership or disclosures.`;
  }

  // Clickbait / tease titles → gist from the article body
  if (isClickbait(rawTitle) || !isFactualTitle(rawTitle)) {
    let fromBody = sentencesAbout(rawText, company, ticker);
    fromBody = simplifyJargon(stripTickerNoise(fromBody));
    if (fromBody && fromBody.length > 28 && !isClickbait(fromBody)) {
      // Ensure company is named once up front if missing
      if (!fromBody.toLowerCase().includes(String(company).toLowerCase().slice(0, 8))) {
        return `${company}: ${softStart(fromBody)}`;
      }
      return fromBody;
    }
  }

  // Factual title — use it as the gist (light cleanup)
  let core = rawTitle;
  const re = new RegExp(`^${escapeRe(company)}\\s*[:\\-–—]?\\s*`, "i");
  const hadName = re.test(core);
  core = core.replace(re, "");
  // Drop leftover legal-name crumbs ("and Company", "Inc.", etc.)
  core = core
    .replace(/^and Company\b[,:]?\s*/i, "")
    .replace(/^(Inc|Corp|Corporation|Co|Ltd|PLC)\.?\b[,:]?\s*/i, "")
    .replace(/^['’]s\s+/i, "")
    .replace(/^,\s*/, "");
  core = simplifyJargon(stripTickerNoise(core));
  if (advancedHitCount(core) >= 2) core = simplifyJargon(core);
  if (!core || core.length < 12) {
    core = simplifyJargon(sentencesAbout(rawText, company, ticker));
  }
  if (hadName || !core.toLowerCase().includes(String(company).toLowerCase().slice(0, 6))) {
    return `${company}: ${softStart(core)}`;
  }
  return core;
}

function softStart(s) {
  const t = cleanSpaces(s);
  if (!t) return t;
  if (/^Q[1-4]\b/i.test(t)) return t;
  if (/^[A-Z]{2,5}\b/.test(t) && !/^[A-Z][a-z]/.test(t)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * line = gist shown in the feed title slot
 * details = short supporting context (not a second clickbait)
 */
export function presentStory({ ticker, name, title, text }) {
  const company = name || ticker;
  const rawTitle = stripSeoTail(title);
  const rawText = stripTickerNoise(text || title);

  const line = finalizeLine(gistLine(company, ticker, rawTitle, rawText));

  let details = sentencesAbout(rawText, company, ticker);
  details = simplifyJargon(stripTickerNoise(details));
  // Don't repeat the gist verbatim as details
  if (cleanSpaces(details).toLowerCase() === cleanSpaces(line).toLowerCase()) {
    details = firstSentences(rawText, 360);
  }
  if (isEdgarReport(rawTitle, rawText)) {
    details =
      `Official filing language is dense — here is the useful part: ${details} ` +
      `For someone who owns ${ticker}: this is paperwork about shares or disclosures, not a full business update.`;
  } else if (advancedHitCount(`${rawTitle} ${rawText}`) >= 2) {
    details = `${details} (Simplified from denser finance wording.)`;
  }

  return {
    line,
    details: finalizeDetails(details || line),
  };
}

/** @deprecated */
export function rewriteForBeginners(args) {
  return presentStory(args);
}

export function needsRewrite(title, text) {
  return isEdgarReport(title, text) || advancedHitCount(`${title} ${text}`) >= 2 || isClickbait(title);
}
