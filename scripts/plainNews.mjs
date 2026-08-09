/**
 * Turn raw market headlines into plain-English lessons for beginners.
 * No LLM — pattern cleanup + simple educational framing.
 */

const JARGON = [
  [/\bearnings calls?\b/gi, "results meeting"],
  [/\bquarter-over-quarter\b/gi, "vs the last 3 months"],
  [/\byear-over-year\b/gi, "vs a year ago"],
  [/\bQoQ\b/g, "vs the last 3 months"],
  [/\bYoY\b/g, "vs a year ago"],
  [/\brevenues?\b/gi, "sales"],
  [/\bnet income\b/gi, "profit"],
  [/\bEPS\b/g, "profit per share"],
  [/\bguidance\b/gi, "what management expects next"],
  [/\bmarket capitalization\b/gi, "total company value"],
  [/\bmarket cap\b/gi, "total company value"],
  [/\bequity holdings?\b/gi, "shares they own"],
  [/\binsider\b/gi, "someone who works at the company"],
  [/\bvolatility\b/gi, "how much the price jumps around"],
  [/\bvaluation\b/gi, "how expensive the stock looks"],
  [/\bheadwinds?\b/gi, "problems"],
  [/\btailwinds?\b/gi, "helpful trends"],
  [/\bdilution\b/gi, "creating more shares (which can shrink your slice)"],
  [/\bbuyback\b/gi, "company buying its own shares"],
  [/\bM&A\b/g, "buying or merging with another company"],
  [/\bacquisition\b/gi, "buying another company"],
  [/\bproprietary\b/gi, "its own"],
  [/\benterprise clients?\b/gi, "big business customers"],
  [/\bWall Street\b/g, "analysts"],
];

const CLICKBAIT =
  /\bvs\.?\b|comparing revenue|here'?s what|what would|closer look at the transaction|artificial intelligence c|cutting-edge|here's a closer|how much do you need|out-earn the average|social security check|morning brew|weekend morning|market breadth|market highlights|house of cards|duct tape|just made a decision that could move/i;

const USEFUL =
  /\bearnings|profit|sales|revenue|deal|acquir|merger|lawsuit|probe|fda|dividend|buyback|guidance|ceo|cfo|launch|product|customers?|orders?|layoff|cut jobs|raises? prices?|beats?|miss(?:es|ed)?|upgrade|downgrade|recall|fine|settlement|ipo|split|insider|regulator|fact-checking\b/i;

const LOW_VALUE =
  /\bwealth management\b|\bhas \$\d|\bstock holdings in\b|\b(?:trimmed|boosted|grew|increased|reduced|cut) its holdings\b|\bincreased its stake\b|\bboosts? stake\b|\bstake (?:trimmed|boosted|cut|reduced|increased)\b|\bstake in\b|\bacquires? [\d,]+\s+shares\b|\b13f\b|\bmorning brew\b|\bmarket breadth\b|\binvestment counsel\b|\bci investments\b|\btrust division\b|\binvestment solutions\b/i;

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

export function deJargon(text) {
  let out = stripTickerNoise(text);
  for (const [re, repl] of JARGON) out = out.replace(re, repl);
  return cleanSpaces(out);
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
    if (out.length >= 120) break;
  }
  return out || t.slice(0, maxChars);
}

