export type FishArtProfile = {
  textureKey: string;
  path: string;
  previewWidth: number;
  aquariumWidth: number;
  resultWidth: number;
  aspectRatio: number;
};

export const FISH_ART: Record<string, FishArtProfile> = {
  "ปลากระบอก": {
    textureKey: "fish-art-mullet-v2",
    path: "/assets/fish/mullet-sprite-v2.png",
    previewWidth: 112,
    aquariumWidth: 184,
    resultWidth: 255,
    aspectRatio: .5
  },
  "ปลากะพงขาว": {
    textureKey: "fish-art-barramundi-v2",
    path: "/assets/fish/barramundi-sprite-v2.png",
    previewWidth: 118,
    aquariumWidth: 205,
    resultWidth: 270,
    aspectRatio: .5
  },
  "ปลาทู": {
    textureKey: "fish-art-short-mackerel-v2",
    path: "/assets/fish/short-mackerel-sprite-v2.png",
    previewWidth: 104,
    aquariumWidth: 178,
    resultWidth: 235,
    aspectRatio: .6
  },
  "ปลากระโทงดาบ": {
    textureKey: "fish-art-swordfish-v2",
    path: "/assets/fish/swordfish-sprite-v2.png",
    previewWidth: 138,
    aquariumWidth: 220,
    resultWidth: 305,
    aspectRatio: .563
  },
  "กุ้งก้ามกราม": {
    textureKey: "aquatic-art-giant-prawn-v2",
    path: "/assets/fish/giant-prawn-sprite-v2.png",
    previewWidth: 118,
    aquariumWidth: 158,
    resultWidth: 225,
    aspectRatio: .667
  },
  "ปูม้า": {
    textureKey: "aquatic-art-blue-crab-v2",
    path: "/assets/fish/blue-swimming-crab-sprite-v2.png",
    previewWidth: 98,
    aquariumWidth: 108,
    resultWidth: 185,
    aspectRatio: .667
  },
  "หอยแครง": {
    textureKey: "aquatic-art-blood-cockle-v2",
    path: "/assets/fish/blood-cockle-sprite-v2.png",
    previewWidth: 76,
    aquariumWidth: 66,
    resultWidth: 140,
    aspectRatio: .667
  },
  "หอยกาบเอเชีย": {
    textureKey: "aquatic-art-asian-clam-v2",
    path: "/assets/fish/asian-clam-sprite-v2.png",
    previewWidth: 76,
    aquariumWidth: 65,
    resultWidth: 140,
    aspectRatio: .914
  }
};

export function getFishArt(name: string): FishArtProfile | undefined {
  return FISH_ART[name];
}
