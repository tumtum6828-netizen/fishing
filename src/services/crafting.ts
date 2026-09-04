import { CRAFT_RECIPES, type CraftRecipe } from "../data/craftingData";
import { getAnglerLevel } from "../data/questData";
import { SHOP_ITEMS } from "../data/shopData";
import { BAIT_UNITS_PER_BUNDLE, readBaitStock } from "./bait";
import { readInventory } from "./inventory";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export type CraftCheck = {
  canCraft: boolean;
  reason: string;
};

export function checkRecipe(recipe: CraftRecipe, save: SaveData = readSaveData()): CraftCheck {
  const level = getAnglerLevel(save.anglerXp, save.collectionCount);
  if (level < recipe.requiredLevel) return { canCraft: false, reason: `ต้องถึง Lv.${recipe.requiredLevel}` };
  const output = SHOP_ITEMS.find(item => item.id === recipe.outputItemId);
  if (!output) return { canCraft: false, reason: "ไม่พบของรางวัล" };
  if (!output.stackable && (save.ownedShopItems?.[output.id] ?? 0) > 0) {
    return { canCraft: false, reason: "มีชิ้นนี้แล้ว" };
  }
  if ((save.coins ?? 0) < recipe.coinCost) return { canCraft: false, reason: "เหรียญไม่พอ" };
  const inventory = readInventory();
  const missing = recipe.materials.find(material => (inventory.trash[material.name] ?? 0) < material.amount);
  if (missing) return { canCraft: false, reason: `ขาด ${missing.name}` };
  return { canCraft: true, reason: "สร้างได้" };
}

export function craftRecipe(recipeId: string): CraftCheck {
  const recipe = CRAFT_RECIPES.find(entry => entry.id === recipeId);
  if (!recipe) return { canCraft: false, reason: "ไม่พบสูตร" };
  const save = readSaveData();
  const check = checkRecipe(recipe, save);
  if (!check.canCraft) return check;
  const output = SHOP_ITEMS.find(item => item.id === recipe.outputItemId);
  if (!output) return { canCraft: false, reason: "ไม่พบของรางวัล" };

  const inventory = readInventory();
  recipe.materials.forEach(material => {
    const remaining = Math.max(0, (inventory.trash[material.name] ?? 0) - material.amount);
    if (remaining > 0) inventory.trash[material.name] = remaining;
    else delete inventory.trash[material.name];
  });
  const ownedShopItems = { ...(save.ownedShopItems ?? {}) };
  ownedShopItems[output.id] = (ownedShopItems[output.id] ?? 0) + recipe.outputAmount;
  const baitStock = readBaitStock(save);
  if (output.category === "bait") {
    baitStock[output.id] = (baitStock[output.id] ?? 0) + recipe.outputAmount * BAIT_UNITS_PER_BUNDLE;
  }
  writeSaveData({
    coins: Math.max(0, save.coins ?? 0) - recipe.coinCost,
    inventory,
    ownedShopItems,
    baitStock
  });
  return { canCraft: true, reason: `ได้รับ ${recipe.outputLabel}` };
}
