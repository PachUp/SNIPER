export type Lang = "en" | "he";

export const LANGS: Lang[] = ["en", "he"];

type Dict = Record<string, string>;

const en: Dict = {
  // landing
  "brand.build": "BUILD",
  "landing.tagline":
    "Create a smart stock portfolio in under a minute. No experience needed.",
  "landing.seePortfolio": "SEE MY PORTFOLIO →",

  // nav
  "nav.dashboard": "DASHBOARD",
  "nav.news": "BREAKING NEWS",
  "nav.ideas": "IDEAS",
  "nav.snipers": "SNIPERS",
  "nav.admin": "ADMIN",

  // common
  "common.loading": "Loading…",
  "common.potential": "{v} potential",
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
    "Choose 1–{max} well-known stocks with at least {minUpside}% growth potential. We'll complete a balanced portfolio of up to 12.",
  "build.buildingCta": "BUILDING…",
  "build.pickForMe": "PICK FOR ME",
  "build.buildMine": "BUILD MY PORTFOLIO",
  "build.needPick": "Pick at least {min} stock to continue.",
  "build.failed": "Could not build your portfolio. Try again.",
  "build.noneEligible":
    "No famous stocks meet the upside bar today. Check your valuation data or try again later.",
  "build.notEligibleToday": "NOT ELIGIBLE TODAY",

  // dashboard
  "dash.empty": "You haven't made a portfolio yet.",
  "dash.getStarted": "GET STARTED",
  "dash.title": "Your portfolio",
  "dash.meta": "{n} stocks · created {date}",
  "dash.startOver": "Start over",
  "dash.yourStocks": "YOUR STOCKS",
  "dash.tapHint": "Tap any stock to learn why it was picked",
  "dash.ourPick": "Our pick",
  "dash.yourPick": "Your pick",
  "dash.latestNews": "LATEST NEWS ABOUT YOUR STOCKS",
  "dash.noNews": "No news about your stocks right now.",

  // news
  "news.title": "Breaking News",
  "news.subtitle": "Each story in one plain sentence. Green is good, red is bad.",
  "filter.all": "All",
  "filter.good": "Good",
  "filter.bad": "Bad",
  "newsline.good": "GOOD NEWS",
  "newsline.bad": "BAD NEWS",
  "newsline.details": "Details →",
  "popup.companies": "Companies:",
  "popup.readFull": "Read full story →",
  "popup.notAdvice": "General information, not investment advice.",

  // ideas
  "ideas.title": "Ideas",
  "ideas.subtitle": "Handpicked stock ideas from our team, explained simply",

  // snipers
  "snipers.subtitle": "Our own recommended portfolio · updated {date}",
  "snipers.noHouse": "No house portfolio published.",
  "snipers.holdings": "HOLDINGS",
  "perf.house": "HOUSE PERFORMANCE",

  // performance chart
  "perf.default": "HOW YOU'RE DOING",
  "perf.since": "since you started",
  "perf.return": "Return",

  // reasoning popup
  "reason.growth": "{v} growth potential",
  "reason.riskLevel": "Risk level:",
  "reason.todayPrice": "Today's price:",
  "reason.help":
    "Buy near the buy price, take profit at the target, and exit if it drops to the safety price.",
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

  // risk levels
  "risk.Low": "Low",
  "risk.Medium": "Medium",
  "risk.High": "High",

  // trade levels
  "level.ep": "Buy around",
  "level.tp": "Sell target",
  "level.sl": "Safety exit",

  // time
  "time.now": "just now",
  "time.m": "{n}m ago",
  "time.h": "{n}h ago",
  "time.d": "{n}d ago",

  // language toggle
  "lang.switchTo": "עברית",
};

