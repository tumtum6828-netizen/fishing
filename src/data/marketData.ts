export const MARKET_HISTORY_LIMIT = 8;

export function getMarketMultiplier(speciesName: string, dateKey: string): number {
  const seed = [...`${dateKey}:${speciesName}`]
    .reduce((sum, character, index) => sum + character.charCodeAt(0) * (index + 3), 0);
  return [.85, .95, 1, 1.1, 1.2][seed % 5];
}

export function getMarketTrend(multiplier: number): "hot" | "normal" | "quiet" {
  if (multiplier >= 1.1) return "hot";
  if (multiplier < 1) return "quiet";
  return "normal";
}
