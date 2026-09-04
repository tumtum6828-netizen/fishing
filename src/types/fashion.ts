export type FashionSlot = "hat" | "outfit" | "shoes" | "gloves";

export type EquippedFashion = Partial<Record<FashionSlot, string>>;

export type FashionDefinition = {
  itemId: string;
  slot: FashionSlot;
  slotLabel: string;
  worldIcon: string;
  /** ภาพตัวอย่างในตู้เสื้อผ้า ถ้าไม่มีจะใช้ `worldIcon` แทน */
  previewTexture?: { key: string; path: string };
};
