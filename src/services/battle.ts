import { BATTLE_BASE_REWARD } from "../data/battleData";
import { getBattleMasteryLevel } from "../data/battleData";
import type { BattleProgress } from "../types/battle";
import { readSaveData, writeSaveData, type SaveData } from "./save";
import { recordDailyQuestProgress } from "./dailyQuests";

export function readBattleProgress(save: SaveData = readSaveData()): BattleProgress {
  const safe = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  };
  const masteryXpBySpecies: Record<string, number> = {};
  Object.entries(save.battle?.masteryXpBySpecies ?? {}).forEach(([name, xp]) => {
    const safeXp = safe(xp);
    if (safeXp > 0) masteryXpBySpecies[name] = safeXp;
  });
  return {
    wins: safe(save.battle?.wins),
    losses: safe(save.battle?.losses),
    winStreak: safe(save.battle?.winStreak),
    masteryXpBySpecies,
    clearedOpponentIds: Array.isArray(save.battle?.clearedOpponentIds)
      ? [...new Set(save.battle.clearedOpponentIds.filter(id => typeof id === "string"))]
      : []
  };
}

export function recordBattleResult(
  won: boolean,
  speciesName: string,
  opponentId: string,
  firstClearCoins: number,
  winXp: number
): {
  progress: BattleProgress;
  coins: number;
  xpGain: number;
  masteryLevel: number;
  leveledUp: boolean;
  firstClearReward: number;
} {
  const save = readSaveData();
  const current = readBattleProgress(save);
  const previousXp = current.masteryXpBySpecies[speciesName] ?? 0;
  const previousLevel = getBattleMasteryLevel(previousXp);
  const xpGain = won ? Math.max(1, Math.floor(winXp)) : 8;
  const nextXp = previousXp + xpGain;
  const firstClear = won && !current.clearedOpponentIds.includes(opponentId);
  const clearedOpponentIds = firstClear
    ? [...current.clearedOpponentIds, opponentId]
    : current.clearedOpponentIds;
  const progress: BattleProgress = won
    ? {
      wins: current.wins + 1,
      losses: current.losses,
      winStreak: current.winStreak + 1,
      masteryXpBySpecies: { ...current.masteryXpBySpecies, [speciesName]: nextXp },
      clearedOpponentIds
    }
    : {
      wins: current.wins,
      losses: current.losses + 1,
      winStreak: 0,
      masteryXpBySpecies: { ...current.masteryXpBySpecies, [speciesName]: nextXp },
      clearedOpponentIds
    };
  const firstClearReward = firstClear ? Math.max(0, Math.floor(firstClearCoins)) : 0;
  const coins = won ? BATTLE_BASE_REWARD + Math.min(20, progress.winStreak * 2) + firstClearReward : 0;
  writeSaveData({ battle: progress, coins: Math.max(0, save.coins ?? 0) + coins });
  recordDailyQuestProgress("battle_completed");
  const masteryLevel = getBattleMasteryLevel(nextXp);
  return {
    progress, coins, xpGain, masteryLevel,
    leveledUp: masteryLevel > previousLevel,
    firstClearReward
  };
}
