/**
 * News for beginners who own the stock.
 * Every list line = Company: what happened — effect on the stock.
 * Skip fluff, peer mentions, and stories we cannot explain.
 */

const CLICKBAIT =
  /\bvs\.?\b|comparing revenue|here'?s what|what would|closer look|cutting-edge|how much do you need|out-earn|social security|morning brew|market breadth|market highlights|house of cards|duct tape|could move|top \d+|top dividend|to buy in|to buy as|etfs?\s+to buy|stocks?\s+to buy|smarter .{0,20}to buy|not even close|rare discount|urges? .{0,40}stockholders|opportunity to join|fraud investigation|rosen law|have opportunity|you need invested|pays? up to|strong buy|especially on modest|\bis .{0,40}\ba buy\b|\bbuy on the dip\b|\bbuy points?\b|\bbull market\b|\bdividend dogs?\b|\baugust buys\b|\bideal\b.{0,30}dividend|\brating upgrade\b|\bprepare for phase\b|\bnear buy\b|\bdurable compounders\b|\bstand out as\b|\bbullish case\b|\bcould surprise\b|\bcall highlights\b|\btranscript\b|\bdiscusses key\b|\bkey initiatives\b/i;

const USEFUL =
  /\bearnings|profit|sales|revenue|deal|acquir|merger|lawsuit|probe|fda|dividend|buyback|guidance|outlook|ceo|cfo|launch|product|customers?|orders?|layoff|cut jobs|raises? prices?|beats?|miss(?:es|ed)?|upgrade|downgrade|recall|fine|settlement|ipo|split|insider|regulator|app store|security|growth|demand|guidance\b/i;

const EDGAR =
  /\bedgar\b|\bsec filing\b|\bform\s*4\b|\bform\s*8-?k\b|\bform\s*10-?[kq]\b|\bschedule\s*13[dg]\b|\b13f\b|\bbeneficial (?:owner|ownership)\b|\boption exercise\b|\bstrike price\b|\btax-related transaction\b|\bdisposes? \d|\bdisposition of\b|\bequity holdings?\b|\binsider (?:sells?|sold|sale)\b|\bceo .{0,40} sells? .{0,20}shares\b|\bcfo .{0,40} sells? .{0,20}shares\b|\bchief .{0,40} (?:sells?|disposes?)\b|\bwealth management\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its holdings\b|\bacquires? [\d,]+\s+shares\b|\bstake (?:trimmed|boosted|cut|reduced|increased)\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its stake\b|\bboosts? stake\b|\binvestment counsel\b|\btrust division\b|\binvestment solutions\b|\bstock holdings in\b|\bcloser look at the transaction\b/i;

const PEER_ONLY =
  /\b(?:mentioned|names?|citing|alongside|including)\b.{0,40}\b(?:as a |among )?(?:customer|supplier|peer|rival|competitor)\b|\bcompared (?:with|to)\b|\bstocks? (?:to|that) (?:watch|buy|own)\b/i;

