import type { CharacterPreset } from "../types/character";
import type { AvatarBaseVariant } from "../types/avatar";

// ผูกฐานภาพกับรหัสเดิมอย่างชัดเจน ห้ามวนด้วยจำนวนฐานภาพที่เพิ่มขึ้นในอนาคต
const BASE_VARIANTS_BY_PRESET_ID: Record<string, AvatarBaseVariant> = {
  "male-1": "boy-a", "male-2": "boy-b", "male-3": "boy-c", "male-4": "boy-d",
  "male-5": "boy-a", "male-6": "boy-b", "male-7": "boy-c", "male-8": "boy-d",
  "male-9": "boy-a", "male-10": "boy-b",
  "female-1": "girl-a", "female-2": "girl-b", "female-3": "girl-c", "female-4": "girl-d",
  "female-5": "girl-a", "female-6": "girl-b", "female-7": "girl-c", "female-8": "girl-d",
  "female-9": "girl-a", "female-10": "girl-b"
};

const MALE_NAMES = [
  ["นที", "ส้มอ่าว", 0xffffff, 0xf3ae54], ["วายุ", "ฟ้าคราม", 0xeaf6ff, 0x77bde3],
  ["ต้นกล้า", "ใบไม้", 0xedffe9, 0x7fbd78], ["ภูผา", "ทรายทอง", 0xfff2d9, 0xc99b61],
  ["คราม", "น้ำลึก", 0xe6efff, 0x668bbd], ["ตะวัน", "แสงเช้า", 0xfff0e1, 0xe99758],
  ["เมฆ", "หมอกขาว", 0xf1f3f5, 0x99a6b0], ["ไผ่", "ป่าชายเลน", 0xe9f6df, 0x679d6d],
  ["สินธุ์", "คลื่นเงิน", 0xe9fbfa, 0x69b5b3], ["อรุณ", "ปะการัง", 0xffe9e4, 0xde8174]
] as const;

const FEMALE_NAMES = [
  ["สายชล", "ส้มอ่าว", 0xffffff, 0xf3ae54], ["ฟ้าใส", "ฟ้าคราม", 0xeaf6ff, 0x77bde3],
  ["ใบเฟิร์น", "ใบไม้", 0xedffe9, 0x7fbd78], ["มุก", "ทรายทอง", 0xfff2d9, 0xc99b61],
  ["น้ำฝน", "น้ำลึก", 0xe6efff, 0x668bbd], ["แสงดาว", "แสงเช้า", 0xfff0e1, 0xe99758],
  ["เมษา", "หมอกขาว", 0xf1f3f5, 0x99a6b0], ["บัว", "ป่าชายเลน", 0xe9f6df, 0x679d6d],
  ["ธารา", "คลื่นเงิน", 0xe9fbfa, 0x69b5b3], ["ปะการัง", "แนวปะการัง", 0xffe9e4, 0xde8174]
] as const;

function makePresets(
  gender: "male" | "female",
  entries: readonly (readonly [string, string, number, number])[]
): CharacterPreset[] {
  return entries.map(([name, theme, tint, accent], index) => ({
    id: `${gender}-${index + 1}`,
    gender,
    baseVariant: BASE_VARIANTS_BY_PRESET_ID[`${gender}-${index + 1}`],
    name,
    theme,
    tint,
    accent
  }));
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  ...makePresets("male", MALE_NAMES),
  ...makePresets("female", FEMALE_NAMES)
];

export const DEFAULT_CHARACTER_PRESET_ID = "male-1";
