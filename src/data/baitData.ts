export type BaitEffect = {
  id: string;
  effectLabel: string;
  speciesWeights: Record<string, number>;
  trashChanceMultiplier: number;
  waitTimeMultiplier: number;
  rareWeightBonus: number;
  legendaryChanceBonus: number;
};

export const BAIT_EFFECTS: Record<string, BaitEffect> = {
  "worm-bundle": {
    id: "worm-bundle",
    effectLabel: "ผลในเกม: ดึงดูดปลากระบอก • ลดโอกาสติดขยะ",
    speciesWeights: {
      "ปลากระบอก": 3.2, "ปลากะพงขาว": .75, "ปลาทู": .55,
      "กุ้งก้ามกราม": 1.7, "ปูม้า": .8, "หอยแครง": 1.1, "หอยกาบเอเชีย": 1.25
    },
    trashChanceMultiplier: .72,
    waitTimeMultiplier: .9,
    rareWeightBonus: 0,
    legendaryChanceBonus: 0
  },
  "fresh-shrimp": {
    id: "fresh-shrimp",
    effectLabel: "ผลในเกม: ดึงดูดปลากะพงและปลาทู • เพิ่มโอกาสปลาหายาก",
    speciesWeights: {
      "ปลากระบอก": .55, "ปลากะพงขาว": 3.4, "ปลาทู": 2.15,
      "กุ้งก้ามกราม": 1.6, "ปูม้า": 2.6, "หอยแครง": .45, "หอยกาบเอเชีย": .4
    },
    trashChanceMultiplier: .42,
    waitTimeMultiplier: .72,
    rareWeightBonus: .28,
    legendaryChanceBonus: .07
  },
  none: {
    id: "none",
    effectLabel: "ผลในเกม: รอนานขึ้น • มีโอกาสติดขยะสูง",
    speciesWeights: {},
    trashChanceMultiplier: 1.45,
    waitTimeMultiplier: 1.25,
    rareWeightBonus: 0,
    legendaryChanceBonus: 0
  }
};

export function getBaitEffect(id?: string): BaitEffect {
  return BAIT_EFFECTS[id ?? "none"] ?? BAIT_EFFECTS.none;
}
