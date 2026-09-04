export type RodUpgradeCost = {
  coins: number;
  materials: Array<{ name: string; amount: number }>;
};

export const ROD_UPGRADE_MAX_LEVEL = 5;

export const ROD_UPGRADE_COSTS: Record<number, RodUpgradeCost> = {
  1: { coins: 80, materials: [] },
  2: { coins: 140, materials: [{ name: "กระป๋องเก่า", amount: 1 }] },
  3: { coins: 240, materials: [{ name: "เศษอวน", amount: 1 }, { name: "ขวดพลาสติก", amount: 1 }] },
  4: { coins: 400, materials: [{ name: "เศษอวน", amount: 2 }, { name: "กระป๋องเก่า", amount: 2 }] }
};

export function getRodUpgradeBonuses(level: number): {
  lineResistanceMultiplier: number;
  reelPowerBonus: number;
  controlBonus: number;
  castDistanceBonus: number;
  luckBonus: number;
} {
  const steps = Math.max(0, Math.min(ROD_UPGRADE_MAX_LEVEL, level) - 1);
  return {
    lineResistanceMultiplier: 1 - steps * .025,
    reelPowerBonus: steps * .05,
    controlBonus: steps * .04,
    castDistanceBonus: steps * 2,
    luckBonus: steps * .005
  };
}
