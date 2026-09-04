import type { TimePeriod, WeatherId } from "./environmentData";
import type { HabitatBiome, InsightKind } from "../types/journal";

/** ลำดับที่ใช้แสดงในตารางสมุด และใช้คำนวณจำนวนช่องทั้งหมด */
export const HABITAT_PERIODS: readonly TimePeriod[] = ["morning", "day", "evening", "night"];
export const HABITAT_WEATHERS: readonly WeatherId[] = ["clear", "cloudy", "rain"];
export const HABITAT_BIOMES: readonly HabitatBiome[] = ["coast", "river"];

export const BIOME_LABELS: Record<HabitatBiome, string> = {
  coast: "ชายฝั่ง",
  river: "แม่น้ำ"
};

/**
 * ปลดล็อกคำสรุปนิสัยตามสัดส่วนของช่องที่ค้นพบ แต่ต้องอย่างน้อย 4 ช่องเสมอ
 * ใช้สัดส่วนเพราะชนิดที่อยู่ได้สองแหล่งน้ำมี 24 ช่อง ส่วนชนิดที่อยู่แหล่งเดียวมี 12 ช่อง
 * ถ้าใช้ตัวเลขตายตัว ชนิดที่อยู่แหล่งเดียวจะปลดล็อกง่ายเกินไป
 */
export const MIN_CELLS_FOR_INSIGHT = 4;
export const INSIGHT_UNLOCK_FRACTIONS: Record<InsightKind, number> = {
  time: .25,
  weather: .5,
  biome: .75
};

export type AreaRequirement = {
  /** จำนวนชนิดที่ต้องมีบันทึกนิเวศอย่างน้อยหนึ่งช่อง */
  speciesLogged?: number;
  /** จำนวนการ์ดที่ต้องเก็บครบทุกช่อง */
  cardsComplete?: number;
  /** บอกผู้เล่นว่าต้องทำอะไรถึงจะผ่าน เขียนให้เด็กอ่านแล้วรู้ว่าไปทำอะไรต่อ */
  hint: string;
};

/**
 * เงื่อนไขปลดล็อกพื้นที่ ตอนนี้**ตั้งใจให้ว่าง** จึงไม่มีพื้นที่ใดถูกล็อก
 *
 * เกมมีสองแผนที่ที่เดินถึงกันได้อยู่แล้ว การใส่เงื่อนไขย้อนหลังจะกั้นทางที่ผู้เล่นเดิมเคยเดินได้
 * ระบบตรวจต่อไว้พร้อมแล้ว ให้ใส่เงื่อนไขจริงตอนเพิ่มแผนที่ใหม่ ซึ่งยังไม่มีใครเคยเข้าถึง
 * ตัวอย่างเมื่อถึงเวลานั้น:
 *   "mangrove": { speciesLogged: 4, hint: "บันทึกนิเวศให้ครบ 4 ชนิดก่อนออกไปป่าชายเลน" }
 */
export const AREA_REQUIREMENTS: Record<string, AreaRequirement> = {};

export const HABITAT_COMPLETE_REWARD = {
  coins: 120,
  conservationPoints: 15,
  xp: 60
} as const;

/** ข้อความสรุปนิสัย เขียนแบบที่เด็กอ่านแล้วเอาไปลองได้ ไม่ใช่ตัวเลขความน่าจะเป็น */
export const PERIOD_INSIGHT: Record<TimePeriod, string> = {
  morning: "ชอบออกหากินตอนเช้า",
  day: "ออกหากินกลางวันมากที่สุด",
  evening: "ชอบออกหากินตอนเย็น",
  night: "ออกหากินตอนกลางคืน"
};

export const WEATHER_INSIGHT: Record<WeatherId, string> = {
  clear: "เจอง่ายที่สุดตอนฟ้าโปร่ง",
  cloudy: "ชอบวันที่เมฆมาก",
  rain: "ยิ่งฝนตกยิ่งเจอง่าย"
};

export function biomeInsight(biomes: readonly HabitatBiome[]): string {
  if (biomes.length >= 2) return "พบได้ทั้งชายฝั่งและแม่น้ำ";
  const only = biomes[0];
  return only ? `พบเฉพาะ${BIOME_LABELS[only]}` : "ยังไม่ทราบแหล่งที่อยู่";
}
