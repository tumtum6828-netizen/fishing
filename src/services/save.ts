import type { StarterQuestProgress } from "../data/questData";
import type { WeatherId } from "../data/environmentData";
import type { AquariumData, AquaticSex } from "../types/aquarium";
import type { BreedingData } from "../types/breeding";
import type { BattleProgress } from "../types/battle";
import type { DailyQuestState } from "../types/dailyQuest";
import type { MarketData } from "../types/market";
import type { CharacterSelection } from "../types/character";
import type { EquippedFashion } from "../types/fashion";
import type { SpeciesLog, SpeciesLogEntry } from "../types/journal";

export type FishInventoryStack = {
  count: number;
  totalWeight: number;
  bestWeight: number;
  totalValue: number;
  sexCounts: Record<AquaticSex, number>;
};

export type InventoryData = {
  fish: Record<string, FishInventoryStack>;
  trash: Record<string, number>;
};

export type SaveData = {
  testDataVersion?: number;
  coins?: number;
  conservationPoints?: number;
  collectionCount?: number;
  rodIndex?: number;
  rodUpgradeLevels?: Record<string, number>;
  selectedBaitId?: string;
  baitStock?: Record<string, number>;
  activePotionId?: string;
  activePotionUsesRemaining?: number;
  ownedShopItems?: Record<string, number>;
  records?: Array<[string, number]>;
  discoveredSpecies?: string[];
  quests?: Record<string, StarterQuestProgress>;
  starterPackClaimed?: boolean;
  anglerXp?: number;
  claimedLevelRewards?: number[];
  unlockedShopItems?: string[];
  inventory?: InventoryData;
  worldDay?: number;
  worldMinutes?: number;
  weather?: WeatherId;
  aquarium?: AquariumData;
  breeding?: BreedingData;
  battle?: BattleProgress;
  dailyQuests?: DailyQuestState;
  market?: MarketData;
  character?: CharacterSelection;
  equippedFashion?: EquippedFashion;
  speciesLog?: SpeciesLog;
  claimedHabitatRewards?: string[];
};

const PLAYER_SAVE_KEY = "aquatic-adventure-save-v1";
const DEV_TEST_SAVE_KEY = "aquatic-adventure-save-v1-devtest";

/**
 * dev server ทุกพอร์ตใช้เซฟแยก เพื่อไม่ให้ข้อมูลทดสอบเขียนทับเซฟผู้เล่นจริง
 * build production และ `vite preview` ใช้เซฟผู้เล่นตามปกติ
 */
export function isDevTestMode(): boolean {
  return import.meta.env?.DEV === true;
}

export function getSaveKey(): string {
  return isDevTestMode() ? DEV_TEST_SAVE_KEY : PLAYER_SAVE_KEY;
}

/**
 * ครั้งแรกที่เข้า dev หลังแยก key ให้คัดลอกเซฟผู้เล่นมาเป็นจุดตั้งต้น
 * เพื่อไม่ให้ความคืบหน้าที่เล่นค้างไว้หายไปจากหน้า dev
 * ไม่เขียนทับเซฟผู้เล่นเดิม และไม่ทำซ้ำเมื่อมีเซฟ dev อยู่แล้ว
 */
export function adoptPlayerSaveForDevTest(): void {
  if (!isDevTestMode()) return;
  if (localStorage.getItem(DEV_TEST_SAVE_KEY) !== null) return;
  const playerSave = localStorage.getItem(PLAYER_SAVE_KEY);
  if (playerSave === null) return;
  localStorage.setItem(DEV_TEST_SAVE_KEY, playerSave);
}

