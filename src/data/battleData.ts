import { FISH_PROFILES, SPECIES_INFO } from "./gameData";
import type { BattleOpponent, BattleStats } from "../types/battle";

export const BATTLE_BASE_REWARD = 20;
export const BATTLE_MASTERY_MAX_LEVEL = 10;
export const BATTLE_MASTERY_XP_PER_LEVEL = 40;

export const BATTLE_OPPONENTS: BattleOpponent[] = [
  {
    id: "shore-rookie", title: "เจ้าจิ๋วริมน้ำ", subtitle: "สนามฝึก • จังหวะอ่านง่าย",
    speciesName: "ปลากระบอก", weightFactor: .34, battleLevel: 1,
    unlockWins: 0, firstClearCoins: 30, winXp: 20
  },
  {
    id: "current-rider", title: "นักว่ายสวนกระแส", subtitle: "สนามกลาง • รวดเร็วขึ้น",
    speciesName: "ปลาทู", weightFactor: .56, battleLevel: 3,
    unlockWins: 1, firstClearCoins: 60, winXp: 26
  },
  {
    id: "bay-champion", title: "แชมป์อ่าวคราม", subtitle: "สนามท้าทาย • ใจแข็งแกร่ง",
    speciesName: "ปลากะพงขาว", weightFactor: .78, battleLevel: 6,
    unlockWins: 3, firstClearCoins: 120, winXp: 34
  }
];

export function getBattleMasteryLevel(xp: number): number {
  return Math.min(BATTLE_MASTERY_MAX_LEVEL,
    1 + Math.floor(Math.max(0, xp) / BATTLE_MASTERY_XP_PER_LEVEL));
}

export function getBattleMasteryProgress(xp: number): { current: number; required: number; progress: number } {
  const level = getBattleMasteryLevel(xp);
  if (level >= BATTLE_MASTERY_MAX_LEVEL) {
    return { current: BATTLE_MASTERY_XP_PER_LEVEL, required: BATTLE_MASTERY_XP_PER_LEVEL, progress: 1 };
  }
  const current = Math.max(0, xp) % BATTLE_MASTERY_XP_PER_LEVEL;
  return { current, required: BATTLE_MASTERY_XP_PER_LEVEL, progress: current / BATTLE_MASTERY_XP_PER_LEVEL };
}

const SKILL_BY_BEHAVIOR: Record<string, string> = {
  "สงบ": "คลื่นนิ่ง",
  "นักวิ่ง": "พุ่งสายน้ำ",
  "สลับทิศ": "หักหลบฉับไว",
  "ตำนาน": "ดาบคลื่นสมุทร"
};

export function getBattleStats(name: string, weight: number, masteryLevel = 1): BattleStats {
  const profile = FISH_PROFILES.find(species => species.name === name);
  const info = SPECIES_INFO[name];
  const sizeProgress = info
    ? Math.max(0, Math.min(1, (weight - info.weight[0]) / Math.max(.01, info.weight[1] - info.weight[0])))
    : .4;
  const stamina = profile?.stamina ?? 70;
  const run = profile?.runFactor ?? 1;
  const swim = profile?.swimFactor ?? 1;
  return {
    maxMorale: Math.round(65 + stamina * .48 + sizeProgress * 16 + (masteryLevel - 1) * 2),
    power: Math.round(11 + run * 6 + sizeProgress * 7 + (masteryLevel - 1) * .7),
    defense: Math.round(7 + stamina * .075 + sizeProgress * 3 + (masteryLevel - 1) * .3),
    speed: Math.round(8 + swim * 7 + sizeProgress * 4),
    skillName: SKILL_BY_BEHAVIOR[profile?.behavior ?? "สงบ"] ?? "กระแสน้ำ"
  };
}
