type Dict = Record<string, string>;

const en: Dict = {
  // landing
  "brand.build": "BUILD",
  "landing.tagline":
    "Create a smart stock portfolio in under a minute. No experience needed.",
  "landing.seePortfolio": "SEE MY PORTFOLIO →",

  // nav
  "nav.dashboard": "DASHBOARD",
  "nav.news": "YOUR NEWS",
  "nav.ideas": "IDEAS",
  "nav.snipers": "SNIPER",
  "nav.admin": "ADMIN",

  // common
  "common.loading": "Loading…",
  "common.potential": "{v} R2R",
  "common.r2r": "{v} R2R",
  "common.r2rHint": "Tap R2R for hypothetical P/L",
  "common.hypoProfit": "If target hit: {v} profit",
  "common.hypoLoss": "If stop hit: {v} loss",
  "common.buy": "Buy",
  "common.sell": "Sell",
  "common.exit": "Exit",
  "common.riskSuffix": "{level} risk",
  "common.close": "Close",

  // build
  "build.back": "← SNIPER",
  "build.chosen": "{n} of {max} chosen",
  "build.title": "Pick a few famous companies you like",
  "build.subtitle":
    "Choose 1–{max} well-known stocks. We'll complete a balanced portfolio of up to 12. Each card shows reward-to-risk (R2R) from buy → target vs buy → stop.",
  "build.buildingCta": "BUILDING…",
  "build.pickForMe": "PICK FOR ME",
  "build.buildMine": "BUILD MY PORTFOLIO",
  "build.needPick": "Pick at least {min} stock first (tap + on a card), then press BUILD.",
  "build.failed": "Could not build your portfolio. Try again.",
  "build.timeout":
    "Build timed out — check your connection and try again.",
  "build.badResponse": "Build returned an empty portfolio. Try again.",
  "build.storageBlocked":
    "Your browser blocked saving (Private mode or in-app browser). Open this link in Safari or Chrome, then build again.",
  "build.hintPick": "Select 1–4 stocks below, then press BUILD MY PORTFOLIO.",
  "build.noneEligible":
    "No famous stocks meet the upside bar today. Check your valuation data or try again later.",
  "build.notEligibleToday": "NOT ELIGIBLE TODAY",
  "dash.storageBlocked":
    "Saving is blocked in this browser. Open SNIPER in Safari or Chrome (not Instagram/Messages preview) so your entries stick.",

  // dashboard
  "dash.empty": "You haven't made a portfolio yet.",
  "dash.getStarted": "GET STARTED",
  "dash.title": "Your portfolio",
  "dash.meta": "{n} stocks · created {date}",
  "dash.startOver": "Start over",
  "dash.yourStocks": "YOUR STOCKS",
  "dash.allocTitle": "WEIGHT BY SECTOR",
  "dash.allocHint":
    "Pie = sector weight. Tap a sector to see industries inside it.",
  "dash.allocEmpty": "No holdings to chart yet.",
  "dash.tapHint": "Tap any stock to learn why it was picked",
  "dash.ourPick": "Our pick",
  "dash.yourPick": "Your pick",
  "dash.tradePanels": "HOLDINGS",
  "dash.latestNews": "RELATED NEWS FOR YOUR PORTFOLIO",
  "dash.noNews": "No news about your stocks right now.",
  "dash.enter": "Enter",
  "dash.entered": "Entered",
  "dash.enterSet": "Set",
  "dash.enterPrice": "Your buy / entry price",
  "dash.enterEdit": "Tap Buy to set the price you paid",
  "dash.sinceEntry": "Since entry",
  "dash.sinceEntryNeed": "Set entry",
  "dash.live": "Live",
  "panel.tapMore": "Fundamentals →",
  "dash.addMine": "+ My stock",
  "dash.add": "Add",
  "dash.addHint":
    "Add up to 2 stocks. Each add replaces the closest book name by industry/sector and beta — fair value loads from FvIndustries.",
  "dash.addSearch": "Search ticker, name, or industry…",
  "dash.addNone": "No matches.",
  "dash.addLeft": "{n} add left",
  "dash.replaced": "Added {added} · dropped {dropped} (closest industry & beta)",
  "dash.revert": "Revert",
  "dash.revertSwitch": "Revert switch",
  "dash.revertedAdd": "Reverted — {added} removed, {dropped} restored",
  "dash.revertedSwitch": "Reverted {ticker} to original pick",
  "dash.revertedPersonal": "Reverted — removed {ticker}",
  "dash.addedOnly": "Added {added}",
  "dash.portfolioPl": "PORTFOLIO P/L (IF ALL TARGETS / STOPS HIT)",
  "dash.portfolioUpside": "Upside {v}",
  "dash.portfolioDownside": "Downside {v}",
  "dash.portfolioPlHint":
    "Weight-compounded from each stock’s buy → sell target and buy → safety exit.",
  "dash.company": "Company",
  "dash.whyOwn": "Why own it",

  // news (holding-related)
  "news.title": "Breaking News",
  "news.holdingTitle": "News for your holdings",
  "news.holdingSubtitle":
    "Newest stories for your {n} stocks (up to 2 each). Dense SEC filings get a plain-English rewrite.",
  "news.holdingEmptyHint": "Build a portfolio to see news that matters to you.",
  "news.holdingNeedBook":
    "No portfolio yet. Build one first — then we’ll explain news about your stocks in plain English.",
  "news.holdingNone":
    "No fresh headlines for your holdings right now. Check back soon.",
  "news.mayAffect": "Your holding",
  "news.yourHolding": "Your holding",
  "news.whyHolding": "this is about a stock you own",
  "news.whyIndustry": "same industry",
  "news.whySector": "same sector",
  "news.subtitle":
    "Recent holding news — green helpful, red caution. Tap for details.",
  "filter.all": "All",
  "filter.good": "Good",
  "filter.bad": "Bad",
  "newsline.good": "GOOD",
  "newsline.bad": "BAD",
  "newsline.details": "More →",
  "popup.companies": "Tickers in the story:",
  "popup.edge": "Details",
  "popup.readFull": "Read full story →",
  "popup.notAdvice": "General education, not personal investment advice.",

  // ideas
  "ideas.title": "Ideas",
  "ideas.subtitle": "Handpicked stock ideas from our team, explained simply",

  // snipers (house book — not the user's dashboard)
  "snipers.subtitle":
    "SNIPER house book — buys already filled · updated {date}",
  "snipers.noHouse": "No house portfolio published.",
  "snipers.holdings": "HOLDINGS",
  "snipers.tradePanels": "HOUSE POSITIONS",
  "snipers.allocTitle": "HOUSE WEIGHT BY SECTOR",
  "snipers.allocHint":
    "Pie = sector weight in the house book. Tap a sector to see industries inside it.",
  "snipers.allocEmpty": "No house holdings to chart yet.",
  "perf.house": "HOUSE PERFORMANCE",

  // performance chart
  "perf.default": "HOW YOU'RE DOING",
  "perf.since": "since you started",
  "perf.sinceEntry": "average of each stock’s % since its entry",
  "perf.sinceEntryEmpty": "set entry on each stock — then we average those %s",
  "perf.houseLive": "average of each holding’s % since house entry",
  "perf.fromEntry": "avg of per-stock since entry",
  "perf.entryVsLive": "avg of (live price − your entry) ÷ entry",
  "perf.rangeVsEntry":
    "{range}: avg of (price now − price then) ÷ your entry",
  "perf.all": "ALL",
  "perf.allVsEntry": "all-time: avg of (live − entry) ÷ entry",
  "perf.chartRangeHint": "chart: same formula each day over {range}",
  "perf.sinceEntryLive": "since entry (all-time): {v}",
  "perf.vsEntry": "vs entry",
  "perf.return": "Return",
  "perf.tapRow": "Tap a symbol for thesis + numbers",
  "reason.numbers": "Fundamentals",

  // reasoning popup
  "reason.growth": "{v} R2R from entry",
  "reason.riskLevel": "Risk level:",
  "reason.todayPrice": "Today's price:",
  "reason.help":
    "R2R is (sell target − buy) ÷ (buy − safety exit) from the planned entry. Buy near the buy price, take profit at the target, and exit if it drops to the safety price.",
  "reason.notAdvice":
    "General information, not investment advice. Investing involves risk of loss.",

  // switch arrow
  "switch.title": "Swap for a safer or bolder stock in the same industry",
  "switch.saferTitle": "Safer choice",
  "switch.saferAria": "Swap for a safer stock",
  "switch.bolderTitle": "Bolder choice",
  "switch.bolderAria": "Swap for a bolder stock",

  // footer
  "footer.disclaimer":
    "SNIPER provides general information for educational purposes only and is not investment advice. We are not a broker or investment adviser and do not execute trades or hold funds. Investing involves risk, including loss of principal.",
  "footer.disclaimerLink": "Disclaimer",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",

  // consent gate
  "consent.title": "Before you start",
  "consent.body":
    "SNIPER provides general information for educational purposes only and is not investment advice. We are not a broker or adviser and do not execute trades or hold funds. Investing involves risk, including loss of principal.",
  "consent.adult": "I am 18 years of age or older.",
  "consent.ackPre":
    "I understand this is not investment advice, and I agree to the ",
  "consent.terms": "Terms",
  "consent.privacy": "Privacy Policy",
  "consent.disclaimer": "Disclaimer",
  "consent.sep": ", ",
  "consent.and": ", and ",
  "consent.ackPost": ".",
  "consent.cta": "I AGREE — CONTINUE",

  // how-to prelude
  "prelude.eyebrow": "How to use SNIPER",
  "prelude.title": "Five quick moves",
  "prelude.body": "Learn the desk in under a minute — then build.",
  "prelude.s1":
    "Pick up to 4 stocks of your choosing (BUILD), then we fill a balanced book around them.",
  "prelude.s2":
    "Press Buy on a stock to edit the entry price you paid so you can track performance.",
  "prelude.s3":
    "Learn from Breaking News on market developments — overall, sector, industry, or single stocks.",
  "prelude.s4":
    "Learn from Ideas about the admin’s new entry preparations.",
  "prelude.s5": "Click a stock to learn it in about 10 seconds.",
  "prelude.cta": "GOT IT — LET’S GO",

  // risk levels
  "risk.Low": "Low",
  "risk.Medium": "Medium",
  "risk.High": "High",

  // trade levels
  "level.ep": "Buy around",
  "level.tp": "Sell target",
  "level.sl": "Safety exit",
  "level.epTip":
    "Buy around — the planned entry price. On your book, tap Buy to set what you actually paid.",
  "level.houseEp": "Bought at",
  "level.houseEpTip":
    "House entry — the price SNIPER already bought this position at. This is not your personal book.",
  "level.tpTip":
    "Sell target — where the thesis would take profit if the move plays out.",
  "level.slTip":
    "Safety exit — the level where the idea is wrong and you cut the loss.",

  // time
  "time.now": "just now",
  "time.m": "{n}m ago",
  "time.h": "{n}h ago",
  "time.d": "{n}d ago",
};

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function tr(
  key: string,
  vars?: Record<string, string | number>
): string {
  return interpolate(en[key] ?? key, vars);
}

export function sectorLabel(sector: string): string {
  return sector;
}

export function riskKey(beta: number): "Low" | "Medium" | "High" {
  if (beta < 0.8) return "Low";
  if (beta <= 1.2) return "Medium";
  return "High";
}

export function riskLabel(beta: number): string {
  return tr(`risk.${riskKey(beta)}`);
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return tr("time.now");
  if (mins < 60) return tr("time.m", { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return tr("time.h", { n: hrs });
  const days = Math.round(hrs / 24);
  return tr("time.d", { n: days });
}
