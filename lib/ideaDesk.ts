import type { Idea, Stock } from "@/lib/types";
import { upsidePctFromLevels } from "@/lib/format";

/**
 * Ideas display/add always use desk EP/TP/SL from LEVELS & STOCKS.
 * Thesis/copy on the idea stay as curated; levels never come from live quotes.
 */
export function applyDeskLevelsToIdea(idea: Idea, stock: Stock | undefined): Idea {
  if (!stock?.levels) return idea;
  const levels = {
    ep: Number(stock.levels.ep) || 0,
    tp: Number(stock.levels.tp) || 0,
    sl: Number(stock.levels.sl) || 0,
  };
  const upsidePct = upsidePctFromLevels(levels);
  const stockName = (stock.name || "").trim();
  const industry = (stock.industry || "").trim();
  const nameLooksLikeIndustry =
    stockName.length > 0 &&
    industry.length > 0 &&
    stockName.toLowerCase() === industry.toLowerCase();

  return {
    ...idea,
    ticker: stock.ticker,
    name:
      stockName && !nameLooksLikeIndustry ? stockName : idea.name || stockName,
    sector: stock.sector || idea.sector,
    industry: stock.industry || idea.industry,
    levels,
    upsidePct: upsidePct ?? idea.upsidePct,
  };
}