function stripSeoTail(title) {
  return cleanSpaces(title)
    .replace(/\.\s*Here'?s a Closer Look.*$/i, ".")
    .replace(/:\s*Here'?s What.*$/i, "")
    .replace(/\s*—\s*.*$/g, "")
    .replace(/\s*-\s*What Investors Need.*$/i, "")
    .trim();
}

/** Higher = better for a beginner holding this ticker. */
export function storyQuality(title, text, publishedIso) {
  const blob = `${title} ${text}`;
  let score = 50;

  const ageMs = Date.now() - new Date(publishedIso || Date.now()).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  // Prefer freshest: −1 per hour, floor at −40
  score -= Math.min(40, ageHours);

  if (CLICKBAIT.test(title)) score -= 45;
  if (LOW_VALUE.test(blob)) score -= 35;
  if (USEFUL.test(blob)) score += 30;
  if (/\d/.test(blob)) score += 8;
  if ((text || "").length > 80) score += 6;
  if ((title || "").length > 160) score -= 10;

  return score;
}

export function isClickbait(title) {
  return CLICKBAIT.test(title || "") || LOW_VALUE.test(title || "");
}

/**
 * Rewrite into a short lesson: what happened + why a beginner should care.
 */
export function rewriteForBeginners({
  ticker,
  name,
  title,
  text,
  sentiment,
}) {
  const company = name || ticker;
  const rawTitle = stripSeoTail(title);
  const rawText = stripTickerNoise(text || title);
  // Classify on RAW copy — jargon cleanup can erase words like "insider".
  const blob = `${rawTitle} ${rawText}`.toLowerCase();
  const softText = deJargon(rawText);

  let line = "";
  let details = "";

  if (
    /\b(q[1-4]|quarterly)\b/.test(blob) &&
    /\b(earnings call|call highlights|results call)\b/.test(blob)
  ) {
    line = `${company}: leaders talked through the latest quarterly results.`;
    details =
      `A results meeting is when management explains recent sales, profits, and what they expect next. For beginners: listen for whether the business is growing, and what could go wrong. ` +
      firstSentences(softText, 200);
  } else if (
    (/\binsider\b/.test(blob) ||
      /\b(ceo|cfo|chief|executive|president|officer)\b/.test(blob)) &&
    /\b(sell|sold|selling|dispose|disposed|liquidat)/.test(blob)
  ) {
    const tax = /\btax\b/.test(blob);
    line = tax
      ? `${company}: a company leader sold shares — often for taxes, not a bet against the business.`
      : `${company}: a top leader sold some of their shares.`;
    details =
      `Leaders sell for many personal reasons — taxes, a house, diversifying. It is not always a red flag. Beginners still notice very large sales: ask whether the business story still looks strong. ` +
      firstSentences(softText, 220);
  } else if (LOW_VALUE.test(blob)) {
    line = `${company}: a big investor reported changing how many shares they own.`;
    details =
      `Funds buy and sell all the time. One filing rarely tells you if the company itself is healthier. For someone who owns ${ticker}: focus on ${company}'s customers and profits, not every fund tweak. ` +
      firstSentences(softText, 180);
  } else if (
    /\b(beat|topped|tops)\b/.test(blob) &&
    /\b(profit|sales|estimate|expect|earnings)\b/.test(blob)
  ) {
    line = `${company}: results came in stronger than many analysts expected.`;
    details =
      `When a company "beats," it usually sold more or made more profit than the crowd guessed. That can lift the stock — but one good report does not guarantee the next one. ` +
      firstSentences(softText, 200);
  } else if (
    /\b(miss|missed|falls short)\b/.test(blob) &&
    /\b(profit|sales|estimate|expect|earnings)\b/.test(blob)
  ) {
    line = `${company}: results were weaker than many analysts expected.`;
    details =
      `A "miss" means sales or profits lagged the guess. Stocks often drop, then recover if the business plan still looks solid. Read what management says happens next. ` +
      firstSentences(softText, 200);
  } else if (/\b(acquir|merger|buy(?:ing|s)? another|bought by)\b/.test(blob)) {
    line = `${company}: there is news about buying, selling, or merging with another company.`;
    details =
      `Deals can grow the business — or distract it and cost a lot. For owners, ask: does this make ${company} stronger with customers, or mostly bigger for the sake of size? ` +
      firstSentences(softText, 200);
  } else if (
    /\b(lawsuit|probe|investigation|sec |fine|settlement|regulator|eu tells|fact-checking)\b/.test(
      blob
    )
  ) {
    line = `${company}: legal or regulator news showed up — that can create risk.`;
    details =
      `Rules and lawsuits do not always end badly, but they can cost money and attention. Beginners should note the issue, then watch whether the core business (customers and products) still looks healthy. ` +
      firstSentences(softText, 200);
  } else if (
    /\b(how much do you need|out-earn|social security)\b/.test(blob) &&
    /\bdividend/.test(blob)
  ) {
    line = `${company}: article about using dividends as income — here is the simple takeaway.`;
    details =
      `Dividends are cash the company pays shareholders. Higher yield can mean more income — or a business under stress. For beginners who own ${ticker}: treat dividend math as a lesson, not a promise. ` +
      firstSentences(softText, 200);
  } else if (/\b(dividend|buyback|repurchase)\b/.test(blob)) {
    line = `${company}: news about returning cash to shareholders (dividend or buying its own shares).`;
    details =
      `Dividends pay you cash. Buybacks shrink the share count so each share is a slightly bigger slice — if the price paid is fair. Neither fixes a weak business by itself. ` +
      firstSentences(softText, 200);
  } else if (/\b(layoff|cut jobs|job cuts|restructuring)\b/.test(blob)) {
    line = `${company}: the company is cutting jobs or reorganizing.`;
    details =
      `Job cuts can save money short term. They can also mean demand is soft or a big bet failed. Watch whether sales stabilize afterward. ` +
      firstSentences(softText, 200);
  } else if (/\bvs\.?\b|comparing/.test(rawTitle)) {
    const aboutUs = sentencesAbout(softText, company, ticker);
    line = `${company}: a comparison article mentions this stock — here is the useful part in plain English.`;
    details =
      aboutUs ||
      `${firstSentences(softText, 240)} For someone who owns ${ticker}: ignore the "winner vs loser" framing and look only at whether ${company}'s sales and profits are growing in a steady way.`;
  } else {
    line = beginnerLine(company, deJargon(rawTitle), softText);
    details = beginnerDetails(company, ticker, softText, sentiment);
  }

  line = finalizeLine(line);
  details = finalizeDetails(details, company, ticker);
  return { line, details };
}

function sentencesAbout(text, name, ticker) {
  const parts = cleanSpaces(text).split(/(?<=[.!?])\s+/);
  const hit = parts.filter(
    (p) =>
      p.toLowerCase().includes(String(name).toLowerCase()) ||
      p.toUpperCase().includes(String(ticker).toUpperCase())
  );
  if (!hit.length) return "";
  return `About ${name}: ${deJargon(hit.slice(0, 2).join(" "))} For a beginner who owns ${ticker}: that is the part that actually touches your investment.`;
}

function beginnerLine(company, title, text) {
  let core = title;
  const re = new RegExp(`^${escapeRe(company)}\\s*[:\\-–—]?\\s*`, "i");
  core = core.replace(re, "");
  core = core.replace(new RegExp(`^${escapeRe(company)}\\b[,:]?\\s*`, "i"), "");
  core = cleanSpaces(core)
    .replace(/\bQ([1-4])\b/gi, "Q$1")
    .replace(/\bcall highlights\b/gi, "key points from the results meeting")
    .replace(/\bearnings\b/gi, "results");

  // Metaphor / hype titles → use the article’s first clear sentence instead
  if (
    !core ||
    core.length < 12 ||
    CLICKBAIT.test(core) ||
    !USEFUL.test(core)
  ) {
    const fromBody = firstSentences(text, 120);
    if (fromBody && fromBody.length > 20) core = fromBody;
  }

  core = core.replace(/\.$/, "");
  if (core.length > 140) core = firstSentences(core, 140).replace(/\.$/, "");
  return `${company}: ${softStart(core)}.`;
}

function beginnerDetails(company, ticker, text, sentiment) {
  const body = firstSentences(text, 260) || `${company} was in the news.`;
  const tone =
    sentiment === "bad"
      ? `This leans negative — it does not mean you must sell, but you should understand the risk.`
      : `This leans constructive — still check that the story matches how ${company} actually makes money.`;
  return `${body} ${tone} For someone who owns ${ticker}: ask “does this change customers, products, or profits over the next few years?”`;
}

function finalizeLine(line) {
  let s = cleanSpaces(line);
  s = s.replace(/\s+\./g, ".");
  s = s.replace(/\.\.+/g, ".");
  // Cap without mid-word cut — prefer sentence end, else last space
  if (s.length > 160) {
    const slice = s.slice(0, 160);
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
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

function finalizeDetails(details, company, ticker) {
  let s = cleanSpaces(details);
  if (!s.toLowerCase().includes("for someone who owns")) {
    s += ` For someone who owns ${ticker}: keep the focus on how ${company} earns money and whether this news helps or hurts that.`;
  }
  if (s.length <= 520) return s;
  const slice = s.slice(0, 520);
  const stop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (stop > 160) return slice.slice(0, stop + 1).trim();
  return `${slice.trimEnd()}…`;
}

function softStart(s) {
  const t = cleanSpaces(s);
  if (!t) return t;
  // Keep quarter labels / acronyms readable
  if (/^Q[1-4]\b/i.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
  if (/^[A-Z]{2,5}\b/.test(t)) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
