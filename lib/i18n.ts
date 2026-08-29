type Dict = Record<string, string>;

const en: Dict = {
  // landing
  "brand.build": "BUILD",
  "landing.tagline":
    "Build a portfolio with clear buy, sell, and exit levels — in under a minute. No experience needed.",
  "landing.tapAnywhere": "TAP ANYWHERE TO START",
  "landing.seePortfolio": "SEE MY PORTFOLIO →",
  "landing.returnTagline":
    "Your book is ready in this browser — open it, or build a new one.",
  "landing.buildNew": "BUILD A NEW PORTFOLIO",
  "landing.softLaunch":
    "Friends / testers only · draft product · not investment advice · saved in this browser only",

  // nav
  "nav.dashboard": "YOURS",
  "nav.news": "YOUR NEWS",
  "nav.ideas": "IDEAS",
  "nav.snipers": "HOUSE",
  "nav.admin": "ADMIN",

  // common
  "common.loading": "Loading…",
  "common.potential": "{v}× reward/risk",
  "common.r2r": "{v}× reward/risk",
  "common.r2rHint": "Tap for hypothetical profit vs loss",
  "common.hypoProfit": "If sell target hit: {v} profit",
  "common.hypoLoss": "If safety exit hit: {v} loss",
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
    "Choose 1–{max} well-known stocks. We’ll complete a portfolio of up to 12 with clear buy, sell, and exit levels. Cards can show reward vs risk from buy → sell target vs buy → safety exit.",
  "build.buildingCta": "BUILDING…",
  "build.pickForMe": "PICK FOR ME",
  "build.buildMine": "BUILD MY PORTFOLIO",
  "build.needPick": "Pick at least {min} stock first (tap a logo), then press BUILD.",
  "build.failed": "Could not build your portfolio. Try again.",
  "build.timeout":
    "Build timed out — check your connection and try again.",
  "build.badResponse": "Build returned an empty portfolio. Try again.",
  "build.storageBlocked":
    "Your browser blocked saving (Private mode or in-app browser). Open this link in Safari or Chrome, then build again.",
  "build.hintPick": "Tap 1–4 logos below, then press BUILD MY PORTFOLIO.",
  "build.noneEligible":
    "No famous stocks clear our upside bar right now. Try again later.",
  "build.notEligibleToday": "NOT A FIT TODAY",
  "build.notEligibleHint":
    "These don’t clear our upside bar right now — pick from the logos above instead.",
  "build.listToggle": "Or pick from the list",
  "build.listHide": "Hide list",
  "dash.storageBlocked":
    "Saving is blocked in this browser. Open SNIPER in Safari or Chrome (not Instagram/Messages preview) so your entries stick.",

  // dashboard
  "dash.empty": "You haven't made a portfolio yet.",
  "dash.emptyBody":
    "Pick a few famous names — we fill up to 12 stocks with clear buy, sell, and exit levels. Takes under a minute.",
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
    "Add up to 2 of your own from our full stock list. Names without a desk fair value get provisional buy / sell / exit levels from the live price. Each add may replace a similar name we filled.",
  "dash.addProvisional": "provisional levels",
  "dash.addSearch": "Search ticker or company name…",
  "dash.addNone": "No matches.",
  "dash.addLeft": "{n} add left",
  "dash.replaced": "Added {added} · removed {dropped} (closest similar name)",
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
  "dash.entryCoachTitle": "Next: set your first entry",
  "dash.entryCoachBody":
    "Tap Buy on a stock and enter the price you paid (or plan to pay). Then we can track how you’re doing.",
  "dash.entryCoachCta": "GOT IT",
  "dash.entryCoachFocus": "Start here — set Buy",
  "dash.guestTrust": "Saved in this browser · not a broker",
  "dash.guestTrustDismiss": "Got it",

  // news (holding-related)
  "news.title": "Breaking News",
  "news.holdingTitle": "News for your holdings",
  "news.holdingSubtitle":
    "Stories about names you own — what happened and how it may affect the shares.",
  "news.holdingEmptyHint": "Build a portfolio to see news about stocks you own.",
  "news.holdingNeedBook":
    "No portfolio yet. Build one first — then we’ll show news about your stocks in plain English.",
  "news.holdingNone":
    "No fresh headlines for names you own right now. Check back soon — or open YOURS to review your levels.",
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
  "popup.edge": "What it means if you own this stock",
  "popup.readFull": "Read full story →",
  "popup.notAdvice": "General education, not personal investment advice.",

  // ideas
  "ideas.title": "Ideas",
  "ideas.subtitle":
    "Desk ideas with buy / sell / exit levels — learn here, then compare with YOURS",
  "ideas.empty": "No ideas published yet. Build your own book meanwhile — or browse the house book.",
  "ideas.emptyBuild": "BUILD A PORTFOLIO",
  "ideas.emptyHouse": "SEE HOUSE BOOK",

  // snipers (house book — not the user's dashboard)
  "snipers.subtitle":
    "House book (not yours) — desk buys already filled · updated {date}",
  "snipers.noHouse":
    "No house portfolio published yet. This tab is the desk book — not YOURS.",
  "snipers.emptyBuild": "BUILD YOUR PORTFOLIO",
  "snipers.emptyYours": "GO TO YOURS",
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
  "perf.sinceEntryEmpty": "set your first Buy price below — then this chart comes alive",
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
  "perf.tapRow": "Tap a stock for why we own it + levels",
  "reason.numbers": "Fundamentals",

  // reasoning popup
  "reason.growth": "{v}× reward/risk from entry",
  "reason.riskLevel": "Risk level:",
  "reason.todayPrice": "Today's price:",
  "reason.help":
    "Reward vs risk compares upside to the sell target against downside to the safety exit from the planned buy. Buy near the buy price, take profit at the sell target, and exit if it falls to the safety exit.",
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
  "prelude.body": "Learn your portfolio in under a minute — then build.",
  "prelude.s1":
    "Pick up to 4 companies you know (BUILD). We fill a balanced portfolio around them.",
  "prelude.s2":
    "On YOURS, tap Buy on a stock and set the price you paid so we can track performance.",
  "prelude.s3":
    "YOUR NEWS explains headlines about stocks you own — in plain English.",
  "prelude.s4":
    "IDEAS shows desk picks with buy, sell, and exit levels you can learn from.",
  "prelude.s5": "Tap any stock to see what it is, why it’s in, and the levels.",
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
