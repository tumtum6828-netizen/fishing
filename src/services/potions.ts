import { SHOP_ITEMS, type ShopItem } from "../data/shopData";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export const POTION_ROUNDS_PER_BOTTLE = 5;

const potionItems = () => SHOP_ITEMS.filter(item => item.category === "potion");

function safeCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function readPotionStock(save: SaveData = readSaveData()): Record<string, number> {
  const stock: Record<string, number> = {};
  potionItems().forEach(item => {
    stock[item.id] = safeCount(save.ownedShopItems?.[item.id]);
  });
  return stock;
}

export function readActivePotion(save: SaveData = readSaveData()): {
  item?: ShopItem;
  usesRemaining: number;
} {
  const usesRemaining = safeCount(save.activePotionUsesRemaining);
  if (usesRemaining <= 0) return { usesRemaining: 0 };
  const item = potionItems().find(entry => entry.id === save.activePotionId);
  return item ? { item, usesRemaining } : { usesRemaining: 0 };
}

export function activatePotion(id: string): boolean {
  const save = readSaveData();
  const active = readActivePotion(save);
  if (active.item) return active.item.id === id;
  const item = potionItems().find(entry => entry.id === id);
  const stock = readPotionStock(save);
  if (!item || stock[id] <= 0) return false;

  const ownedShopItems = { ...(save.ownedShopItems ?? {}) };
  ownedShopItems[id] = Math.max(0, (ownedShopItems[id] ?? 0) - 1);
  writeSaveData({
    ownedShopItems,
    activePotionId: id,
    activePotionUsesRemaining: POTION_ROUNDS_PER_BOTTLE
  });
  return true;
}

export function consumeActivePotionRound(): { potionId?: string; usesRemaining: number } {
  const save = readSaveData();
  const active = readActivePotion(save);
  if (!active.item) return { usesRemaining: 0 };
  const usesRemaining = Math.max(0, active.usesRemaining - 1);
  writeSaveData({
    activePotionId: usesRemaining > 0 ? active.item.id : undefined,
    activePotionUsesRemaining: usesRemaining
  });
  return { potionId: active.item.id, usesRemaining };
}

