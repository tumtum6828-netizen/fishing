export type BattleProgress = {
  wins: number;
  losses: number;
  winStreak: number;
  masteryXpBySpecies: Record<string, number>;
  clearedOpponentIds: string[];
};

export type BattleOpponent = {
  id: string;
  title: string;
  subtitle: string;
  speciesName: string;
  weightFactor: number;
  battleLevel: number;
  unlockWins: number;
  firstClearCoins: number;
  winXp: number;
};

export type BattleStats = {
  maxMorale: number;
  power: number;
  defense: number;
  speed: number;
  skillName: string;
};