const he: Dict = {
  // landing
  "brand.build": "בנה",
  "landing.tagline": "בנה תיק מניות חכם בפחות מדקה. בלי שום ניסיון קודם.",
  "landing.seePortfolio": "לתיק שלי →",

  // nav
  "nav.dashboard": "לוח בקרה",
  "nav.news": "חדשות",
  "nav.ideas": "רעיונות",
  "nav.snipers": "סניפרס",
  "nav.admin": "ניהול",

  // common
  "common.loading": "טוען…",
  "common.potential": "{v} פוטנציאל",
  "common.buy": "קנייה",
  "common.sell": "מכירה",
  "common.exit": "יציאה",
  "common.riskSuffix": "סיכון {level}",
  "common.close": "סגור",

  // build
  "build.back": "SNIPER →",
  "build.chosen": "{n} מתוך {max} נבחרו",
  "build.title": "בחר כמה חברות מוכרות שאתה אוהב",
  "build.subtitle":
    "בחר 1–{max} מניות מוכרות עם לפחות {minUpside}% פוטנציאל צמיחה. נשלים תיק מאוזן של עד 12.",
  "build.buildingCta": "בונה…",
  "build.pickForMe": "בחר בשבילי",
  "build.buildMine": "בנה לי תיק",
  "build.needPick": "בחר לפחות {min} מניה כדי להמשיך.",
  "build.failed": "לא הצלחנו לבנות את התיק. נסה שוב.",
  "build.noneEligible":
    "אין כרגע מניות מוכרות שעומדות בסף. בדוק את נתוני השווי או נסה שוב מאוחר יותר.",
  "build.notEligibleToday": "לא זמין היום",

  // dashboard
  "dash.empty": "עדיין לא בנית תיק.",
  "dash.getStarted": "בואו נתחיל",
  "dash.title": "התיק שלך",
  "dash.meta": "{n} מניות · נוצר {date}",
  "dash.startOver": "התחל מחדש",
  "dash.yourStocks": "המניות שלך",
  "dash.tapHint": "הקש על מניה כדי להבין למה היא נבחרה",
  "dash.ourPick": "בחירה שלנו",
  "dash.yourPick": "בחירה שלך",
  "dash.latestNews": "חדשות אחרונות על המניות שלך",
  "dash.noNews": "אין כרגע חדשות על המניות שלך.",

  // news
  "news.title": "חדשות",
  "news.subtitle": "כל ידיעה במשפט אחד פשוט. ירוק זה טוב, אדום זה רע.",
  "filter.all": "הכל",
  "filter.good": "טובות",
  "filter.bad": "רעות",
  "newsline.good": "חדשות טובות",
  "newsline.bad": "חדשות רעות",
  "newsline.details": "פרטים →",
  "popup.companies": "חברות:",
  "popup.readFull": "לכתבה המלאה →",
  "popup.notAdvice": "מידע כללי, לא ייעוץ השקעות.",

  // ideas
  "ideas.title": "רעיונות",
  "ideas.subtitle": "רעיונות מניות נבחרים מהצוות שלנו, מוסברים בפשטות",

  // snipers
  "snipers.subtitle": "התיק המומלץ שלנו · עודכן {date}",
  "snipers.noHouse": "לא פורסם תיק בית.",
  "snipers.holdings": "אחזקות",
  "perf.house": "ביצועי התיק",

  // performance chart
  "perf.default": "איך אתה מתקדם",
  "perf.since": "מאז שהתחלת",
  "perf.return": "תשואה",

  // reasoning popup
  "reason.growth": "{v} פוטנציאל צמיחה",
  "reason.riskLevel": "רמת סיכון:",
  "reason.todayPrice": "מחיר היום:",
  "reason.help":
    "קנה סמוך למחיר הקנייה, ממש רווח ביעד המכירה, וצא אם המחיר יורד למחיר הביטחון.",
  "reason.notAdvice": "מידע כללי, לא ייעוץ השקעות. השקעה כרוכה בסיכון להפסד.",

  // switch arrow
  "switch.title": "החלף למניה בטוחה יותר או נועזת יותר באותו ענף",
  "switch.saferTitle": "בחירה בטוחה יותר",
  "switch.saferAria": "החלף למניה בטוחה יותר",
  "switch.bolderTitle": "בחירה נועזת יותר",
  "switch.bolderAria": "החלף למניה נועזת יותר",

  // footer
  "footer.disclaimer":
    "SNIPER מספקת מידע כללי למטרות חינוכיות בלבד ואינה מהווה ייעוץ השקעות. איננו ברוקר או יועץ השקעות ואיננו מבצעים עסקאות או מחזיקים כספים. השקעה כרוכה בסיכון, כולל אובדן הקרן.",
  "footer.disclaimerLink": "גילוי נאות",
  "footer.terms": "תנאים",
  "footer.privacy": "פרטיות",

  // consent gate
  "consent.title": "לפני שמתחילים",
  "consent.body":
    "SNIPER מספקת מידע כללי למטרות חינוכיות בלבד ואינה מהווה ייעוץ השקעות. איננו ברוקר או יועץ ואיננו מבצעים עסקאות או מחזיקים כספים. השקעה כרוכה בסיכון, כולל אובדן הקרן.",
  "consent.adult": "אני בן 18 ומעלה.",
  "consent.ackPre": "אני מבין שזה אינו ייעוץ השקעות, ומסכים ל",
  "consent.terms": "תנאי השימוש",
  "consent.privacy": "מדיניות הפרטיות",
  "consent.disclaimer": "גילוי הנאות",
  "consent.sep": ", ",
  "consent.and": " ו",
  "consent.ackPost": ".",
  "consent.cta": "אני מסכים — המשך",

  // risk levels
  "risk.Low": "נמוך",
  "risk.Medium": "בינוני",
  "risk.High": "גבוה",

  // trade levels
  "level.ep": "קנייה סביב",
  "level.tp": "יעד מכירה",
  "level.sl": "יציאת ביטחון",

  // time
  "time.now": "עכשיו",
  "time.m": "לפני {n} ד׳",
  "time.h": "לפני {n} ש׳",
  "time.d": "לפני {n} י׳",

  // language toggle
  "lang.switchTo": "EN",
};