const WEATHER_IDS: readonly string[] = ["clear", "cloudy", "rain"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function arrayOf<T>(value: unknown, item: (entry: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const kept: T[] = [];
  value.forEach(entry => {
    const parsed = item(entry);
    if (parsed !== undefined) kept.push(parsed);
  });
  return kept;
}

function recordOf<T>(value: unknown, item: (entry: unknown) => T | undefined): Record<string, T> | undefined {
  if (!isPlainObject(value)) return undefined;
  const kept: Record<string, T> = {};
  Object.entries(value).forEach(([key, entry]) => {
    const parsed = item(entry);
    if (parsed !== undefined) kept[key] = parsed;
  });
  return kept;
}

function recordEntry(value: unknown): [string, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const name = str(value[0]);
  const weight = num(value[1]);
  return name !== undefined && weight !== undefined ? [name, weight] : undefined;
}

function fishStack(value: unknown): FishInventoryStack | undefined {
  if (!isPlainObject(value)) return undefined;
  const sexCounts = isPlainObject(value.sexCounts) ? value.sexCounts : {};
  return {
    count: num(value.count) ?? 0,
    totalWeight: num(value.totalWeight) ?? 0,
    bestWeight: num(value.bestWeight) ?? 0,
    totalValue: num(value.totalValue) ?? 0,
    sexCounts: { male: num(sexCounts.male) ?? 0, female: num(sexCounts.female) ?? 0 }
  };
}

function inventory(value: unknown): InventoryData | undefined {
  if (!isPlainObject(value)) return undefined;
  return {
    fish: recordOf(value.fish, fishStack) ?? {},
    trash: recordOf(value.trash, num) ?? {}
  };
}

function speciesLogEntry(value: unknown): SpeciesLogEntry | undefined {
  if (!isPlainObject(value)) return undefined;
  // ช่องซ้ำถูกตัดออกตั้งแต่ตอนอ่าน ไม่งั้นความคืบหน้าจะนับเกินจริง
  const cells = [...new Set(arrayOf(value.cells, str) ?? [])];
  return {
    cells,
    catchCount: num(value.catchCount) ?? 0,
    ...(num(value.firstSeenDay) !== undefined ? { firstSeenDay: num(value.firstSeenDay) } : {})
  };
}

/** ผ่านได้เฉพาะ object เท่านั้น เนื้อในให้ service ของระบบนั้นตรวจเองตอนอ่าน */
function objectOnly<T>(value: unknown): T | undefined {
  return isPlainObject(value) ? (value as T) : undefined;
}

/**
 * ซ่อมเซฟทีละฟิลด์ ไม่ใช่ทิ้งทั้งก้อน
 * ฟิลด์ที่ผิดรูปจะหายไปเฉพาะฟิลด์นั้น ความคืบหน้าที่เหลือต้องอยู่ครบเสมอ
 * ฟิลด์ที่ไม่รู้จักถูกส่งต่อไปตามเดิม ไม่งั้นเซฟจากเวอร์ชันใหม่กว่าจะถูกลบทิ้งตอนเขียนกลับ
 */
export function sanitizeSaveData(raw: unknown): SaveData {
  if (!isPlainObject(raw)) return {};
  const known = new Set([
    "testDataVersion", "coins", "conservationPoints", "collectionCount", "rodIndex",
    "rodUpgradeLevels", "selectedBaitId", "baitStock", "activePotionId", "activePotionUsesRemaining",
    "ownedShopItems", "records", "discoveredSpecies", "quests", "starterPackClaimed", "anglerXp",
    "claimedLevelRewards", "unlockedShopItems", "inventory", "worldDay", "worldMinutes", "weather",
    "aquarium", "breeding", "battle", "dailyQuests", "market", "character", "equippedFashion", "speciesLog",
    "claimedHabitatRewards"
  ]);
  const passthrough: Record<string, unknown> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!known.has(key)) passthrough[key] = value;
  });

  const weather = str(raw.weather);
  const parsed: SaveData = {
    ...passthrough,
    testDataVersion: num(raw.testDataVersion),
    coins: num(raw.coins),
    conservationPoints: num(raw.conservationPoints),
    collectionCount: num(raw.collectionCount),
    rodIndex: num(raw.rodIndex),
    rodUpgradeLevels: recordOf(raw.rodUpgradeLevels, num),
    selectedBaitId: str(raw.selectedBaitId),
    baitStock: recordOf(raw.baitStock, num),
    activePotionId: str(raw.activePotionId),
    activePotionUsesRemaining: num(raw.activePotionUsesRemaining),
    ownedShopItems: recordOf(raw.ownedShopItems, num),
    records: arrayOf(raw.records, recordEntry),
    discoveredSpecies: arrayOf(raw.discoveredSpecies, str),
    quests: recordOf(raw.quests, objectOnly<StarterQuestProgress>),
    starterPackClaimed: bool(raw.starterPackClaimed),
    anglerXp: num(raw.anglerXp),
    claimedLevelRewards: arrayOf(raw.claimedLevelRewards, num),
    unlockedShopItems: arrayOf(raw.unlockedShopItems, str),
    inventory: inventory(raw.inventory),
    worldDay: num(raw.worldDay),
    worldMinutes: num(raw.worldMinutes),
    weather: weather !== undefined && WEATHER_IDS.includes(weather) ? (weather as WeatherId) : undefined,
    aquarium: objectOnly<AquariumData>(raw.aquarium),
    breeding: objectOnly<BreedingData>(raw.breeding),
    battle: objectOnly<BattleProgress>(raw.battle),
    dailyQuests: objectOnly<DailyQuestState>(raw.dailyQuests),
    market: objectOnly<MarketData>(raw.market),
    character: objectOnly<CharacterSelection>(raw.character),
    equippedFashion: objectOnly<EquippedFashion>(raw.equippedFashion),
    speciesLog: recordOf(raw.speciesLog, speciesLogEntry),
    claimedHabitatRewards: arrayOf(raw.claimedHabitatRewards, str)
  };

  // ตัดคีย์ที่เป็น undefined ออก เพื่อให้ `save.field ?? ค่าเริ่มต้น` ทำงานเหมือนเดิมทุกจุดที่เรียกใช้
  Object.keys(parsed).forEach(key => {
    if (parsed[key as keyof SaveData] === undefined) delete parsed[key as keyof SaveData];
  });
  return parsed;
}

export function readSaveData(): SaveData {
  try {
    return sanitizeSaveData(JSON.parse(localStorage.getItem(getSaveKey()) ?? "{}"));
  } catch {
    return {};
  }
}

export function writeSaveData(update: Partial<SaveData>): void {
  localStorage.setItem(getSaveKey(), JSON.stringify({ ...readSaveData(), ...update }));
}
