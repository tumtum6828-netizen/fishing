import {
  BREEDING_XP_PER_COMPLETION,
  BREEDING_LEVEL_REWARDS,
  getBreedingDurationMinutes,
  getBreedingLevel,
  getBreedingTwinChance
} from "../data/breedingData";
import { FISH_PROFILES, LEGENDARY_FISH, SPECIES_INFO } from "../data/gameData";
import type { BreedingData, BreedingProject } from "../types/breeding";
import { getWorldTotalMinutes } from "./aquarium";
import { addFishToInventory, readInventory, rollAquaticSex } from "./inventory";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export type BreedingActionResult = { ok: boolean; message: string };

export function isBreedableFish(name: string): boolean {
  const profile = FISH_PROFILES.find(species => species.name === name);
  return profile?.kind === "fish" && name !== LEGENDARY_FISH.name;
}

export function readBreeding(save: SaveData = readSaveData()): BreedingData {
  const xpValue = Number(save.breeding?.xp);
  const completedValue = Number(save.breeding?.completedCount);
  const xp = Number.isFinite(xpValue) ? Math.max(0, Math.floor(xpValue)) : 0;
  const completedCount = Number.isFinite(completedValue) ? Math.max(0, Math.floor(completedValue)) : 0;
  const claimedRewardLevels = [...new Set(save.breeding?.claimedRewardLevels ?? [])]
    .filter(level => Number.isInteger(level) && BREEDING_LEVEL_REWARDS.some(reward => reward.level === level));
  const raw = save.breeding?.project;
  if (!raw || !isBreedableFish(raw.speciesName)) return { xp, completedCount, claimedRewardLevels };
  const startedAt = Number(raw.startedAtWorldMinute);
  const readyAt = Number(raw.readyAtWorldMinute);
  const parentWeight = Number(raw.parentWeightEach);
  const parentValue = Number(raw.parentValueEach);
  if (![startedAt, readyAt, parentWeight, parentValue].every(Number.isFinite)) {
    return { xp, completedCount, claimedRewardLevels };
  }
  const project: BreedingProject = {
    speciesName: raw.speciesName,
    startedAtWorldMinute: Math.max(0, startedAt),
    readyAtWorldMinute: Math.max(startedAt, readyAt),
    parentWeightEach: Math.max(0, parentWeight),
    parentValueEach: Math.max(0, Math.floor(parentValue))
  };
  return { xp, completedCount, claimedRewardLevels, project };
}

export function getBreedingRemainingMinutes(save: SaveData = readSaveData()): number {
  const project = readBreeding(save).project;
  return project ? Math.max(0, project.readyAtWorldMinute - getWorldTotalMinutes(save)) : 0;
}

export function startBreeding(speciesName: string): BreedingActionResult {
  const save = readSaveData();
  const breeding = readBreeding(save);
  if (breeding.project) return { ok: false, message: "กำลังดูแลคู่พ่อแม่พันธุ์อื่นอยู่" };
  if (!isBreedableFish(speciesName)) return { ok: false, message: "ศูนย์รุ่นแรกรองรับปลาทั่วไปเท่านั้น" };
  const inventory = readInventory();
  const stack = inventory.fish[speciesName];
  if (!stack || stack.sexCounts.male < 1 || stack.sexCounts.female < 1) {
    return { ok: false, message: "ต้องมีปลาเพศผู้และเพศเมียอย่างละ 1 ตัวในกระเป๋า" };
  }
  const parentWeightEach = stack.totalWeight / stack.count;
  const parentValueEach = Math.floor(stack.totalValue / stack.count);
  stack.count -= 2;
  stack.totalWeight = Math.max(0, stack.totalWeight - parentWeightEach * 2);
  stack.totalValue = Math.max(0, stack.totalValue - parentValueEach * 2);
  stack.sexCounts.male -= 1;
  stack.sexCounts.female -= 1;
  if (stack.count <= 0) delete inventory.fish[speciesName];
  const startedAtWorldMinute = getWorldTotalMinutes(save);
  const duration = getBreedingDurationMinutes(getBreedingLevel(breeding.xp));
  const project: BreedingProject = {
    speciesName,
    startedAtWorldMinute,
    readyAtWorldMinute: startedAtWorldMinute + duration,
    parentWeightEach,
    parentValueEach
  };
  writeSaveData({ inventory, breeding: { ...breeding, project } });
  return { ok: true, message: `เริ่มดูแลคู่${speciesName}แล้ว` };
}

