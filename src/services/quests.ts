import {
  EMPTY_STARTER_QUEST,
  STARTER_QUEST,
  type StarterQuestProgress
} from "../data/questData";
import { readSaveData, writeSaveData, type SaveData } from "./save";
import { BAIT_UNITS_PER_BUNDLE, readBaitStock } from "./bait";

function clampProgress(value: unknown, maximum: number): number {
  return Math.min(maximum, Math.max(0, Number.isFinite(value) ? Number(value) : 0));
}

export function readStarterQuest(save: SaveData = readSaveData()): StarterQuestProgress {
  const stored = save.quests?.[STARTER_QUEST.id];
  if (!stored) return { ...EMPTY_STARTER_QUEST };
  const fishCaught = clampProgress(stored.fishCaught, STARTER_QUEST.fishGoal);
  const trashCollected = clampProgress(stored.trashCollected, STARTER_QUEST.trashGoal);
  const validStatus = ["not-started", "active", "ready", "completed"].includes(stored.status)
    ? stored.status
    : "not-started";
  const status = validStatus === "active"
    && fishCaught >= STARTER_QUEST.fishGoal
    && trashCollected >= STARTER_QUEST.trashGoal
      ? "ready"
      : validStatus;
  return { status, fishCaught, trashCollected } as StarterQuestProgress;
}

function writeStarterQuest(progress: StarterQuestProgress, update: Partial<SaveData> = {}): void {
  const save = readSaveData();
  writeSaveData({
    ...update,
    quests: { ...(save.quests ?? {}), [STARTER_QUEST.id]: progress }
  });
}

export function acceptStarterQuest(): StarterQuestProgress {
  const save = readSaveData();
  const current = readStarterQuest(save);
  if (current.status !== "not-started") return current;
  const progress: StarterQuestProgress = { status: "active", fishCaught: 0, trashCollected: 0 };
  const ownedShopItems = { ...(save.ownedShopItems ?? {}) };
  ownedShopItems["worm-bundle"] = (ownedShopItems["worm-bundle"] ?? 0) + 1;
  const baitStock = readBaitStock(save);
  baitStock["worm-bundle"] = (baitStock["worm-bundle"] ?? 0) + BAIT_UNITS_PER_BUNDLE;
  writeStarterQuest(progress, {
    rodIndex: save.rodIndex ?? 0,
    ownedShopItems,
    baitStock,
    starterPackClaimed: true
  });
  return progress;
}

export function recordStarterQuestCatch(kind: "fish" | "trash"): StarterQuestProgress {
  const current = readStarterQuest();
  if (current.status !== "active") return current;
  const fishCaught = kind === "fish"
    ? clampProgress(current.fishCaught + 1, STARTER_QUEST.fishGoal)
    : current.fishCaught;
  const trashCollected = kind === "trash"
    ? clampProgress(current.trashCollected + 1, STARTER_QUEST.trashGoal)
    : current.trashCollected;
  const status = fishCaught >= STARTER_QUEST.fishGoal && trashCollected >= STARTER_QUEST.trashGoal
    ? "ready"
    : "active";
  const progress: StarterQuestProgress = { status, fishCaught, trashCollected };
  writeStarterQuest(progress);
  return progress;
}

export function completeStarterQuest(): StarterQuestProgress {
  const save = readSaveData();
  const current = readStarterQuest(save);
  if (current.status !== "ready") return current;
  const progress: StarterQuestProgress = { ...current, status: "completed" };
  const unlockedShopItems = Array.from(new Set([
    ...(save.unlockedShopItems ?? []), STARTER_QUEST.unlockItemId
  ]));
  writeStarterQuest(progress, {
    coins: Math.max(0, save.coins ?? 0) + STARTER_QUEST.rewardCoins,
    anglerXp: Math.max(0, save.anglerXp ?? 0) + STARTER_QUEST.rewardXp,
    unlockedShopItems
  });
  return progress;
}

export function getStarterQuestSummary(save: SaveData = readSaveData()): string {
  const quest = readStarterQuest(save);
  if (quest.status === "not-started") return "ภารกิจ  •  คุยกับลุงมนัส";
  if (quest.status === "active") {
    return `มือใหม่รักษ์อ่าว  •  สัตว์น้ำ ${quest.fishCaught}/${STARTER_QUEST.fishGoal}  •  ขยะ ${quest.trashCollected}/${STARTER_QUEST.trashGoal}`;
  }
  if (quest.status === "ready") return "ภารกิจพร้อมส่ง  •  กลับไปหาลุงมนัส";
  return "มือใหม่รักษ์อ่าวสำเร็จ  •  ปลดล็อกเอ็นถักเสริมแรง";
}
