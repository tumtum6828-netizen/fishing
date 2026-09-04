import {
  AQUARIUM_DECORATIONS,
  AQUARIUM_MINUTES_TO_DIRTY,
  AQUARIUM_MINUTES_TO_HUNGRY,
  getAquariumCapacity
} from "../data/aquariumData";
import { FISH_PROFILES, LEGENDARY_FISH } from "../data/gameData";
import { getAnglerLevel } from "../data/questData";
import type { AquariumData, AquariumResident, AquaticSex } from "../types/aquarium";
import { readInventory } from "./inventory";
import { readSaveData, writeSaveData, type SaveData } from "./save";
import { readWorldState } from "./worldTime";
import { recordDailyQuestProgress } from "./dailyQuests";

export type AquariumActionResult = { ok: boolean; message: string };

function finiteNonNegative(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function inferResidentSex(name: string, weight: number): AquaticSex {
  const signature = [...name].reduce((sum, character) => sum + character.charCodeAt(0), Math.round(weight * 100));
  return signature % 2 === 0 ? "male" : "female";
}

export function getWorldTotalMinutes(save: SaveData = readSaveData()): number {
  const world = readWorldState(save);
  return (world.day - 1) * 1440 + world.minutes;
}

export function readAquarium(save: SaveData = readSaveData()): AquariumData {
  const currentMinute = getWorldTotalMinutes(save);
  const knownDecorations = new Set<string>(AQUARIUM_DECORATIONS.map(decoration => decoration.id));
  const seenSpecies = new Set<string>();
  const residents: AquariumResident[] = [];
  for (const resident of save.aquarium?.residents ?? []) {
    if (!resident || typeof resident.name !== "string" || seenSpecies.has(resident.name)) continue;
    const profile = FISH_PROFILES.find(fish => fish.name === resident.name);
    if (!profile || resident.name === LEGENDARY_FISH.name) continue;
    seenSpecies.add(resident.name);
    residents.push({
      name: resident.name,
      weight: finiteNonNegative(resident.weight),
      saleValue: Math.floor(finiteNonNegative(resident.saleValue)),
      sex: resident.sex === "male" || resident.sex === "female"
        ? resident.sex
        : inferResidentSex(resident.name, finiteNonNegative(resident.weight))
    });
  }
  const cleanedAt = Number(save.aquarium?.cleanedAtWorldMinute);
  const normalizedCleanedAt = Number.isFinite(cleanedAt)
    ? Math.min(currentMinute, Math.max(0, cleanedAt))
    : currentMinute;
  const fedAt = Number(save.aquarium?.fedAtWorldMinute);
  return {
    residents,
    decorationIds: [...new Set(save.aquarium?.decorationIds ?? [])]
      .filter(id => knownDecorations.has(id)),
    cleanedAtWorldMinute: normalizedCleanedAt,
    fedAtWorldMinute: Number.isFinite(fedAt)
      ? Math.min(currentMinute, Math.max(0, fedAt))
      : normalizedCleanedAt
  };
}

export function getAquariumCapacityForSave(save: SaveData = readSaveData()): number {
  return getAquariumCapacity(getAnglerLevel(save.anglerXp, save.collectionCount));
}

export function getAquariumCleanliness(save: SaveData = readSaveData()): number {
  const aquarium = readAquarium(save);
  const age = Math.max(0, getWorldTotalMinutes(save) - aquarium.cleanedAtWorldMinute);
  return Math.max(0, Math.round(100 * (1 - age / AQUARIUM_MINUTES_TO_DIRTY)));
}

export function getAquariumSatiety(save: SaveData = readSaveData()): number {
  const aquarium = readAquarium(save);
  if (aquarium.residents.length === 0) return 100;
  const age = Math.max(0, getWorldTotalMinutes(save) - aquarium.fedAtWorldMinute);
  return Math.max(0, Math.round(100 * (1 - age / AQUARIUM_MINUTES_TO_HUNGRY)));
}

export function getAquariumHappiness(save: SaveData = readSaveData()): number {
  const aquarium = readAquarium(save);
  if (aquarium.residents.length === 0) return 100;
  return Math.round(getAquariumCleanliness(save) * .55 + getAquariumSatiety(save) * .45);
}

export function feedAquarium(): AquariumActionResult {
  const save = readSaveData();
  const aquarium = readAquarium(save);
  if (aquarium.residents.length === 0) return { ok: false, message: "ยังไม่มีสัตว์น้ำในตู้" };
  if (getAquariumSatiety(save) >= 90) return { ok: false, message: "สัตว์น้ำยังอิ่มดีอยู่" };
  aquarium.fedAtWorldMinute = getWorldTotalMinutes(save);
  writeSaveData({ aquarium });
  recordDailyQuestProgress("aquarium_care");
  return { ok: true, message: "ให้อาหารที่เหมาะกับสัตว์น้ำแต่ละชนิดแล้ว" };
}

export function placeFishInAquarium(name: string): AquariumActionResult {
  const save = readSaveData();
  const aquarium = readAquarium(save);
  const profile = FISH_PROFILES.find(fish => fish.name === name);
  if (!profile || name === LEGENDARY_FISH.name) {
    return { ok: false, message: "ตู้รุ่นนี้รองรับเฉพาะสัตว์น้ำขนาดทั่วไป" };
  }
  if (aquarium.residents.some(resident => resident.name === name)) {
    return { ok: false, message: "ในตู้มีสัตว์น้ำชนิดนี้อยู่แล้ว" };
  }
  if (aquarium.residents.length >= getAquariumCapacityForSave(save)) {
    return { ok: false, message: "ตู้เต็มแล้ว เพิ่มเลเวลนักตกปลาเพื่อปลดล็อกช่องใหม่" };
  }
  const inventory = readInventory();
  const stack = inventory.fish[name];
  if (!stack || stack.count <= 0) return { ok: false, message: "ไม่มีสัตว์น้ำชนิดนี้ในกระเป๋า" };

  const weight = stack.totalWeight / stack.count;
  const saleValue = Math.floor(stack.totalValue / stack.count);
  const sex: AquaticSex = stack.sexCounts.female > stack.sexCounts.male ? "female" : "male";
  stack.count -= 1;
  stack.totalWeight = Math.max(0, stack.totalWeight - weight);
  stack.totalValue = Math.max(0, stack.totalValue - saleValue);
  stack.sexCounts[sex] = Math.max(0, stack.sexCounts[sex] - 1);
  if (stack.count <= 0) delete inventory.fish[name];
  if (aquarium.residents.length === 0) aquarium.fedAtWorldMinute = getWorldTotalMinutes(save);
  aquarium.residents.push({ name, weight, saleValue, sex });
  writeSaveData({ inventory, aquarium });
  return { ok: true, message: `ปล่อย${name}ลงตู้แล้ว` };
}

export function removeFishFromAquarium(name: string): AquariumActionResult {
  const save = readSaveData();
  const aquarium = readAquarium(save);
  const residentIndex = aquarium.residents.findIndex(resident => resident.name === name);
  if (residentIndex < 0) return { ok: false, message: "ไม่พบสัตว์น้ำชนิดนี้ในตู้" };
  const [resident] = aquarium.residents.splice(residentIndex, 1);
  const inventory = readInventory();
  const current = inventory.fish[name] ?? {
    count: 0, totalWeight: 0, bestWeight: 0, totalValue: 0, sexCounts: { male: 0, female: 0 }
  };
  inventory.fish[name] = {
    count: current.count + 1,
    totalWeight: current.totalWeight + resident.weight,
    bestWeight: Math.max(current.bestWeight, resident.weight),
    totalValue: current.totalValue + resident.saleValue,
    sexCounts: { ...current.sexCounts, [resident.sex]: current.sexCounts[resident.sex] + 1 }
  };
  writeSaveData({ inventory, aquarium });
  return { ok: true, message: `นำ${name}กลับเข้ากระเป๋าแล้ว` };
}

export function cleanAquarium(): AquariumActionResult {
  const save = readSaveData();
  const aquarium = readAquarium(save);
  aquarium.cleanedAtWorldMinute = getWorldTotalMinutes(save);
  writeSaveData({ aquarium });
  recordDailyQuestProgress("aquarium_care");
  return { ok: true, message: "ล้างตู้เรียบร้อย น้ำใสสะอาดแล้ว" };
}

export function toggleAquariumDecoration(id: string): AquariumActionResult {
  const save = readSaveData();
  const aquarium = readAquarium(save);
  const decoration = AQUARIUM_DECORATIONS.find(item => item.id === id);
  if (!decoration) return { ok: false, message: "ไม่พบของตกแต่งชิ้นนี้" };
  const level = getAnglerLevel(save.anglerXp, save.collectionCount);
  if (level < decoration.unlockLevel) {
    return { ok: false, message: `ของตกแต่งชิ้นนี้ปลดล็อกที่ Lv.${decoration.unlockLevel}` };
  }
  aquarium.decorationIds = aquarium.decorationIds.includes(id)
    ? aquarium.decorationIds.filter(itemId => itemId !== id)
    : [...aquarium.decorationIds, id];
  writeSaveData({ aquarium });
  return { ok: true, message: aquarium.decorationIds.includes(id) ? `วาง${decoration.name}แล้ว` : `เก็บ${decoration.name}แล้ว` };
}
