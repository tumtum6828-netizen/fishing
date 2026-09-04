import Phaser from "phaser";
import type { RodProfile } from "./gameData";

export const ROD_FIRST_PERSON_ART: Record<RodProfile["id"], { textureKey: string; path: string }> = {
  bamboo: {
    textureKey: "rod-bamboo-first-person-v4",
    path: "assets/equipment/rod-bamboo-first-person-v4.png"
  },
  fiberglass: {
    textureKey: "rod-fiberglass-first-person-v4",
    path: "assets/equipment/rod-fiberglass-first-person-v4.png"
  },
  "deep-sea": {
    textureKey: "rod-deep-sea-first-person-v4",
    path: "assets/equipment/rod-deep-sea-first-person-v4.png"
  }
};

export function preloadRodArt(scene: Phaser.Scene): void {
  Object.values(ROD_FIRST_PERSON_ART).forEach(art => {
    if (!scene.textures.exists(art.textureKey)) scene.load.image(art.textureKey, art.path);
  });
}
