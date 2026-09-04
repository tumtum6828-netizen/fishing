import type { TimePeriod, WeatherId } from "../data/environmentData";

/** ตรงกับ `FishingBiome` ใน services/fishSelection แต่ประกาศแยกไว้เพื่อไม่ให้ types อ้างถึง services */
export type HabitatBiome = "coast" | "river";

export type HabitatCell = {
  biome: HabitatBiome;
  period: TimePeriod;
  weather: WeatherId;
};

export type SpeciesLogEntry = {
  /** ช่องที่เคยพบ เก็บเป็น "biome:period:weather" ให้ JSON เล็กและเทียบง่าย ไม่ซ้ำกัน */
  cells: string[];
  catchCount: number;
  /** worldDay ที่พบครั้งแรก ใช้แสดงในสมุดเท่านั้น ไม่ใช้คำนวณอะไร */
  firstSeenDay?: number;
};

export type SpeciesLog = Record<string, SpeciesLogEntry>;

export type HabitatProgress = {
  found: number;
  total: number;
  complete: boolean;
};

export type InsightKind = "time" | "weather" | "biome";

export type SpeciesInsight = {
  kind: InsightKind;
  /** จำนวนช่องที่ต้องค้นพบก่อนถึงจะเห็นข้อความนี้ */
  requiredCells: number;
  text: string;
};
