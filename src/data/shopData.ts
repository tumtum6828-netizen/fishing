export type ShopCategory = "equipment" | "bait" | "potion" | "fashion";

export type ShopItem = {
  id: string;
  name: string;
  icon: string;
  category: ShopCategory;
  description: string;
  price: number;
  unlockLevel: number;
  stackable: boolean;
};

export const SHOP_CATEGORIES: Array<{ id: ShopCategory; label: string; icon: string }> = [
  { id: "equipment", label: "อุปกรณ์", icon: "🎣" },
  { id: "bait", label: "เหยื่อ", icon: "🪱" },
  { id: "potion", label: "ยา", icon: "🧪" },
  { id: "fashion", label: "เสื้อผ้า", icon: "👕" }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "reinforced-line",
    name: "เอ็นถักเสริมแรง",
    icon: "🧵",
    category: "equipment",
    description: "ลดความตึงสายที่เพิ่มจากแรงดิ้นของสัตว์น้ำ 8%",
    price: 280,
    unlockLevel: 2,
    stackable: false
  },
  {
    id: "fiberglass-rod",
    name: "เบ็ดไฟเบอร์",
    icon: "🎣",
    category: "equipment",
    description: "รองรับสัตว์น้ำระดับหายากและชนิดที่ออกตัวเร็ว",
    price: 650,
    unlockLevel: 3,
    stackable: false
  },
  {
    id: "worm-bundle",
    name: "มัดไส้เดือน ×10",
    icon: "🪱",
    category: "bait",
    description: "ผลในเกม: ดึงดูดปลากระบอก และลดโอกาสติดขยะ",
    price: 40,
    unlockLevel: 1,
    stackable: true
  },
  {
    id: "fresh-shrimp",
    name: "กุ้งฝอยสด ×10",
    icon: "🦐",
    category: "bait",
    description: "ผลในเกม: ดึงดูดปลากะพงและปลาทู เพิ่มโอกาสปลาหายาก",
    price: 160,
    unlockLevel: 4,
    stackable: true
  },
  {
    id: "focus-tonic",
    name: "ยาสมาธิ",
    icon: "🎯",
    category: "potion",
    description: "ขยายแถบเขียวและเหลืองตอนเหวี่ยง เป็นเวลา 5 รอบ",
    price: 120,
    unlockLevel: 2,
    stackable: true
  },
  {
    id: "line-coating",
    name: "น้ำยาเคลือบเอ็น",
    icon: "🧪",
    category: "potion",
    description: "ทำให้ความตึงสายเพิ่มช้าลง เป็นเวลา 5 รอบ",
    price: 150,
    unlockLevel: 3,
    stackable: true
  },
  {
    id: "straw-hat",
    name: "หมวกฟางริมอ่าว",
    icon: "👒",
    category: "fashion",
    description: "เครื่องแต่งกายเพื่อความสวยงาม ไม่มีค่าสถานะ",
    price: 250,
    unlockLevel: 1,
    stackable: false
  },
  {
    id: "rain-coat",
    name: "ชุดกันฝนสีคราม",
    icon: "🧥",
    category: "fashion",
    description: "เครื่องแต่งกายเพื่อความสวยงาม ไม่มีค่าสถานะ",
    price: 450,
    unlockLevel: 4,
    stackable: false
  }
];
