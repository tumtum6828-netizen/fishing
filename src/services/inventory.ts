import { readSaveData, writeSaveData, type FishInventoryStack, type InventoryData } from "./save";
import type { AquaticSex } from "../types/aquarium";

function finiteNonNegative(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function inferLegacySexCounts(name: string, count: number): Record<AquaticSex, number> {
  const preferMale = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2 === 0;
  const half = Math.floor(count / 2);
  return {
    male: half + (count % 2 === 1 && preferMale ? 1 : 0),
    female: half + (count % 2 === 1 && !preferMale ? 1 : 0)
  };
}

export function rollAquaticSex(): AquaticSex {
  return Math.random() < .5 ? "male" : "female";
}

export function readInventory(): InventoryData {
  const stored = readSaveData().inventory;
  const fish: Record<string, FishInventoryStack> = {};
  Object.entries(stored?.fish ?? {}).forEach(([name, stack]) => {
    const count = Math.floor(finiteNonNegative(stack?.count));
    if (count <= 0) return;
    const storedMale = Math.floor(finiteNonNegative(stack.sexCounts?.male));
    const storedFemale = Math.floor(finiteNonNegative(stack.sexCounts?.female));
    const legacyCounts = inferLegacySexCounts(name, count);
    const hasCompleteSexCounts = storedMale + storedFemale === count;
    fish[name] = {
      count,
      totalWeight: finiteNonNegative(stack.totalWeight),
      bestWeight: finiteNonNegative(stack.bestWeight),
      totalValue: Math.floor(finiteNonNegative(stack.totalValue)),
      sexCounts: hasCompleteSexCounts ? { male: storedMale, female: storedFemale } : legacyCounts
    };
  });
  const trash: Record<string, number> = {};
  Object.entries(stored?.trash ?? {}).forEach(([name, count]) => {
    const safeCount = Math.floor(finiteNonNegative(count));
    if (safeCount > 0) trash[name] = safeCount;
  });
  return { fish, trash };
}

export function addFishToInventory(
  name: string,
  weight: number,
  saleValue: number,
  sex: AquaticSex = rollAquaticSex()
): InventoryData {
  const inventory = readInventory();
  const current = inventory.fish[name] ?? {
    count: 0, totalWeight: 0, bestWeight: 0, totalValue: 0, sexCounts: { male: 0, female: 0 }
  };
  inventory.fish[name] = {
    count: current.count + 1,
    totalWeight: current.totalWeight + finiteNonNegative(weight),
    bestWeight: Math.max(current.bestWeight, finiteNonNegative(weight)),
    totalValue: current.totalValue + Math.floor(finiteNonNegative(saleValue)),
    sexCounts: { ...current.sexCounts, [sex]: current.sexCounts[sex] + 1 }
  };
  writeSaveData({ inventory });
  return inventory;
}

export function addTrashToInventory(name = "กระป๋องเก่า"): InventoryData {
  const inventory = readInventory();
  inventory.trash[name] = (inventory.trash[name] ?? 0) + 1;
  writeSaveData({ inventory });
  return inventory;
}

export function getInventoryFishValue(inventory: InventoryData = readInventory()): number {
  return Object.values(inventory.fish).reduce((total, stack) => total + stack.totalValue, 0);
}

export function sellAllInventoryFish(): number {
  const save = readSaveData();
  const inventory = readInventory();
  const earned = getInventoryFishValue(inventory);
  if (earned <= 0) return 0;
  inventory.fish = {};
  writeSaveData({ coins: Math.max(0, save.coins ?? 0) + earned, inventory });
  return earned;
}
