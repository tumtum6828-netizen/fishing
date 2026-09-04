export const BREEDING_DURATION_MINUTES = 6 * 60;
export const BREEDING_XP_PER_COMPLETION = 25;
export const BREEDING_XP_PER_LEVEL = 50;
export const BREEDING_MAX_LEVEL = 5;

export type BreedingLevelReward = {
  level: number;
  coins: number;
  conservationPoints: number;
  label: string;
};

export const BREEDING_LEVEL_REWARDS: BreedingLevelReward[] = [
  { level: 2, coins: 120, conservationPoints: 0, label: "ทุนอาหารลูกปลา" },
  { level: 3, coins: 0, conservationPoints: 3, label: "ตราผู้ดูแลแหล่งน้ำ" },
  { level: 4, coins: 280, conservationPoints: 2, label: "ทุนพัฒนาศูนย์เพาะพันธุ์" },
  { level: 5, coins: 500, conservationPoints: 5, label: "รางวัลนักเพาะพันธุ์ชำนาญ" }
];

export function getBreedingLevel(xp: number): number {
  return Math.min(BREEDING_MAX_LEVEL, 1 + Math.floor(Math.max(0, xp) / BREEDING_XP_PER_LEVEL));
}

export function getBreedingDurationMinutes(level: number): number {
  return Math.max(4 * 60, BREEDING_DURATION_MINUTES - (Math.max(1, level) - 1) * 30);
}

export function getBreedingTwinChance(level: number): number {
  return Math.min(.2, .05 + (Math.max(1, level) - 1) * .035);
}

export function getBreedingLevelProgress(xp: number): { current: number; required: number; progress: number } {
  const level = getBreedingLevel(xp);
  if (level >= BREEDING_MAX_LEVEL) return { current: BREEDING_XP_PER_LEVEL, required: BREEDING_XP_PER_LEVEL, progress: 1 };
  const current = Math.max(0, xp) % BREEDING_XP_PER_LEVEL;
  return { current, required: BREEDING_XP_PER_LEVEL, progress: current / BREEDING_XP_PER_LEVEL };
}

export function formatBreedingTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours <= 0) return `${remainingMinutes} นาทีในเกม`;
  if (remainingMinutes === 0) return `${hours} ชม.ในเกม`;
  return `${hours} ชม. ${remainingMinutes} นาทีในเกม`;
}
