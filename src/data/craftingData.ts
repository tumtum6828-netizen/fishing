export type CraftMaterial = {
  name: string;
  amount: number;
};

export type CraftRecipe = {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredLevel: number;
  coinCost: number;
  materials: CraftMaterial[];
  outputItemId: string;
  outputAmount: number;
  outputLabel: string;
};

export const TRASH_LOOT_BY_BIOME: Record<"coast" | "river", string[]> = {
  coast: ["กระป๋องเก่า", "ขวดพลาสติก", "เศษอวน", "เศษอวน"],
  river: ["ขวดพลาสติก", "กิ่งไม้ลอยน้ำ", "กระป๋องเก่า", "กิ่งไม้ลอยน้ำ"]
};

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: "clean-water-bait",
    name: "ชุดเหยื่อรักษ์น้ำ",
    icon: "🪱",
    description: "คัดแยกวัสดุที่เก็บจากน้ำ แล้วนำไปแลกเป็นเหยื่อพื้นฐาน",
    requiredLevel: 1,
    coinCost: 0,
    materials: [{ name: "กระป๋องเก่า", amount: 1 }, { name: "ขวดพลาสติก", amount: 1 }],
    outputItemId: "worm-bundle",
    outputAmount: 1,
    outputLabel: "เหยื่อไส้เดือน 10 ชิ้น"
  },
  {
    id: "recycled-focus-tonic",
    name: "ยาสมาธิชุมชน",
    icon: "🎯",
    description: "ส่งขวดที่เก็บได้ให้ลุงมนัสล้างและบรรจุยาสมาธิให้ใหม่",
    requiredLevel: 2,
    coinCost: 30,
    materials: [{ name: "ขวดพลาสติก", amount: 2 }],
    outputItemId: "focus-tonic",
    outputAmount: 1,
    outputLabel: "ยาสมาธิ 1 ขวด"
  },
  {
    id: "crafted-reinforced-line",
    name: "เอ็นถักเสริมแรง",
    icon: "🧵",
    description: "นำเศษอวนที่เก็บได้มาคัดเส้นใยและถักเป็นเอ็นใหม่ ลดแรงตึงเพิ่ม 8%",
    requiredLevel: 2,
    coinCost: 100,
    materials: [{ name: "เศษอวน", amount: 2 }, { name: "กระป๋องเก่า", amount: 1 }],
    outputItemId: "reinforced-line",
    outputAmount: 1,
    outputLabel: "เอ็นถักเสริมแรง 1 ชิ้น"
  },
  {
    id: "recycled-line-coating",
    name: "น้ำยาเคลือบเอ็น",
    icon: "🧪",
    description: "แลกวัสดุสะอาดและค่าผสม เพื่อทำน้ำยาช่วยลดการเพิ่มของแรงตึง 5 รอบ",
    requiredLevel: 3,
    coinCost: 50,
    materials: [{ name: "เศษอวน", amount: 2 }, { name: "ขวดพลาสติก", amount: 1 }],
    outputItemId: "line-coating",
    outputAmount: 1,
    outputLabel: "น้ำยาเคลือบเอ็น 1 ขวด"
  }
];
