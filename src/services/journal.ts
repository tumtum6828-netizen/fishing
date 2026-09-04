import { FISH_ENVIRONMENT_WEIGHTS, type TimePeriod, type WeatherId } from "../data/environmentData";
import {
  biomeInsight,
  HABITAT_BIOMES,
  HABITAT_PERIODS,
  HABITAT_WEATHERS,
  INSIGHT_UNLOCK_FRACTIONS,
  MIN_CELLS_FOR_INSIGHT,
  PERIOD_INSIGHT,
  WEATHER_INSIGHT
} from "../data/journalData";
import type {
  HabitatBiome,
  HabitatCell,
  HabitatProgress,
  InsightKind,
  SpeciesInsight,
  SpeciesLog,
  SpeciesLogEntry
} from "../types/journal";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export function cellKey(cell: HabitatCell): string {
  return `${cell.biome}:${cell.period}:${cell.weather}`;
}

export function parseCellKey(key: string): HabitatCell | undefined {
  const [biome, period, weather] = key.split(":");
  if (!HABITAT_BIOMES.includes(biome as HabitatBiome)) return undefined;
  if (!HABITAT_PERIODS.includes(period as TimePeriod)) return undefined;
  if (!HABITAT_WEATHERS.includes(weather as WeatherId)) return undefined;
  return { biome: biome as HabitatBiome, period: period as TimePeriod, weather: weather as WeatherId };
}

/**
 * แหล่งน้ำที่ชนิดนี้อยู่ได้
 * ชนิดที่ไม่มีข้อมูลนิเวศ เช่น ปลาตำนาน ถือว่าพบได้ทุกแหล่ง เพราะ `rollCatch` ไม่กรองแหล่งน้ำให้
 */
export function habitatBiomes(speciesName: string): readonly HabitatBiome[] {
  const biomes = FISH_ENVIRONMENT_WEIGHTS[speciesName]?.biomes;
  return biomes && biomes.length > 0 ? biomes : HABITAT_BIOMES;
}

export function habitatTotal(speciesName: string): number {
  return habitatBiomes(speciesName).length * HABITAT_PERIODS.length * HABITAT_WEATHERS.length;
}

export function readSpeciesLog(save: SaveData = readSaveData()): SpeciesLog {
  return save.speciesLog ?? {};
}

export function getHabitatProgress(speciesName: string, save: SaveData = readSaveData()): HabitatProgress {
  const total = habitatTotal(speciesName);
  const cells = readSpeciesLog(save)[speciesName]?.cells ?? [];
  // นับเฉพาะช่องที่ยังใช้ได้จริง เผื่อวันหนึ่งชนิดนั้นเปลี่ยนแหล่งน้ำที่อยู่ได้
  const valid = new Set(cells.filter(key => {
    const cell = parseCellKey(key);
    return cell !== undefined && habitatBiomes(speciesName).includes(cell.biome);
  }));
  const found = Math.min(valid.size, total);
  return { found, total, complete: total > 0 && found >= total };
}

export function isHabitatComplete(speciesName: string, save: SaveData = readSaveData()): boolean {
  return getHabitatProgress(speciesName, save).complete;
}

function insightThreshold(kind: InsightKind, total: number): number {
  return Math.max(MIN_CELLS_FOR_INSIGHT, Math.ceil(total * INSIGHT_UNLOCK_FRACTIONS[kind]));
}

function bestKey<T extends string>(weights: Record<T, number> | undefined, order: readonly T[]): T | undefined {
  if (!weights) return undefined;
  let best: T | undefined;
  order.forEach(key => {
    const value = weights[key];
    if (typeof value !== "number") return;
    if (best === undefined || value > weights[best]) best = key;
  });
  return best;
}

/**
 * คำสรุปนิสัยทั้งหมดของชนิดนี้ พร้อมจำนวนช่องที่ต้องค้นพบก่อน
 * ดึงจากค่าจริงใน `FISH_ENVIRONMENT_WEIGHTS` ปรับสมดุลแล้วข้อความขยับตามเอง ไม่ต้องแก้สองที่
 */
export function getSpeciesInsights(speciesName: string): SpeciesInsight[] {
  const total = habitatTotal(speciesName);
  const weights = FISH_ENVIRONMENT_WEIGHTS[speciesName];
  const insights: SpeciesInsight[] = [];
  const bestPeriod = bestKey(weights?.time, HABITAT_PERIODS);
  if (bestPeriod) {
    insights.push({ kind: "time", requiredCells: insightThreshold("time", total), text: PERIOD_INSIGHT[bestPeriod] });
  }
  const bestWeather = bestKey(weights?.weather, HABITAT_WEATHERS);
  if (bestWeather) {
    insights.push({ kind: "weather", requiredCells: insightThreshold("weather", total), text: WEATHER_INSIGHT[bestWeather] });
  }
  insights.push({
    kind: "biome",
    requiredCells: insightThreshold("biome", total),
    text: biomeInsight(habitatBiomes(speciesName))
  });
  return insights;
}

export function getUnlockedInsights(speciesName: string, save: SaveData = readSaveData()): SpeciesInsight[] {
  const { found } = getHabitatProgress(speciesName, save);
  return getSpeciesInsights(speciesName).filter(insight => found >= insight.requiredCells);
}

/** บันทึกการจับหนึ่งครั้ง คืนค่าว่าเป็นช่องใหม่หรือไม่ เพื่อให้ฉากแสดงผลฉลองได้ */
export function recordCatch(speciesName: string, cell: HabitatCell): { newCell: boolean; progress: HabitatProgress } {
  const save = readSaveData();
  const log = readSpeciesLog(save);
  const previous: SpeciesLogEntry = log[speciesName] ?? { cells: [], catchCount: 0 };
  const key = cellKey(cell);
  const newCell = !previous.cells.includes(key);
  const entry: SpeciesLogEntry = {
    cells: newCell ? [...previous.cells, key] : [...previous.cells],
    catchCount: previous.catchCount + 1,
    ...(previous.firstSeenDay !== undefined
      ? { firstSeenDay: previous.firstSeenDay }
      : save.worldDay !== undefined ? { firstSeenDay: save.worldDay } : {})
  };
  const speciesLog: SpeciesLog = { ...log, [speciesName]: entry };
  writeSaveData({ speciesLog });
  return { newCell, progress: getHabitatProgress(speciesName, { ...save, speciesLog }) };
}

/**
 * เซฟเก่าที่เคยค้นพบชนิดไว้แล้วต้องไม่เริ่มจากศูนย์
 * ให้ `catchCount` เท่ากับ 1 แต่ปล่อยช่องว่างไว้ เพราะบันทึกเก่าไม่ได้จดสภาพแวดล้อม
 * การเดาช่องย้อนหลังจะทำให้สมุดโกหกผู้เล่น
 */
export function migrateSpeciesLog(): void {
  const save = readSaveData();
  const discovered = save.discoveredSpecies ?? [];
  if (discovered.length === 0) return;
  const log = readSpeciesLog(save);
  const missing = discovered.filter(name => log[name] === undefined);
  if (missing.length === 0) return;
  const speciesLog: SpeciesLog = { ...log };
  missing.forEach(name => { speciesLog[name] = { cells: [], catchCount: 1 }; });
  writeSaveData({ speciesLog });
}
