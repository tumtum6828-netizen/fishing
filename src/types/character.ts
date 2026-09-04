import type { AvatarBaseVariant } from "./avatar";

export type CharacterGender = "male" | "female";

export type CharacterPreset = {
  id: string;
  gender: CharacterGender;
  baseVariant: AvatarBaseVariant;
  name: string;
  theme: string;
  tint: number;
  accent: number;
};

export type CharacterSelection = {
  presetId: string;
  /** ฐานภาพที่เลือกไว้ แยกจากแค็ตตาล็อกเพื่อไม่ให้เซฟเดิมเปลี่ยนหน้าตาตามการเพิ่มแบบใหม่ */
  baseVariant?: AvatarBaseVariant;
  playerName?: string;
  finalized?: boolean;
};
