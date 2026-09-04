import type { FashionDefinition, FashionSlot } from "../types/fashion";

/**
 * เพิ่มเครื่องแต่งกายใหม่ = เพิ่มหนึ่งรายการที่นี่ + หนึ่งรายการใน `shopData.ts`
 * + ภาพใน `avatarData.ts` ตู้เสื้อผ้าจัดหน้าให้เองไม่จำกัดจำนวนต่อช่อง
 */
export const FASHION_DEFINITIONS: FashionDefinition[] = [
  {
    itemId: "straw-hat", slot: "hat", slotLabel: "หมวก", worldIcon: "👒",
    previewTexture: { key: "fashion-straw-hat", path: "/assets/equipment/straw-hat-v1.png" }
  },
  {
    itemId: "rain-coat", slot: "outfit", slotLabel: "ชุด", worldIcon: "🧥",
    previewTexture: { key: "fashion-rain-coat", path: "/assets/equipment/rain-coat-layer-v2.png" }
  }
];

export const FASHION_SLOTS: ReadonlyArray<{ id: FashionSlot; label: string; icon: string }> = [
  { id: "hat", label: "หมวก", icon: "👒" },
  { id: "outfit", label: "ชุด", icon: "👕" },
  { id: "shoes", label: "รองเท้า", icon: "👟" },
  { id: "gloves", label: "ถุงมือ", icon: "🧤" }
];

export function fashionItemsInSlot(slot: FashionSlot): FashionDefinition[] {
  return FASHION_DEFINITIONS.filter(definition => definition.slot === slot);
}
