import { FISH_PROFILES, LEGENDARY_FISH, RODS, SPECIES_INFO } from "../data/gameData";
import { ROD_UPGRADE_MAX_LEVEL } from "../data/equipmentUpgradeData";
import { SHOP_ITEMS } from "../data/shopData";
import type { BattleProgress } from "../types/battle";
import type { FishInventoryStack, InventoryData, SaveData } from "./save";
import { isDevTestMode, readSaveData, writeSaveData } from "./save";

const TEST_DATA_VERSION = 1;
const TEST_FISH_COUNT = 6;
const TEST_BAIT_COUNT = 99;
const TEST_ITEM_COUNT = 12;
const TEST_MATERIAL_COUNT = 25;

function makeFishStack(name: string): FishInventoryStack {
  const range = SPECIES_INFO[name]?.weight ?? [.1, 1];
  const bestWeight = range[0] + (range[1] - range[0]) * .72;
  const averageWeight = range[0] + (range[1] - range[0]) * .42;
  return {
    count: TEST_FISH_COUNT,
    totalWeight: averageWeight * TEST_FISH_COUNT,
    bestWeight,
    totalValue: Math.max(TEST_FISH_COUNT, Math.round(averageWeight * 25 * TEST_FISH_COUNT)),
    sexCounts: { male: TEST_FISH_COUNT / 2, female: TEST_FISH_COUNT / 2 }
  };
}

function makeTestInventory(save: SaveData): InventoryData {
  const species = [...FISH_PROFILES, LEGENDARY_FISH];
  const fish = { ...(save.inventory?.fish ?? {}) };
  species.forEach(profile => {
    fish[profile.name] = makeFishStack(profile.name);
  });
  const trash = { ...(save.inventory?.trash ?? {}) };
  ["กระป๋องเก่า", "ขวดพลาสติก", "เศษอวน", "กิ่งไม้ลอยน้ำ"].forEach(name => {
    trash[name] = Math.max(trash[name] ?? 0, TEST_MATERIAL_COUNT);
  });
  return { fish, trash };
}

function makeOwnedItems(save: SaveData): Record<string, number> {
  const owned = { ...(save.ownedShopItems ?? {}) };
  SHOP_ITEMS.forEach(item => {
    const testCount = item.stackable ? TEST_ITEM_COUNT : 1;
    owned[item.id] = Math.max(owned[item.id] ?? 0, testCount);
  });
  return owned;
}

function makeBattleProgress(save: SaveData): BattleProgress {
  const current = save.battle;
  const masteryXpBySpecies = { ...(current?.masteryXpBySpecies ?? {}) };
  FISH_PROFILES.filter(profile => profile.kind === "fish").forEach(profile => {
    masteryXpBySpecies[profile.name] = Math.max(masteryXpBySpecies[profile.name] ?? 0, 80);
  });
  return {
    wins: Math.max(current?.wins ?? 0, 3),
    losses: current?.losses ?? 0,
    winStreak: current?.winStreak ?? 0,
    masteryXpBySpecies,
    clearedOpponentIds: [...(current?.clearedOpponentIds ?? [])]
  };
}

/** เติมข้อมูลลงเซฟทดสอบของ dev server เท่านั้น โดยไม่แตะตัวละครที่ผู้เล่นยืนยันไว้ */
export function seedPrototypeTestData(): void {
  if (!isDevTestMode()) return;
  const save = readSaveData();
  if ((save.testDataVersion ?? 0) >= TEST_DATA_VERSION) return;

  const records = new Map(save.records ?? []);
  [...FISH_PROFILES, LEGENDARY_FISH].forEach(profile => {
    const testRecord = makeFishStack(profile.name).bestWeight;
    records.set(profile.name, Math.max(records.get(profile.name) ?? 0, testRecord));
  });
  const baitStock = { ...(save.baitStock ?? {}) };
  SHOP_ITEMS.filter(item => item.category === "bait").forEach(item => {
    baitStock[item.id] = Math.max(baitStock[item.id] ?? 0, TEST_BAIT_COUNT);
  });
  const rodUpgradeLevels = { ...(save.rodUpgradeLevels ?? {}) };
  RODS.forEach(rod => { rodUpgradeLevels[rod.id] = ROD_UPGRADE_MAX_LEVEL; });

  writeSaveData({
    testDataVersion: TEST_DATA_VERSION,
    coins: Math.max(save.coins ?? 0, 5000),
    conservationPoints: Math.max(save.conservationPoints ?? 0, 250),
    collectionCount: Math.max(save.collectionCount ?? 0, 80),
    anglerXp: Math.max(save.anglerXp ?? 0, 900),
    rodIndex: RODS.length - 1,
    rodUpgradeLevels,
    selectedBaitId: save.selectedBaitId === "none" ? "none" : "fresh-shrimp",
    baitStock,
    ownedShopItems: makeOwnedItems(save),
    unlockedShopItems: [...new Set([...(save.unlockedShopItems ?? []), ...SHOP_ITEMS.map(item => item.id)])],
    records: [...records.entries()],
    discoveredSpecies: [...new Set([
      ...(save.discoveredSpecies ?? []),
      ...FISH_PROFILES.map(profile => profile.name),
      LEGENDARY_FISH.name
    ])],
    inventory: makeTestInventory(save),
    battle: makeBattleProgress(save),
    breeding: {
      xp: Math.max(save.breeding?.xp ?? 0, 200),
      completedCount: save.breeding?.completedCount ?? 0,
      claimedRewardLevels: [...(save.breeding?.claimedRewardLevels ?? [])],
      ...(save.breeding?.project ? { project: save.breeding.project } : {})
    }
  });
}
