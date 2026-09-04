import { getMarketMultiplier, getMarketTrend, MARKET_HISTORY_LIMIT } from "../data/marketData";
import type { MarketData, MarketListing } from "../types/market";
import { getLocalDateKey } from "./dailyQuests";
import { readInventory } from "./inventory";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export type MarketSaleResult = {
  ok: boolean;
  message: string;
  earnedCoins: number;
};

function safeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function readMarketData(save: SaveData = readSaveData()): MarketData {
  const history = Array.isArray(save.market?.history)
    ? save.market.history.filter(trade => trade && typeof trade.speciesName === "string")
      .slice(0, MARKET_HISTORY_LIMIT)
      .map(trade => ({
        speciesName: trade.speciesName,
        quantity: safeInteger(trade.quantity),
        earnedCoins: safeInteger(trade.earnedCoins),
        multiplier: Number.isFinite(trade.multiplier) ? Math.max(.5, Math.min(2, trade.multiplier)) : 1,
        soldAt: Number.isFinite(trade.soldAt) ? trade.soldAt : Date.now()
      }))
    : [];
  return {
    totalSold: safeInteger(save.market?.totalSold),
    totalEarned: safeInteger(save.market?.totalEarned),
    history
  };
}

export function getMarketListings(): MarketListing[] {
  const inventory = readInventory();
  const dateKey = getLocalDateKey();
  return Object.entries(inventory.fish).map(([speciesName, stack]) => {
    const averageBaseValue = stack.count > 0 ? stack.totalValue / stack.count : 0;
    const multiplier = getMarketMultiplier(speciesName, dateKey);
    return {
      speciesName,
      count: stack.count,
      averageWeight: stack.count > 0 ? stack.totalWeight / stack.count : 0,
      averageBaseValue,
      multiplier,
      unitPrice: Math.max(1, Math.round(averageBaseValue * multiplier)),
      trend: getMarketTrend(multiplier)
    };
  }).sort((a, b) => b.multiplier - a.multiplier || a.speciesName.localeCompare(b.speciesName, "th"));
}

export function sellFishAtMarket(speciesName: string, requestedQuantity: number): MarketSaleResult {
  const save = readSaveData();
  const inventory = readInventory();
  const stack = inventory.fish[speciesName];
  if (!stack || stack.count <= 0) return { ok: false, message: "ไม่มีสัตว์น้ำชนิดนี้ในกระเป๋า", earnedCoins: 0 };
  const quantity = Math.min(stack.count, Math.max(1, Math.floor(requestedQuantity)));
  const multiplier = getMarketMultiplier(speciesName, getLocalDateKey());
  const unitWeight = stack.totalWeight / stack.count;
  const unitBaseValue = stack.totalValue / stack.count;
  const earnedCoins = Math.max(1, Math.round(unitBaseValue * quantity * multiplier));
  const maleToSell = Math.min(stack.sexCounts.male,
    Math.round(quantity * stack.sexCounts.male / stack.count));
  const femaleToSell = quantity - maleToSell;

  stack.count -= quantity;
  stack.totalWeight = Math.max(0, stack.totalWeight - unitWeight * quantity);
  stack.totalValue = Math.max(0, Math.round(stack.totalValue - unitBaseValue * quantity));
  stack.sexCounts.male = Math.max(0, stack.sexCounts.male - maleToSell);
  stack.sexCounts.female = Math.max(0, stack.sexCounts.female - femaleToSell);
  if (stack.count <= 0) delete inventory.fish[speciesName];

  const market = readMarketData(save);
  market.totalSold += quantity;
  market.totalEarned += earnedCoins;
  market.history.unshift({ speciesName, quantity, earnedCoins, multiplier, soldAt: Date.now() });
  market.history = market.history.slice(0, MARKET_HISTORY_LIMIT);
  writeSaveData({
    inventory,
    market,
    coins: Math.max(0, save.coins ?? 0) + earnedCoins
  });
  return {
    ok: true,
    message: `ขาย${speciesName} ${quantity} ตัว ได้ ${earnedCoins} เหรียญ`,
    earnedCoins
  };
}
