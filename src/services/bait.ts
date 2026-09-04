import { SHOP_ITEMS, type ShopItem } from "../data/shopData";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export const BAIT_UNITS_PER_BUNDLE = 10;

const baitItems = () => SHOP_ITEMS.filter(item => item.category === "bait");

function safeCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function readBaitStock(save: SaveData = readSaveData()): Record<string, number> {
  const stock: Record<string, number> = {};
  baitItems().forEach(item => {
    const hasStoredValue = Object.prototype.hasOwnProperty.call(save.baitStock ?? {}, item.id);
    stock[item.id] = hasStoredValue
      ? safeCount(save.baitStock?.[item.id])
      : safeCount(save.ownedShopItems?.[item.id]) * BAIT_UNITS_PER_BUNDLE;
  });
  return stock;
}

export function readSelectedBait(save: SaveData = readSaveData()): { item?: ShopItem; count: number } {
  const stock = readBaitStock(save);
  if (save.selectedBaitId === "none") return { count: 0 };
  const available = baitItems().filter(item => stock[item.id] > 0);
  const item = available.find(bait => bait.id === save.selectedBaitId) ?? available[0];
  return { item, count: item ? stock[item.id] : 0 };
}

export function setSelectedBait(id: string): void {
  if (id === "none") {
    writeSaveData({ selectedBaitId: "none" });
    return;
  }
  const save = readSaveData();
  if (readBaitStock(save)[id] > 0 && baitItems().some(item => item.id === id)) {
    writeSaveData({ selectedBaitId: id });
  }
}

export function consumeSelectedBait(): { baitId?: string; remaining: number; selectedBaitId: string } {
  const save = readSaveData();
  const selected = readSelectedBait(save);
  if (!selected.item || selected.count <= 0) {
    writeSaveData({ selectedBaitId: "none" });
    return { remaining: 0, selectedBaitId: "none" };
  }

  const stock = readBaitStock(save);
  const baitId = selected.item.id;
  stock[baitId] = Math.max(0, stock[baitId] - 1);
  const selectedBaitId = stock[baitId] > 0 ? baitId : "none";
  writeSaveData({ baitStock: stock, selectedBaitId });
  return { baitId, remaining: stock[baitId], selectedBaitId };
}
