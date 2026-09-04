import type { DailyQuestDefinition } from "../types/dailyQuest";

export const DAILY_QUEST_POOL: DailyQuestDefinition[] = [
  {
    id: "daily-catch", metric: "fish_caught", icon: "🎣",
    title: "สำรวจใต้น้ำ", description: "ตกสัตว์น้ำสำเร็จ 3 ครั้ง", goal: 3,
    rewardCoins: 40, rewardXp: 20, rewardConservation: 0
  },
  {
    id: "daily-clean-water", metric: "trash_collected", icon: "♻",
    title: "ผู้พิทักษ์แหล่งน้ำ", description: "เก็บขยะจากการตกปลา 1 ชิ้น", goal: 1,
    rewardCoins: 25, rewardXp: 15, rewardConservation: 3
  },
  {
    id: "daily-aquarium", metric: "aquarium_care", icon: "🐠",
    title: "ผู้ดูแลตัวน้อย", description: "ให้อาหารหรือล้างตู้ปลา 1 ครั้ง", goal: 1,
    rewardCoins: 30, rewardXp: 15, rewardConservation: 2
  },
  {
    id: "daily-battle", metric: "battle_completed", icon: "🏆",
    title: "มิตรภาพในสนาม", description: "ประลองสัตว์น้ำให้จบ 1 ครั้ง", goal: 1,
    rewardCoins: 35, rewardXp: 20, rewardConservation: 0
  }
];

export const DAILY_ALL_CLEAR_REWARD = {
  coins: 80,
  xp: 30,
  conservation: 5
} as const;

export function getDailyQuestDefinitions(dateKey: string): DailyQuestDefinition[] {
  const rotation = [...dateKey].reduce((sum, character) => sum + character.charCodeAt(0), 0)
    % DAILY_QUEST_POOL.length;
  return Array.from({ length: 3 }, (_, index) =>
    DAILY_QUEST_POOL[(rotation + index) % DAILY_QUEST_POOL.length]);
}
