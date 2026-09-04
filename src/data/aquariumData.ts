export type AquariumDecoration = {
  id: "water-plants" | "smooth-stones" | "treasure-chest";
  name: string;
  icon: string;
  unlockLevel: number;
};

export const AQUARIUM_DECORATIONS: AquariumDecoration[] = [
  { id: "water-plants", name: "ไม้น้ำ", icon: "🌿", unlockLevel: 1 },
  { id: "smooth-stones", name: "ก้อนหินลำธาร", icon: "🪨", unlockLevel: 3 },
  { id: "treasure-chest", name: "หีบสมบัติจิ๋ว", icon: "🧰", unlockLevel: 5 }
];

export const AQUARIUM_MAX_CAPACITY = 6;
export const AQUARIUM_MINUTES_TO_DIRTY = 5 * 1440;
export const AQUARIUM_MINUTES_TO_HUNGRY = 3 * 1440;

export function getAquariumCapacity(level: number): number {
  return Math.min(AQUARIUM_MAX_CAPACITY, 1 + Math.floor((Math.max(1, level) - 1) / 2));
}
