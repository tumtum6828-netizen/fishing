import { LEVEL_REWARDS } from "../data/levelRewards";
import { getAnglerLevel } from "../data/questData";
import { SHOP_ITEMS } from "../data/shopData";
import { readSaveData, writeSaveData } from "./save";
import { BAIT_UNITS_PER_BUNDLE, readBaitStock } from "./bait";

export function readClaimedLevelRewards(): number[] {
  const claimed = readSaveData().claimedLevelRewards;
  if (!Array.isArray(claimed)) return [];
  return Array.from(new Set(claimed
    .map(Number)
    .filter(level => Number.isInteger(level) && level > 0)));
}

export function claimLevelReward(level: number): boolean {
  const reward = LEVEL_REWARDS.find(entry => entry.level === level);
  if (!reward) return false;

  const save = readSaveData();
  const currentLevel = getAnglerLevel(save.anglerXp, save.collectionCount);
  const claimed = readClaimedLevelRewards();
  if (currentLevel < level || claimed.includes(level)) return false;

  const ownedShopItems = { ...(save.ownedShopItems ?? {}) };
  const baitStock = readBaitStock(save);
  if (reward.item) {
    const shopItem = SHOP_ITEMS.find(item => item.id === reward.item?.id);
    ownedShopItems[reward.item.id] = shopItem?.stackable
      ? (ownedShopItems[reward.item.id] ?? 0) + reward.item.count
      : Math.max(ownedShopItems[reward.item.id] ?? 0, reward.item.count);
    if (shopItem?.category === "bait") {
      baitStock[reward.item.id] = (baitStock[reward.item.id] ?? 0)
        + reward.item.count * BAIT_UNITS_PER_BUNDLE;
    }
  }

  writeSaveData({
    coins: Math.max(0, save.coins ?? 0) + reward.coins,
    ownedShopItems,
    baitStock,
    claimedLevelRewards: [...claimed, level].sort((a, b) => a - b)
  });
  return true;
}
