export type FishProfile = {
  name: string;
  kind: "fish" | "crustacean" | "mollusk";
  behavior: string;
  stamina: number;
  tensionFactor: number;
  runFactor: number;
  swimFactor: number;
  turnChance: number;
  burstRange: [number, number];
  restRange: [number, number];
};

export type RodProfile = {
  id: "bamboo" | "fiberglass" | "deep-sea";
  name: string;
  level: number;
  unlockLevel: number;
  shopItemId?: string;
  allowedFish: number[];
  allowsLegendary: boolean;
  lineResistance: number;
  reelPower: number;
  control: number;
  maxCastDistance: number;
  luckBonus: number;
};

export type SpeciesInfo = {
  weight: [number, number];
  length: [number, number];
  fact: string;
};

export const FISH_PROFILES: FishProfile[] = [
  {
    name: "ปลากระบอก", kind: "fish", behavior: "สงบ", stamina: 72,
    tensionFactor: .72, runFactor: .7, swimFactor: .8, turnChance: .38,
    burstRange: [.45, .8], restRange: [1.8, 2.8]
  },
  {
    name: "ปลากะพงขาว", kind: "fish", behavior: "นักวิ่ง", stamina: 100,
    tensionFactor: 1.08, runFactor: 1.55, swimFactor: 1.25, turnChance: .45,
    burstRange: [.8, 1.35], restRange: [1.05, 1.65]
  },
  {
    name: "ปลาทู", kind: "fish", behavior: "สลับทิศ", stamina: 84,
    tensionFactor: .9, runFactor: 1, swimFactor: 1.15, turnChance: .92,
    burstRange: [.4, .72], restRange: [.8, 1.3]
  },
  {
    name: "กุ้งก้ามกราม", kind: "crustacean", behavior: "ถอยพุ่ง", stamina: 88,
    tensionFactor: .9, runFactor: 1.05, swimFactor: 1.08, turnChance: .7,
    burstRange: [.45, .85], restRange: [1.2, 1.9]
  },
  {
    name: "ปูม้า", kind: "crustacean", behavior: "เกาะพื้น", stamina: 96,
    tensionFactor: 1.02, runFactor: .82, swimFactor: .72, turnChance: .42,
    burstRange: [.62, 1.05], restRange: [1.25, 2]
  },
  {
    name: "หอยแครง", kind: "mollusk", behavior: "หนัก", stamina: 58,
    tensionFactor: .74, runFactor: .35, swimFactor: .28, turnChance: .12,
    burstRange: [.28, .5], restRange: [1.8, 2.6]
  },
  {
    name: "หอยกาบเอเชีย", kind: "mollusk", behavior: "หนัก", stamina: 52,
    tensionFactor: .68, runFactor: .3, swimFactor: .25, turnChance: .1,
    burstRange: [.25, .46], restRange: [1.9, 2.8]
  }
];

export const LEGENDARY_FISH: FishProfile = {
  name: "ปลากระโทงดาบ", kind: "fish", behavior: "ตำนาน", stamina: 118,
  tensionFactor: 1.12, runFactor: 1.45, swimFactor: 1.3, turnChance: .68,
  burstRange: [.72, 1.25], restRange: [.95, 1.5]
};

export const RODS: RodProfile[] = [
  {
    id: "bamboo", name: "คันไม้ไผ่", level: 1, unlockLevel: 1,
    allowedFish: [0, 5, 6], allowsLegendary: false,
    lineResistance: 1, reelPower: 1, control: 1, maxCastDistance: 50, luckBonus: 0
  },
  {
    id: "fiberglass", name: "คันไฟเบอร์", level: 2, unlockLevel: 3, shopItemId: "fiberglass-rod",
    allowedFish: [0, 1, 2, 3, 4, 5, 6], allowsLegendary: false,
    lineResistance: .9, reelPower: 1.16, control: 1.12, maxCastDistance: 60, luckBonus: .05
  },
  {
    id: "deep-sea", name: "คันทะเลลึก", level: 3, unlockLevel: 5,
    allowedFish: [0, 1, 2, 3, 4, 5, 6], allowsLegendary: true,
    lineResistance: .8, reelPower: 1.32, control: 1.22, maxCastDistance: 70, luckBonus: .12
  }
];

export const SPECIES_INFO: Record<string, SpeciesInfo> = {
  "ปลากระบอก": {
    weight: [.35, 2.2], length: [24, 65],
    fact: "มักพบเป็นฝูงตามชายฝั่งและบริเวณน้ำกร่อย"
  },
  "ปลากะพงขาว": {
    weight: [2, 13], length: [48, 125],
    fact: "สามารถอาศัยได้ทั้งน้ำจืด น้ำกร่อย และทะเล"
  },
  "ปลาทู": {
    weight: [.15, .75], length: [18, 38],
    fact: "เป็นปลาทะเลที่มักว่ายรวมกันเป็นฝูง"
  },
  "กุ้งก้ามกราม": {
    weight: [.12, 1.5], length: [10, 32],
    fact: "วัยโตอาศัยในน้ำจืด แต่ตัวอ่อนต้องพึ่งบริเวณน้ำกร่อย"
  },
  "ปูม้า": {
    weight: [.1, .9], length: [7, 20],
    fact: "ขาคู่สุดท้ายแบนคล้ายพาย ช่วยให้ว่ายน้ำได้คล่อง"
  },
  "หอยแครง": {
    weight: [.02, .09], length: [3, 6],
    fact: "เป็นหอยสองฝาที่มักอาศัยตามพื้นโคลนบริเวณชายฝั่ง"
  },
  "หอยกาบเอเชีย": {
    weight: [.01, .06], length: [2, 5],
    fact: "มักฝังตัวในทรายหรือกรวดละเอียดตามแม่น้ำและทะเลสาบน้ำจืด"
  },
  "ปลากระโทงดาบ": {
    weight: [55, 145], length: [185, 360],
    fact: "มีจะงอยปากยาวคล้ายดาบและอาศัยในทะเลเปิด"
  }
};
