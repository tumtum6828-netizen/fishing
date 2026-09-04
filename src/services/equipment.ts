import { RODS, type RodProfile } from "../data/gameData";
import { getAnglerLevel } from "../data/questData";
import { readSaveData, type SaveData } from "./save";
import {
  getRodUpgradeBonuses, ROD_UPGRADE_COSTS, ROD_UPGRADE_MAX_LEVEL, type RodUpgradeCost
} from "../data/equipmentUpgradeData";
import { readInventory } from "./inventory";
import { writeSaveData } from "./save";

export type FishingEquipment = {
  rodIndex: number;
  rod: RodProfile;
  lineResistance: number;
  reelPower: number;
  control: number;
  maxCastDistance: number;
  luckBonus: number;
  reinforcedLine: boolean;
  upgradeLevel: number;
};

export type RodUpgradeCheck = {
  canUpgrade: boolean;
  reason: string;
  currentLevel: number;
  cost?: RodUpgradeCost;
};

export function getRodUpgradeLevel(rodId: string, save: SaveData = readSaveData()): number {
  const value = Number(save.rodUpgradeLevels?.[rodId]);
  return Number.isFinite(value)
    ? Math.max(1, Math.min(ROD_UPGRADE_MAX_LEVEL, Math.floor(value)))
    : 1;
}

export function checkRodUpgrade(rodId: string, save: SaveData = readSaveData()): RodUpgradeCheck {
  const index = RODS.findIndex(rod => rod.id === rodId);
  const currentLevel = getRodUpgradeLevel(rodId, save);
  if (index < 0) return { canUpgrade: false, reason: "ไม่พบคันเบ็ด", currentLevel };
  if (!isRodUnlocked(index, save)) return { canUpgrade: false, reason: getRodLockReason(index, save), currentLevel };
  if (currentLevel >= ROD_UPGRADE_MAX_LEVEL) return { canUpgrade: false, reason: "อัปเกรดสูงสุดแล้ว", currentLevel };
  const cost = ROD_UPGRADE_COSTS[currentLevel];
  if (!cost) return { canUpgrade: false, reason: "ไม่มีข้อมูลอัปเกรด", currentLevel };
  if ((save.coins ?? 0) < cost.coins) return { canUpgrade: false, reason: "เหรียญไม่พอ", currentLevel, cost };
  const inventory = readInventory();
  const missing = cost.materials.find(material => (inventory.trash[material.name] ?? 0) < material.amount);
  if (missing) return { canUpgrade: false, reason: `ขาด ${missing.name} ×${missing.amount}`, currentLevel, cost };
  return { canUpgrade: true, reason: "อัปเกรดได้", currentLevel, cost };
}

export function upgradeRod(rodId: string): RodUpgradeCheck {
  const save = readSaveData();
  const check = checkRodUpgrade(rodId, save);
  if (!check.canUpgrade || !check.cost) return check;
  const inventory = readInventory();
  check.cost.materials.forEach(material => {
    const remaining = Math.max(0, (inventory.trash[material.name] ?? 0) - material.amount);
    if (remaining > 0) inventory.trash[material.name] = remaining;
    else delete inventory.trash[material.name];
  });
  const rodUpgradeLevels = {
    ...(save.rodUpgradeLevels ?? {}),
    [rodId]: check.currentLevel + 1
  };
  writeSaveData({
    coins: Math.max(0, save.coins ?? 0) - check.cost.coins,
    inventory,
    rodUpgradeLevels
  });
  return {
    canUpgrade: true,
    reason: `อัปเกรดเป็น +${check.currentLevel + 1} แล้ว`,
    currentLevel: check.currentLevel + 1,
    cost: ROD_UPGRADE_COSTS[check.currentLevel + 1]
  };
}

export function isRodUnlocked(index: number, save: SaveData = readSaveData()): boolean {
  const rod = RODS[index];
  if (!rod) return false;
  if (rod.shopItemId) return (save.ownedShopItems?.[rod.shopItemId] ?? 0) > 0;
  return getAnglerLevel(save.anglerXp, save.collectionCount) >= rod.unlockLevel;
}

export function getEquippedRodIndex(save: SaveData = readSaveData()): number {
  const requested = Math.max(0, Math.min(save.rodIndex ?? 0, RODS.length - 1));
  return isRodUnlocked(requested, save) ? requested : 0;
}

export function getRodLockReason(index: number, save: SaveData = readSaveData()): string {
  const rod = RODS[index];
  if (!rod || isRodUnlocked(index, save)) return "";
  return rod.shopItemId ? "ซื้อได้ที่ร้านลุงมนัส" : `ปลดล็อกเมื่อถึง Lv.${rod.unlockLevel}`;
}

export function getFishingEquipment(save: SaveData = readSaveData()): FishingEquipment {
  const rodIndex = getEquippedRodIndex(save);
  const rod = RODS[rodIndex];
  const reinforcedLine = (save.ownedShopItems?.["reinforced-line"] ?? 0) > 0;
  const upgradeLevel = getRodUpgradeLevel(rod.id, save);
  const bonuses = getRodUpgradeBonuses(upgradeLevel);
  return {
    rodIndex,
    rod,
    lineResistance: rod.lineResistance * bonuses.lineResistanceMultiplier * (reinforcedLine ? .92 : 1),
    reelPower: rod.reelPower + bonuses.reelPowerBonus,
    control: rod.control + bonuses.controlBonus,
    maxCastDistance: rod.maxCastDistance + bonuses.castDistanceBonus,
    luckBonus: rod.luckBonus + bonuses.luckBonus,
    reinforcedLine,
    upgradeLevel
  };
}
