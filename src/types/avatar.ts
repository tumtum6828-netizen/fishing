import type { FashionSlot } from "./fashion";

export type AvatarPose = "idle" | "walk";
export type AvatarDrawLayer = "behind" | "front";
export type AvatarBaseVariant =
  | "boy-a" | "boy-b" | "boy-c" | "boy-d"
  | "girl-a" | "girl-b" | "girl-c" | "girl-d";

/**
 * จุดยึด "หัว" ของภาพฐานหนึ่งท่า วัดเป็นสัดส่วนของผืนภาพ
 * ใช้ให้หมวกและของสวมหัวเกาะหัวจริงของแต่ละฐาน แทนการอิงสัดส่วนกรอบตัวละครค่าเดียวทั้งเกม
 */
export type AvatarHeadAnchor = {
  /** กึ่งกลางหัวตามแนวนอน */
  cx: number;
  /** ขอบบนสุดของหัว */
  top: number;
  /** ความกว้างหัวที่จุดกว้างสุด */
  width: number;
};

export type AvatarTextureAsset = {
  key: string;
  path: string;
  head?: AvatarHeadAnchor;
};

export type AvatarCosmeticLayer = {
  drawLayer: AvatarDrawLayer;
  textures: Partial<Record<AvatarPose, AvatarTextureAsset>>;
  /**
   * ตำแหน่งเทียบกับกรอบตัวละคร ค่า x/y คือจุดกึ่งกลางของชิ้น วัดจากมุมซ้ายบนของกรอบ
   * ไม่ระบุเลย = วางทับกรอบตัวละคร 1:1 สำหรับภาพที่วาดบนผืนเดียวกับตัวละครฐาน
   * ระบุเฉพาะ `width` = คงสัดส่วนจริงของภาพ ใช้กับภาพเดี่ยวที่ผืนไม่เท่าตัวละคร
   * ระบุทั้ง `width` และ `height` = ยืดตามที่สั่ง ใช้เมื่อจงใจเท่านั้น
   */
  placement?: {
    /** เกาะจุดยึดของฐานแทนกรอบตัวละคร ทำให้ชิ้นเดียวใช้ได้ถูกต้องกับทุกฐานและทุกท่า */
    anchor?: "head";
    /** ความกว้างเทียบกับความกว้างหัว ใช้คู่กับ anchor */
    widthScale?: number;
    /** เลื่อนลงจากขอบบนของหัว เป็นสัดส่วนความสูงกรอบ ใช้คู่กับ anchor */
    offsetY?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
};

export type AvatarCosmeticVisual = {
  itemId: string;
  slot: FashionSlot;
  layers?: AvatarCosmeticLayer[];
  /** ใช้เฉพาะของที่เปลี่ยนทรงเงาตัวละครมาก และควรเลิกใช้เมื่อมีไฟล์ตัวละครแยกชิ้นครบ */
  poseBaseOverrides?: Partial<Record<AvatarPose, AvatarTextureAsset>>;
  /** สะพานชั่วคราวสำหรับภาพฐานแบน เมื่อเครื่องแต่งกายแบบเต็มตัวต้องใช้ร่วมกับชิ้นอื่น */
  combinationPoseBaseOverrides?: Array<{
    withItemIds: string[];
    textures: Partial<Record<AvatarPose, AvatarTextureAsset>>;
  }>;
};
