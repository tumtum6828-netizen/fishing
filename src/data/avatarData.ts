import type { AvatarBaseVariant, AvatarCosmeticVisual, AvatarPose, AvatarTextureAsset } from "../types/avatar";
import type { CharacterGender } from "../types/character";

export const AVATAR_PREVIEW_MOTION = {
  frameMs: 165,
  bobPeriodMs: 105,
  bobHeight: 2
} as const;

/**
 * `head` วัดจากไฟล์ภาพจริงด้วย canvas ไม่ใช่ค่าประมาณ
 * ค่าต่างกันจริงระหว่างฐาน: ขอบบนหัวห่างกันได้ถึง 4.5% ของความสูง และหัวกว้างต่างกันถึง 33%
 * ถ้าเพิ่มฐานใหม่ ต้องวัดค่าใหม่ด้วย ไม่งั้นของสวมหัวจะเพี้ยนเฉพาะฐานนั้น
 */
export const AVATAR_BASE_TEXTURES: Record<AvatarBaseVariant, Record<AvatarPose, AvatarTextureAsset>> = {
  "boy-a": {
    idle: { key: "player-boy-idle", path: "/assets/characters/player-chibi-v1.png", head: { cx: 0.498, top: 0.0117, width: 0.457 } },
    walk: { key: "player-boy-walk-a", path: "/assets/characters/player-walk-a-v2.png", head: { cx: 0.4917, top: 0.0202, width: 0.4678 } }
  },
  "boy-b": {
    idle: { key: "player-boy-b-idle", path: "/assets/characters/player-boy-b-idle-v1.png", head: { cx: 0.4844, top: 0.0208, width: 0.4102 } },
    walk: { key: "player-boy-b-walk", path: "/assets/characters/player-boy-b-walk-v1.png", head: { cx: 0.4873, top: 0.0156, width: 0.4219 } }
  },
  "boy-c": {
    idle: { key: "player-boy-c-idle", path: "/assets/characters/player-boy-c-idle-v1.png", head: { cx: 0.4854, top: 0.0189, width: 0.4648 } },
    walk: { key: "player-boy-c-walk", path: "/assets/characters/player-boy-c-walk-v1.png", head: { cx: 0.4917, top: 0.0195, width: 0.4678 } }
  },
  "boy-d": {
    idle: { key: "player-boy-d-idle", path: "/assets/characters/player-boy-d-idle-v1.png", head: { cx: 0.4941, top: 0.0475, width: 0.377 } },
    walk: { key: "player-boy-d-walk", path: "/assets/characters/player-boy-d-walk-v1.png", head: { cx: 0.4941, top: 0.041, width: 0.375 } }
  },
  "girl-a": {
    idle: { key: "player-girl-idle", path: "/assets/characters/player-girl-idle-v2.png", head: { cx: 0.4902, top: 0.0111, width: 0.4922 } },
    walk: { key: "player-girl-walk-a", path: "/assets/characters/player-girl-walk-a-v2.png", head: { cx: 0.4941, top: 0.0059, width: 0.5 } }
  },
  "girl-b": {
    idle: { key: "player-girl-b-idle", path: "/assets/characters/player-girl-b-idle-v1.png", head: { cx: 0.4858, top: 0.0456, width: 0.4092 } },
    walk: { key: "player-girl-b-walk", path: "/assets/characters/player-girl-b-walk-v1.png", head: { cx: 0.4751, top: 0.0404, width: 0.4033 } }
  },
  "girl-c": {
    idle: { key: "player-girl-c-idle", path: "/assets/characters/player-girl-c-idle-v1.png", head: { cx: 0.4604, top: 0.0046, width: 0.4268 } },
    walk: { key: "player-girl-c-walk", path: "/assets/characters/player-girl-c-walk-v1.png", head: { cx: 0.4487, top: 0.0026, width: 0.4463 } }
  },
  "girl-d": {
    idle: { key: "player-girl-d-idle", path: "/assets/characters/player-girl-d-idle-v1.png", head: { cx: 0.4937, top: 0.0215, width: 0.4639 } },
    walk: { key: "player-girl-d-walk", path: "/assets/characters/player-girl-d-walk-v1.png", head: { cx: 0.4854, top: 0.0202, width: 0.4629 } }
  }
};

export const DEFAULT_AVATAR_BASE_VARIANT: Record<CharacterGender, AvatarBaseVariant> = {
  male: "boy-a",
  female: "girl-a"
};

/**
 * เครื่องแต่งกายทั่วไปควรใช้ `layers` และส่งออกบนผืนภาพขนาดเดียวกับตัวละคร
 * จึงเพิ่มชุดใหม่ได้โดยไม่ต้องสร้างภาพผสมกับหมวกหรือชิ้นอื่นทุกความเป็นไปได้
 */
export const AVATAR_COSMETIC_VISUALS: AvatarCosmeticVisual[] = [
  {
    itemId: "straw-hat",
    slot: "hat",
    layers: [{
      drawLayer: "front",
      textures: {
        idle: { key: "avatar-straw-hat", path: "/assets/equipment/straw-hat-v1.png" },
        walk: { key: "avatar-straw-hat", path: "/assets/equipment/straw-hat-v1.png" }
      },
      // เกาะจุดยึดหัว ค่าเดียวนี้จึงถูกต้องกับทั้ง 8 ฐานและทั้งสองท่า โดยไม่ต้องจูนรายฐาน
      // widthScale 1.31 = กว้างกว่าหัวเล็กน้อยแบบหมวกปีกกว้าง, offsetY ดันปีกหมวกให้อยู่เหนือระดับตา
      placement: { anchor: "head", widthScale: 1.31, offsetY: .048 }
    }]
  },
  {
    itemId: "rain-coat",
    slot: "outfit",
    layers: [{
      drawLayer: "front",
      textures: {
        idle: { key: "avatar-rain-coat", path: "/assets/equipment/rain-coat-layer-v2.png" },
        walk: { key: "avatar-rain-coat", path: "/assets/equipment/rain-coat-layer-v2.png" }
      },
      // ไฟล์เสื้อเป็นภาพชุดเปล่าลอยกลางผืน ไม่ได้วาดครอบตัวละคร จึงต้องย่อและเลื่อนให้ตรงลำตัว
      // ไม่ระบุ height เพื่อให้คงสัดส่วนจริง ไม่บีบชุดจนผิดรูป; ระดับนี้ทำให้ฮู้ดตกที่คอไม่ใช่บังหน้า
      placement: { x: .5, y: .534, width: .72 }
    }]
  }
];