const DICTS: Record<Lang, Dict> = { en, he };

const SECTORS: Record<Lang, Record<string, string>> = {
  en: {
    Energy: "Energy",
    Materials: "Materials",
    Industrials: "Industrials",
    "Consumer Discretionary": "Consumer Discretionary",
    "Consumer Staples": "Consumer Staples",
    "Health Care": "Health Care",
    Financials: "Financials",
    "Information Technology": "Information Technology",
    "Communication Services": "Communication Services",
    Utilities: "Utilities",
    "Real Estate": "Real Estate",
  },
  he: {
    Energy: "אנרגיה",
    Materials: "חומרי גלם",
    Industrials: "תעשייה",
    "Consumer Discretionary": "מוצרי צריכה מובחרים",
    "Consumer Staples": "מוצרי צריכה בסיסיים",
    "Health Care": "בריאות",
    Financials: "פיננסים",
    "Information Technology": "טכנולוגיית מידע",
    "Communication Services": "שירותי תקשורת",
    Utilities: "תשתיות",
    "Real Estate": 'נדל"ן',
  },
};

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function tr(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = DICTS[lang] ?? DICTS.en;
  const val = dict[key] ?? DICTS.en[key] ?? key;
  return interpolate(val, vars);
}

export function sectorLabel(lang: Lang, sector: string): string {
  return SECTORS[lang]?.[sector] ?? sector;
}

export function riskKey(beta: number): "Low" | "Medium" | "High" {
  if (beta < 0.8) return "Low";
  if (beta <= 1.2) return "Medium";
  return "High";
}

export function riskLabel(lang: Lang, beta: number): string {
  return tr(lang, `risk.${riskKey(beta)}`);
}

export function timeAgo(lang: Lang, iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return tr(lang, "time.now");
  if (mins < 60) return tr(lang, "time.m", { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return tr(lang, "time.h", { n: hrs });
  const days = Math.round(hrs / 24);
  return tr(lang, "time.d", { n: days });
}

export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "he" ? "rtl" : "ltr";
}
