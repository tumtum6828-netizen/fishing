export type QuestStatus = "not-started" | "active" | "ready" | "completed";

export type StarterQuestProgress = {
  status: QuestStatus;
  fishCaught: number;
  trashCollected: number;
};

export const STARTER_QUEST = {
  id: "manat-clean-bay",
  title: "มือใหม่รักษ์อ่าว",
  fishGoal: 3,
  trashGoal: 1,
  starterBait: 10,
  rewardCoins: 150,
  rewardXp: 100,
  unlockItemId: "reinforced-line"
} as const;

export const EMPTY_STARTER_QUEST: StarterQuestProgress = {
  status: "not-started",
  fishCaught: 0,
  trashCollected: 0
};

export function getAnglerLevel(xp = 0, collectionCount = 0): number {
  const xpLevel = 1 + Math.floor(Math.max(0, xp) / 100);
  const legacyLevel = 1 + Math.floor(Math.max(0, collectionCount) / 10);
  return Math.max(xpLevel, legacyLevel);
}
