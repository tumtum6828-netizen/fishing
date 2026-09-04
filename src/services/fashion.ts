import { FASHION_DEFINITIONS } from "../data/fashionData";
import type { EquippedFashion, FashionSlot } from "../types/fashion";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export function readEquippedFashion(save: SaveData = readSaveData()): EquippedFashion {
  const equipped: EquippedFashion = {};
  FASHION_DEFINITIONS.forEach(definition => {
    if (save.equippedFashion?.[definition.slot] !== definition.itemId) return;
    if ((save.ownedShopItems?.[definition.itemId] ?? 0) <= 0) return;
    equipped[definition.slot] = definition.itemId;
  });
  return equipped;
}

export function toggleFashionItem(itemId: string): { ok: boolean; message: string } {
  const definition = FASHION_DEFINITIONS.find(item => item.itemId === itemId);
  if (!definition) return { ok: false, message: "ไม่พบเครื่องแต่งกาย" };
  const save = readSaveData();
  if ((save.ownedShopItems?.[itemId] ?? 0) <= 0) {
    return { ok: false, message: "ยังไม่ได้เป็นเจ้าของชิ้นนี้" };
  }
  const equipped = readEquippedFashion(save);
  const removing = equipped[definition.slot] === itemId;
  if (removing) delete equipped[definition.slot];
  else equipped[definition.slot] = itemId;
  writeSaveData({ equippedFashion: equipped });
  return { ok: true, message: removing ? `ถอด${definition.slotLabel}แล้ว` : `สวม${definition.slotLabel}แล้ว` };
}

export function clearFashionSlot(slot: FashionSlot): void {
  const equipped = readEquippedFashion();
  delete equipped[slot];
  writeSaveData({ equippedFashion: equipped });
}