export function cleanSpaces(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTickerNoise(text) {
  return cleanSpaces(text)
    .replace(/\([A-Z]{1,5}\s*[+\-]?\d+(\.\d+)?%?\)/g, "")
    .replace(/\$[A-Z]{1,5}\b/g, "")
    .replace(/\bNYSE:\s*[A-Z]{1,5}\b/gi, "")
    .replace(/\bNASDAQ:\s*[A-Z]{1,5}\b/gi, "")
    .replace(/\b[A-Z]{1,5}\s*[+\-]\d+(\.\d+)?%/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shortCompanyName(name) {
  return cleanSpaces(name || "")
    .replace(
      /\s+(inc\.?|corp\.?|corporation|company|co\.?|ltd\.?|plc|holdings?|group|technologies|technology)$/i,
      ""
    )
    .trim();
}

/** Story must clearly be about this stock — not a peer name-drop. */
export function aboutCompany(title, text, name, ticker) {
  const head = `${title || ""} ${(text || "").slice(0, 500)}`.toLowerCase();
  const tick = String(ticker || "").toLowerCase();
  const short = shortCompanyName(name).toLowerCase();
  if (tick && new RegExp(`\\b${escapeRe(tick)}\\b`).test(head)) return true;
  if (short.length >= 3 && head.includes(short)) return true;
  const full = String(name || "").toLowerCase();
  if (full.length >= 4 && head.includes(full)) return true;
  return false;
}

function stripSeoTail(title) {
  return cleanSpaces(title)
    .replace(/\.\s*Here'?s a Closer Look.*$/i, ".")
    .replace(/:\s*Here'?s What.*$/i, "")
    .replace(/\s*-\s*What Investors Need.*$/i, "")
    .replace(/\s*\(and It'?s Not Even Close\)\.?$/i, "")
    .replace(/\bQ[1-4] Earnings Call Highlights\.?$/i, "")
    .replace(/\bTranscript\.?$/i, "")
    .trim();
}

function firstSentences(text, maxChars = 280) {
  const t = cleanSpaces(text);
  if (!t) return "";
  const parts = t.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > maxChars && out) break;
    out = next;
    if (out.length >= 100) break;
  }
  return out || t.slice(0, maxChars);
}

/** Growth/sales % only — ignore margin / gross-margin figures. */
function extractGrowthPct(blob) {
  const s = String(blob);
  if (/\b(?:gross )?margin\b/i.test(s) && !/\b(?:sales|revenue|organic)\b.{0,40}%/i.test(s)) {
    // Allow only if a sales/revenue % appears away from "margin"
  }
  const patterns = [
    /(?:sales|revenue|organic(?:\s+sales)?|growth).{0,48}?(?:by |around |about |nearly |roughly |of |to |~)?(\d{1,2}(?:\.\d+)?)\s*%/i,
    /(?:by |around |about |nearly |roughly |~)(\d{1,2}(?:\.\d+)?)\s*%.{0,40}(?:sales|revenue|organic|growth)/i,
    /expects?.{0,40}(?:grow|growth).{0,24}(?:by |around |about |nearly )?(\d{1,2}(?:\.\d+)?)\s*%/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const pct = m[1];
    const idx = m.index ?? 0;
    const window = s.slice(Math.max(0, idx - 24), idx + m[0].length + 24);
    if (/\bmargin\b/i.test(window)) continue;
    return pct;
  }
  return null;
}

function dealRole(blob, name, ticker) {
  const short = shortCompanyName(name).toLowerCase();
  const tick = String(ticker || "").toLowerCase();
  const selling =
    new RegExp(
      `\\b(?:${escapeRe(short)}|${escapeRe(tick)})\\b.{0,40}\\b(?:sell|selling|sold|divest)`,
      "i"
    ).test(blob) ||
    new RegExp(
      `\\b(?:from|of)\\s+(?:${escapeRe(short)}|${escapeRe(tick)})\\b`,
      "i"
    ).test(blob);
  const buying =
    new RegExp(
      `\\b(?:${escapeRe(short)}|${escapeRe(tick)})\\b.{0,40}\\b(?:acquir|buy(?:ing|s)?|purchase)`,
      "i"
    ).test(blob) ||
    /\bto acquire\b/i.test(blob) === false &&
      new RegExp(
        `\\b(?:${escapeRe(short)}|${escapeRe(tick)})\\b.{0,30}\\b(?:buy|buys|buying)`,
        "i"
      ).test(blob);
  if (selling && !buying) return "sell";
  if (buying && !selling) return "buy";
  // "X to acquire Y from Boeing" → Boeing sells
  if (
    /\b(?:acquir|buy).{0,60}\bfrom\b/i.test(blob) &&
    new RegExp(`\\bfrom\\s+(?:${escapeRe(short)}|${escapeRe(tick)})\\b`, "i").test(
      blob
    )
  ) {
    return "sell";
  }
  return "deal";
}

export function isEdgarReport(title, text) {
  return EDGAR.test(`${title} ${text}`);
}

export function isClickbait(title, text = "") {
  return CLICKBAIT.test(title || "") || CLICKBAIT.test((text || "").slice(0, 160));
}

/** Classify story + stock effect for beginners. */
export function classifyStory(title, text, name = "", ticker = "") {
  const blob = `${title} ${text}`.toLowerCase();

  if (PEER_ONLY.test(`${title} ${String(text || "").slice(0, 220)}`)) {
    return { kind: "skip", sentiment: null, what: null, effect: null };
  }

  if (isEdgarReport(title, text)) {
    if (/\btax\b/.test(blob) && /\b(sell|sold|dispose)/.test(blob)) {
      return {
        kind: "insider_tax",
        sentiment: "bad",
        what: "a company leader sold shares, often to cover taxes",
        effect: "mild caution signal — usually not a business collapse",
      };
    }
    if (
      (/\binsider\b/.test(blob) ||
        /\b(ceo|cfo|chief|executive|officer)\b/.test(blob)) &&
      /\b(sell|sold|dispose|liquidat)/.test(blob)
    ) {
      return {
        kind: "insider_sell",
        sentiment: "bad",
        what: "a top leader sold some shares (SEC filing)",
        effect: "can worry owners short term; leaders also sell for personal cash",
      };
    }
    if (/\b(holdings|stake|13f|wealth management)\b/.test(blob)) {
      return {
        kind: "fund_filing",
        sentiment: "bad",
        what: "a large investor reported changing its stake",
        effect: "often noise for long-term owners",
      };
    }
    return {
      kind: "filing",
      sentiment: "bad",
      what: "new SEC paperwork about ownership or disclosures",
      effect: "risk clue only — not a full business update",
    };
  }

  if (
    /\b(miss|missed|falls short|cut.? guidance|lowered.?outlook|downgrade)\b/.test(
      blob
    ) &&
    /\b(earnings|profit|sales|revenue|guidance|outlook|estimate)\b/.test(blob)
  ) {
    return {
      kind: "miss",
      sentiment: "bad",
      what: "results or outlook came in weaker than expected",
      effect: "often puts pressure on the stock",
    };
  }

  if (
    (/\b(beat|topped|tops)\b/.test(blob) ||
      /\brais(?:ed|es|ing)?.{0,20}(?:guidance|outlook)\b/.test(blob) ||
      /\braising its full-year\b/.test(blob) ||
      /\braised its full-year\b/.test(blob)) &&
    /\b(earnings|profit|sales|revenue|guidance|outlook|affo|demand|growth|results?)\b/.test(
      blob
    )
  ) {
    const raised = /\brais(?:ed|es|ing)?.{0,20}(?:guidance|outlook)\b/.test(blob);
    return {
      kind: "beat",
      sentiment: "good",
      what: raised
        ? "raised its outlook after stronger results"
        : "results came in stronger than many expected",
      effect: "usually supportive for the stock",
    };
  }

  if (
    /\b(expects?|guides?|guidance|outlook|forecast|targets?)\b/.test(blob) &&
    /\b(sales|revenue|growth|profit|earnings)\b/.test(blob) &&
    !/\bprice target\b/.test(blob)
  ) {
    const pct = extractGrowthPct(blob);
    return {
      kind: "guidance",
      sentiment: "good",
      what: pct
        ? `expects about ${pct}% sales growth`
        : "updated its sales or profit outlook",
      effect: "investors judge if that outlook is strong enough",
    };
  }

  if (
    /\b(price target|pt to|overweight|underweight|outperform|underperform|analyst)\b/.test(
      blob
    ) ||
    /\b(upgrad(?:e|ed|es)|downgrad(?:e|ed|es))\b/.test(blob)
  ) {
    if (/\b(downgrad(?:e|ed|es)|underweight|underperform|cuts? (?:pt|price target))\b/.test(blob)) {
      return {
        kind: "analyst",
        sentiment: "bad",
        what: "an analyst cut their rating or price target",
        effect: "can pressure the stock short term",
      };
    }
    if (/\b(upgrad(?:e|ed|es)|overweight|outperform|raises? (?:pt|price target)|lifts? (?:pt|price target))\b/.test(blob)) {
      return {
        kind: "analyst",
        sentiment: "good",
        what: "an analyst raised their rating or price target",
        effect: "can support the stock short term",
      };
    }
    // Soft "maintains rating" / commentary — skip
    return { kind: "skip", sentiment: null, what: null, effect: null };
  }

  if (/\b(lawsuit|probe|investigation|sec |fine|settlement|regulator|fraud)\b/.test(blob)) {
    return {
      kind: "legal",
      sentiment: "bad",
      what: "legal or regulator news hit the company",
      effect: "adds risk until the issue is clearer",
    };
  }

  if (/\b(layoff|cut jobs|job cuts|restructuring)\b/.test(blob)) {
    return {
      kind: "layoffs",
      sentiment: "bad",
      what: "is cutting jobs or reorganizing",
      effect: "may save cash, but can also signal softer demand",
    };
  }

  if (
    /\bacquir/i.test(blob) ||
    /\b(merger|merged|merging|divest|spin-?off|takeover)\b/.test(blob) ||
    /\bbuy(?:ing|s)? .{0,24}(?:company|firm|startup|business)\b/.test(blob) ||
    /\bbought by\b/.test(blob)
  ) {
    const role = dealRole(blob, name, ticker);
    if (role === "sell") {
      return {
        kind: "deal",
        sentiment: "good",
        what: "is selling a business or assets in a deal",
        effect: "can free up cash, but may shrink future sales",
      };
    }
    if (role === "buy") {
      return {
        kind: "deal",
        sentiment: "good",
        what: "is buying another company or assets",
        effect: "can help growth, but deals can be costly",
      };
    }
    return {
      kind: "deal",
      sentiment: "good",
      what: "has deal news (buy, sell, or merge)",
      effect: "watch the price paid and what the deal changes",
    };
  }

  if (/\b(dividend|buyback|repurchase)\b/.test(blob)) {
    return {
      kind: "cash_return",
      sentiment: "good",
      what: "returned cash to owners via dividend or buybacks",
      effect: "usually owner-friendly if the business stays healthy",
    };
  }

  if (
    /\b(report(?:ed|s)?|posted|announced)\b/.test(blob) &&
    /\b(earnings|profit|revenue|sales|income)\b/.test(blob) &&
    /\b(\$[\d.]+|\d+(\.\d+)?%|billion|million)\b/.test(blob)
  ) {
    const soft = /\b(fall|drop|weak|miss|decline|lower|slump)\b/.test(blob);
    return {
      kind: "results",
      sentiment: soft ? "bad" : "good",
      what: soft
        ? "reported softer sales or profits"
        : "reported its latest sales or profits",
      effect: soft
        ? "often weighs on the stock if worse than expected"
        : "investors watch whether the numbers beat expectations",
    };
  }

  if (
    /\b(comparable sales|same-?store|comp sales|monthly sales|membership)\b/.test(
      blob
    )
  ) {
    const soft = /\b(fall|drop|weak|slow|decline|miss)\b/.test(blob);
    return {
      kind: "sales_update",
      sentiment: soft ? "bad" : "good",
      what: soft
        ? "reported softer recent sales trends"
        : "reported solid recent sales trends",
      effect: soft
        ? "often weighs on the stock if the slowdown continues"
        : "usually supportive if growth holds up",
    };
  }

  if (
    /\b(capex|capital expenditure|invest(?:ing|ment) in (?:ai|data center))\b/.test(
      blob
    ) &&
    /\b(ai|data center|demand|growth)\b/.test(blob)
  ) {
    return {
      kind: "capex",
      sentiment: "good",
      what: "is raising investment for growth (e.g. AI or capacity)",
      effect: "can signal confidence, but spending can also pressure near-term profits",
    };
  }

  if (
    /\b(launch(?:es|ed)?|new product|wins? (?:a )?contract|contract win|fda (?:approv|clear)|customer win|orders? (?:rise|grew|jump)|partnership|approv(?:al|ed))\b/.test(
      blob
    )
  ) {
    const soft = /\b(fall|drop|weak|slow|cut|risk|fear|delay|cancel|reject)\b/.test(
      blob
    );
    return {
      kind: "business",
      sentiment: soft ? "bad" : "good",
      what: soft
        ? "hit a setback on a product, order, or approval"
        : "won a product, order, customer, or approval update",
      effect: soft
        ? "can weigh on the stock until the next proof point"
        : "can help if it turns into real sales and profits",
    };
  }

  // Loose "demand" alone is too noisy (often peer / analyst fluff)
  if (
    /\b(demand|orders?)\b/.test(blob) &&
    /\b(strong|robust|rising|surg|growth|weak|soft|slow)\b/.test(blob) &&
    aboutCompany(title, text, name, ticker)
  ) {
    const soft = /\b(weak|soft|slow|fall|drop)\b/.test(blob);
    return {
      kind: "demand",
      sentiment: soft ? "bad" : "good",
      what: soft
        ? "saw signs of softer demand"
        : "saw signs of stronger demand",
      effect: soft
        ? "can pressure the stock until sales recover"
        : "usually supportive if it shows up in results",
    };
  }

  return { kind: "other", sentiment: null, what: null, effect: null };
}

function softDetail(company, text, name, ticker) {
  const parts = cleanSpaces(text).split(/(?<=[.!?])\s+/);
  const nameL = String(name || "").toLowerCase();
  const short = shortCompanyName(name).toLowerCase();
  const tick = String(ticker || "").toUpperCase();
  const scored = parts
    .map((p) => {
      const u = p.toUpperCase();
      const l = p.toLowerCase();
      let s = 0;
      if (nameL && l.includes(nameL)) s += 4;
      if (short && l.includes(short)) s += 3;
      if (tick && u.includes(tick)) s += 4;
      if (USEFUL.test(p)) s += 3;
      if (/\d/.test(p)) s += 1;
      if (isClickbait(p) || /\?$/.test(p.trim())) s -= 6;
      if (PEER_ONLY.test(p)) s -= 8;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  let fact = scored[0]?.p || firstSentences(text, 220);
  fact = stripTickerNoise(fact);
  const re = new RegExp(`^${escapeRe(company)}\\b[,:]?\\s*`, "i");
  fact = fact.replace(re, "").replace(/^['’]s\s+/i, "");
  if (fact.length > 220) {
    const cut = fact.slice(0, 220);
    const sp = cut.lastIndexOf(" ");
    fact = (sp > 100 ? cut.slice(0, sp) : cut).trim();
  }
  return fact.replace(/\.$/, "") || null;
}

function finalizeLine(line) {
  let s = cleanSpaces(line);
  // Never cut mid-word; keep both sides of the em dash readable
  if (s.length > 168) {
    const dash = s.indexOf(" — ");
    if (dash > 40 && dash < 110) {
      const left = s.slice(0, dash);
      const right = s.slice(dash + 3);
      const leftMax = 95;
      let L = left;
      if (L.length > leftMax) {
        const sp = L.lastIndexOf(" ", leftMax);
        L = (sp > 40 ? L.slice(0, sp) : L.slice(0, leftMax)).trim();
      }
      const rightMax = 70;
      let R = right;
      if (R.length > rightMax) {
        const sp = R.lastIndexOf(" ", rightMax);
        R = (sp > 30 ? R.slice(0, sp) : R.slice(0, rightMax)).trim();
      }
      s = `${L} — ${R}`;
    } else {
      const slice = s.slice(0, 168);
      const space = slice.lastIndexOf(" ");
      s = (space > 80 ? slice.slice(0, space) : slice).trim();
    }
  }
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}

function finalizeDetails(details, max = 480) {
  let s = cleanSpaces(details);
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const stop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (stop > 140) return slice.slice(0, stop + 1).trim();
  return `${slice.trimEnd()}…`;
}

/** True if we can explain a stock effect — otherwise skip the story. */
export function canExplainEffect(title, text, name = "", ticker = "") {
  if (PEER_ONLY.test(`${title} ${String(text || "").slice(0, 220)}`)) return false;
  // Earnings-call transcripts rarely say what moved — skip unless a clear beat/miss/deal.
  if (/\b(transcript|call highlights|discusses key)\b/i.test(title || "")) {
    if (
      !/\b(miss|missed|beat|topped|raised .{0,20}(?:guidance|outlook)|acquir|dividend|layoff|lawsuit)\b/i.test(
        `${title} ${text}`
      )
    ) {
      return false;
    }
  }
  if (isClickbait(title) && !USEFUL.test(`${title} ${text}`)) return false;
  if (name || ticker) {
    if (!aboutCompany(title, text, name, ticker)) return false;
  }
  const c = classifyStory(title, text, name, ticker);
  if (c.kind === "skip" || c.kind === "other") return false;
  return Boolean(c.what && c.effect);
}

/** Higher = better for the feed. */
export function storyQuality(title, text, publishedIso, name = "", ticker = "") {
  const blob = `${title} ${text}`;
  let score = 40;

  const ageMs = Date.now() - new Date(publishedIso || Date.now()).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  score -= Math.min(35, ageHours);

  if (!canExplainEffect(title, text, name, ticker)) score -= 80;
  if (isClickbait(title)) score -= 40;
  if (isEdgarReport(title, text)) score -= 5;
  if (USEFUL.test(blob)) score += 25;
  if (/\b(rais|beat|miss|outlook|guidance|growth|layoff|lawsuit|acquir)\b/i.test(blob))
    score += 20;
  if (/\d/.test(blob)) score += 10;
  if ((text || "").length > 100) score += 8;
  if (aboutCompany(title, text, name, ticker)) score += 15;

  return score;
}

export function isClickbaitTitle(title) {
  return isClickbait(title);
}

/**
 * line = what happened + effect on the stock
 * details = plain English for the owner
 * sentiment = good | bad
 */
export function presentStory({ ticker, name, title, text }) {
  const company = name || ticker;
  const rawTitle = stripSeoTail(title);
  const rawText = stripTickerNoise(text || title);
  const cls = classifyStory(rawTitle, rawText, name, ticker);

  if (
    cls.kind === "skip" ||
    cls.kind === "other" ||
    !cls.what ||
    !cls.effect ||
    !aboutCompany(rawTitle, rawText, name, ticker)
  ) {
    return {
      line: "",
      details: "",
      sentiment: "bad",
      skip: true,
    };
  }

  const what = cls.what;
  const effect = cls.effect;
  const sentiment = cls.sentiment || "good";

  let whatClean = what.replace(
    new RegExp(`^${escapeRe(company)}\\b[,:]?\\s*`, "i"),
    ""
  );

  const line = finalizeLine(`${company}: ${whatClean} — ${effect}`);

  const detailFact =
    softDetail(company, rawText, name, ticker) || firstSentences(rawText, 240);
  const details = finalizeDetails(
    `What happened: ${detailFact}. ` +
      `If you own ${ticker}: ${effect}. ` +
      `Focus on customers, products, and profits — not the headline alone.`
  );

  return { line, details, sentiment, skip: false };
}

/** @deprecated */
export function rewriteForBeginners(args) {
  return presentStory(args);
}

export function needsRewrite() {
  return true;
}
