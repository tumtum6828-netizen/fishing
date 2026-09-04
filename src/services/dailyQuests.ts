import { DAILY_ALL_CLEAR_REWARD, getDailyQuestDefinitions } from "../data/dailyQuestData";
import type { DailyQuestMetric, DailyQuestState } from "../types/dailyQuest";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export type DailyClaimResult = { ok: boolean; message: string };

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeProgress(value: unknown, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, Math.floor(parsed))) : 0;
}

export function readDailyQuestState(save: SaveData = readSaveData()): DailyQuestState {
  const dateKey = getLocalDateKey();
  const definitions = getDailyQuestDefinitions(dateKey);
  if (save.dailyQuests?.dateKey !== dateKey) {
    return { dateKey, progress: {}, claimedIds: [], bonusClaimed: false };
  }
  const progress: Record<string, number> = {};
  definitions.forEach(quest => {
    progress[quest.id] = safeProgress(save.dailyQuests?.progress?.[quest.id], quest.goal);
  });
  const validIds = new Set(definitions.map(quest => quest.id));
  return {
    dateKey,
    progress,
    claimedIds: [...new Set(save.dailyQuests.claimedIds ?? [])].filter(id => validIds.has(id)),
    bonusClaimed: save.dailyQuests.bonusClaimed === true
  };
}

export function recordDailyQuestProgress(metric: DailyQuestMetric, amount = 1): DailyQuestState {
  const save = readSaveData();
  const state = readDailyQuestState(save);
  const definitions = getDailyQuestDefinitions(state.dateKey);
  definitions.filter(quest => quest.metric === metric).forEach(quest => {
    state.progress[quest.id] = Math.min(quest.goal,
      (state.progress[quest.id] ?? 0) + Math.max(0, Math.floor(amount)));
  });
  writeSaveData({ dailyQuests: state });
  return state;
}

export function claimDailyQuest(questId: string): DailyClaimResult {
  const save = readSaveData();
  const state = readDailyQuestState(save);
  const quest = getDailyQuestDefinitions(state.dateKey).find(item => item.id === questId);
  if (!quest) return { ok: false, message: "ไม่พบภารกิจของวันนี้" };
  if ((state.progress[quest.id] ?? 0) < quest.goal) return { ok: false, message: "ภารกิจยังไม่สำเร็จ" };
  if (state.claimedIds.includes(quest.id)) return { ok: false, message: "รับรางวัลนี้แล้ว" };
  state.claimedIds.push(quest.id);
  writeSaveData({
    dailyQuests: state,
    coins: Math.max(0, save.coins ?? 0) + quest.rewardCoins,
    anglerXp: Math.max(0, save.anglerXp ?? 0) + quest.rewardXp,
    conservationPoints: Math.max(0, save.conservationPoints ?? 0) + quest.rewardConservation
  });
  return { ok: true, message: `รับรางวัล “${quest.title}” แล้ว` };
}

export function claimDailyAllClear(): DailyClaimResult {
  const save = readSaveData();
  const state = readDailyQuestState(save);
  const definitions = getDailyQuestDefinitions(state.dateKey);
  if (state.bonusClaimed) return { ok: false, message: "รับโบนัสวันนี้แล้ว" };
  if (!definitions.every(quest => state.claimedIds.includes(quest.id))) {
    return { ok: false, message: "รับรางวัลภารกิจทั้ง 3 ข้อก่อน" };
  }
  state.bonusClaimed = true;
  writeSaveData({
    dailyQuests: state,
    coins: Math.max(0, save.coins ?? 0) + DAILY_ALL_CLEAR_REWARD.coins,
    anglerXp: Math.max(0, save.anglerXp ?? 0) + DAILY_ALL_CLEAR_REWARD.xp,
    conservationPoints: Math.max(0, save.conservationPoints ?? 0) + DAILY_ALL_CLEAR_REWARD.conservation
  });
  return { ok: true, message: "รับโบนัสทำครบประจำวันแล้ว" };
}

export function getDailyQuestSummary(save: SaveData = readSaveData()): string {
  const state = readDailyQuestState(save);
  const definitions = getDailyQuestDefinitions(state.dateKey);
  const completed = definitions.filter(quest => (state.progress[quest.id] ?? 0) >= quest.goal).length;
  const ready = definitions.filter(quest =>
    (state.progress[quest.id] ?? 0) >= quest.goal && !state.claimedIds.includes(quest.id)).length;
  return ready > 0
    ? `ภารกิจวันนี้ ${completed}/3  •  มี ${ready} รางวัลรอรับ`
    : `ภารกิจวันนี้ ${completed}/3  •  แตะเพื่อดู`;
}