export function cancelBreeding(): BreedingActionResult {
  const save = readSaveData();
  const breeding = readBreeding(save);
  const project = breeding.project;
  if (!project) return { ok: false, message: "ยังไม่มีคู่พ่อแม่พันธุ์" };
  const inventory = readInventory();
  const current = inventory.fish[project.speciesName] ?? {
    count: 0, totalWeight: 0, bestWeight: 0, totalValue: 0, sexCounts: { male: 0, female: 0 }
  };
  inventory.fish[project.speciesName] = {
    count: current.count + 2,
    totalWeight: current.totalWeight + project.parentWeightEach * 2,
    bestWeight: Math.max(current.bestWeight, project.parentWeightEach),
    totalValue: current.totalValue + project.parentValueEach * 2,
    sexCounts: { male: current.sexCounts.male + 1, female: current.sexCounts.female + 1 }
  };
  writeSaveData({
    inventory,
    breeding: {
      xp: breeding.xp,
      completedCount: breeding.completedCount,
      claimedRewardLevels: breeding.claimedRewardLevels
    }
  });
  return { ok: true, message: "ยกเลิกและคืนพ่อแม่พันธุ์เข้ากระเป๋าแล้ว" };
}

export function claimOffspring(): BreedingActionResult {
  const save = readSaveData();
  const breeding = readBreeding(save);
  const project = breeding.project;
  if (!project) return { ok: false, message: "ยังไม่มีลูกปลาที่รอรับ" };
  if (getBreedingRemainingMinutes(save) > 0) return { ok: false, message: "ลูกปลายังไม่พร้อมย้าย" };
  const speciesInfo = SPECIES_INFO[project.speciesName];
  const juvenileWeight = speciesInfo
    ? speciesInfo.weight[0] * (.24 + Math.random() * .12)
    : Math.max(.03, project.parentWeightEach * .12);
  const saleValue = Math.max(1, Math.round(juvenileWeight * 20));
  const level = getBreedingLevel(breeding.xp);
  const offspringCount = Math.random() < getBreedingTwinChance(level) ? 2 : 1;
  cancelBreeding();
  writeSaveData({
    breeding: {
      xp: breeding.xp + BREEDING_XP_PER_COMPLETION,
      completedCount: breeding.completedCount + 1,
      claimedRewardLevels: breeding.claimedRewardLevels
    }
  });
  for (let index = 0; index < offspringCount; index += 1) {
    const weightVariation = index === 0 ? 1 : .9 + Math.random() * .2;
    addFishToInventory(project.speciesName, juvenileWeight * weightVariation, saleValue, rollAquaticSex());
  }
  const offspringLabel = offspringCount === 2 ? `ลูก${project.speciesName}แฝด 2 ตัว!` : `ลูก${project.speciesName} 1 ตัว`;
  return {
    ok: true,
    message: `พ่อแม่พันธุ์กลับกระเป๋า • ได้${offspringLabel} • EXP +${BREEDING_XP_PER_COMPLETION}`
  };
}

export function claimBreedingLevelReward(level: number): BreedingActionResult {
  const save = readSaveData();
  const breeding = readBreeding(save);
  const reward = BREEDING_LEVEL_REWARDS.find(item => item.level === level);
  if (!reward) return { ok: false, message: "ไม่พบรางวัลระดับนี้" };
  if (getBreedingLevel(breeding.xp) < level) return { ok: false, message: `ต้องถึงความชำนาญ Lv.${level}` };
  if (breeding.claimedRewardLevels.includes(level)) return { ok: false, message: "รับรางวัลนี้แล้ว" };
  writeSaveData({
    coins: Math.max(0, save.coins ?? 0) + reward.coins,
    conservationPoints: Math.max(0, save.conservationPoints ?? 0) + reward.conservationPoints,
    breeding: { ...breeding, claimedRewardLevels: [...breeding.claimedRewardLevels, level] }
  });
  const rewards = [
    reward.coins > 0 ? `${reward.coins} เหรียญ` : "",
    reward.conservationPoints > 0 ? `${reward.conservationPoints} คะแนนอนุรักษ์` : ""
  ].filter(Boolean).join(" และ ");
  return { ok: true, message: `รับ${reward.label}: ${rewards}` };
}
