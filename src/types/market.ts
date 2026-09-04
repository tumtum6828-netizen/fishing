export type MarketTrade = {
  speciesName: string;
  quantity: number;
  earnedCoins: number;
  multiplier: number;
  soldAt: number;
};

export type MarketData = {
  totalSold: number;
  totalEarned: number;
  history: MarketTrade[];
};

export type MarketListing = {
  speciesName: string;
  count: number;
  averageWeight: number;
  averageBaseValue: number;
  multiplier: number;
  unitPrice: number;
  trend: "hot" | "normal" | "quiet";
};
