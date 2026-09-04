export type LevelReward = {
  level: number;
  coins: number;
  item?: {
    id: string;
    name: string;
    icon: string;
    count: number;
  };
};

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 1, coins: 50, item: { id: "worm-bundle", name: "มัดไส้เดือน", icon: "🪱", count: 1 } },
  { level: 2, coins: 100, item: { id: "focus-tonic", name: "ยาสมาธิ", icon: "🎯", count: 1 } },
  { level: 3, coins: 150, item: { id: "line-coating", name: "น้ำยาเคลือบเอ็น", icon: "🧪", count: 1 } },
  { level: 4, coins: 250, item: { id: "fresh-shrimp", name: "กุ้งฝอยสด", icon: "🦐", count: 1 } },
  { level: 5, coins: 400, item: { id: "rain-coat", name: "ชุดกันฝนสีคราม", icon: "🧥", count: 1 } }
];
