import Phaser from "phaser";
import { AVATAR_BASE_TEXTURES, AVATAR_COSMETIC_VISUALS, DEFAULT_AVATAR_BASE_VARIANT } from "../data/avatarData";
import type { EquippedFashion } from "../types/fashion";
import type { AvatarBaseVariant, AvatarCosmeticLayer, AvatarHeadAnchor, AvatarPose, AvatarTextureAsset } from "../types/avatar";
import type { CharacterGender } from "../types/character";

type AvatarLayerImage = {
  definition: AvatarCosmeticLayer;
  image: Phaser.GameObjects.Image;
  yFromAvatarTop: number;
};

/** ใช้เมื่อฐานยังไม่ได้วัดจุดยึด ค่ากลางๆ ดีกว่าปล่อยให้ของสวมหัวหลุดออกนอกจอ */
const FALLBACK_HEAD_ANCHOR: AvatarHeadAnchor = { cx: .5, top: .02, width: .45 };

export type AvatarLayerSet = {
  objects: Phaser.GameObjects.GameObject[];
  setPose: (pose: AvatarPose) => void;
  setOffsetY: (y: number) => void;
};

type CreateAvatarOptions = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  originX?: number;
  originY?: number;
  tint?: number;
  gender?: CharacterGender;
  baseVariant?: AvatarBaseVariant;
  equipped: EquippedFashion;
  pose?: AvatarPose;
};

export function preloadAvatarAssets(scene: Phaser.Scene): void {
  const assets: AvatarTextureAsset[] = Object.values(AVATAR_BASE_TEXTURES)
    .flatMap(textures => Object.values(textures));
  AVATAR_COSMETIC_VISUALS.forEach(visual => {
    assets.push(...Object.values(visual.poseBaseOverrides ?? {}).filter(isTextureAsset));
    visual.combinationPoseBaseOverrides?.forEach(combination => {
      assets.push(...Object.values(combination.textures).filter(isTextureAsset));
    });
    visual.layers?.forEach(layer => {
      assets.push(...Object.values(layer.textures).filter(isTextureAsset));
    });
  });
  new Map(assets.map(asset => [asset.key, asset])).forEach(asset => {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.path);
  });
}

export function createAvatarLayerSet(scene: Phaser.Scene, options: CreateAvatarOptions): AvatarLayerSet {
  const x = options.x ?? 0;
  const initialY = options.y ?? 0;
  const originX = options.originX ?? .5;
  const originY = options.originY ?? 1;
  const equippedIds = new Set(Object.values(options.equipped).filter((itemId): itemId is string => Boolean(itemId)));
  const activeVisuals = AVATAR_COSMETIC_VISUALS.filter(visual => equippedIds.has(visual.itemId));
  const gender = options.gender ?? "male";
  const baseVariant = options.baseVariant ?? DEFAULT_AVATAR_BASE_VARIANT[gender];
  let pose = options.pose ?? "idle";
  const avatarLeft = x - options.width * originX;
  const avatarTop = initialY - options.height * originY;

  const headAnchorFor = (targetPose: AvatarPose): AvatarHeadAnchor =>
    resolveBaseTexture(activeVisuals, equippedIds, targetPose, gender, baseVariant).head
      ?? AVATAR_BASE_TEXTURES[baseVariant][targetPose].head
      ?? FALLBACK_HEAD_ANCHOR;

  /** ตำแหน่งและขนาดของชิ้นหนึ่งในท่าหนึ่ง ต้องคิดใหม่ทุกท่าเพราะหัวอยู่คนละที่ */
  const layoutFor = (definition: AvatarCosmeticLayer, targetPose: AvatarPose) => {
    const asset = definition.textures[targetPose] ?? Object.values(definition.textures)[0];
    const textureKey = asset?.key ?? AVATAR_BASE_TEXTURES[baseVariant].idle.key;
    const placement = definition.placement;
    if (placement?.anchor === "head") {
      const head = headAnchorFor(targetPose);
      const widthFraction = head.width * (placement.widthScale ?? 1);
      return {
        textureKey,
        xFromLeft: head.cx,
        yFromTop: head.top + (placement.offsetY ?? 0),
        size: sizeKeepingAspect(scene, textureKey, options.width * widthFraction)
      };
    }
    return {
      textureKey,
      xFromLeft: placement?.x ?? .5,
      yFromTop: placement?.y ?? .5,
      size: resolveLayerSize(scene, textureKey, options.width, options.height, placement)
    };
  };

  const createLayerImage = (definition: AvatarCosmeticLayer): AvatarLayerImage => {
    const layout = layoutFor(definition, pose);
    const yFromAvatarTop = options.height * layout.yFromTop;
    const image = scene.add
      .image(avatarLeft + options.width * layout.xFromLeft, avatarTop + yFromAvatarTop, layout.textureKey)
      .setOrigin(.5);
    image.setDisplaySize(...layout.size);
    // ใช้สีย้อมเดียวกับตัวละครฐาน ไม่งั้นเสื้อผ้าจะไม่เข้าโทนแสงกับตัวและดูเหมือนแปะทับ
    if (options.tint !== undefined) image.setTint(options.tint);
    image.setVisible(Boolean(definition.textures[pose]));
    return { definition, image, yFromAvatarTop };
  };

  const behind = activeVisuals.flatMap(visual => visual.layers?.filter(layer => layer.drawLayer === "behind") ?? [])
    .map(createLayerImage);
  const base = scene.add.image(x, initialY, resolveBaseTexture(activeVisuals, equippedIds, pose, gender, baseVariant).key)
    .setOrigin(originX, originY).setDisplaySize(options.width, options.height);
  if (options.tint !== undefined) base.setTint(options.tint);
  const front = activeVisuals.flatMap(visual => visual.layers?.filter(layer => layer.drawLayer === "front") ?? [])
    .map(createLayerImage);
  const allLayers = [...behind, ...front];

  return {
    objects: [...behind.map(layer => layer.image), base, ...front.map(layer => layer.image)],
    setPose(nextPose: AvatarPose): void {
      if (pose === nextPose) return;
      pose = nextPose;
      base.setTexture(resolveBaseTexture(activeVisuals, equippedIds, pose, gender, baseVariant).key);
      allLayers.forEach(layer => {
        const texture = layer.definition.textures[pose];
        layer.image.setVisible(Boolean(texture));
        if (!texture) return;
        const layout = layoutFor(layer.definition, pose);
        layer.image.setTexture(layout.textureKey);
        layer.image.setDisplaySize(...layout.size);
        layer.image.x = avatarLeft + options.width * layout.xFromLeft;
        layer.yFromAvatarTop = options.height * layout.yFromTop;
        layer.image.y = base.y - options.height * originY + layer.yFromAvatarTop;
      });
    },
    setOffsetY(y: number): void {
      base.y = y;
      const nextAvatarTop = y - options.height * originY;
      allLayers.forEach(layer => { layer.image.y = nextAvatarTop + layer.yFromAvatarTop; });
    }
  };
}

/**
 * ขนาดที่วาดจริงของชิ้นแต่งกาย
 * ไม่ระบุ placement = เท่ากรอบตัวละครพอดี, ระบุเฉพาะ width = คงสัดส่วนจริงของไฟล์ภาพ
 */
function resolveLayerSize(
  scene: Phaser.Scene,
  textureKey: string,
  boxWidth: number,
  boxHeight: number,
  placement: AvatarCosmeticLayer["placement"]
): [number, number] {
  if (placement?.width === undefined) {
    return [boxWidth * 1, boxHeight * (placement?.height ?? 1)];
  }
  const width = boxWidth * placement.width;
  if (placement.height !== undefined) return [width, boxHeight * placement.height];
  return sizeKeepingAspect(scene, textureKey, width);
}

/** ความสูงคำนวณจากสัดส่วนจริงของไฟล์ ไม่ยืดตามกรอบตัวละคร */
function sizeKeepingAspect(scene: Phaser.Scene, textureKey: string, width: number): [number, number] {
  // ถ้าหา texture ไม่เจอ ให้ถือว่าเป็นจัตุรัส ดีกว่าปล่อยให้ทั้งฉากพังเพราะภาพชิ้นเดียวโหลดไม่สำเร็จ
  const source = scene.textures?.get(textureKey)?.getSourceImage?.();
  const aspect = source?.width && source?.height ? source.height / source.width : 1;
  return [width, width * aspect];
}

function resolveBaseTexture(
  activeVisuals: typeof AVATAR_COSMETIC_VISUALS,
  equippedIds: Set<string>,
  pose: AvatarPose,
  gender: CharacterGender,
  baseVariant: AvatarBaseVariant
): AvatarTextureAsset {
  // ภาพชุดเดิมยังเป็นภาพอบรวมของเด็กผู้ชาย จึงไม่สลับเพศของตัวละครหญิงโดยไม่ตั้งใจ
  if (gender === "female") return AVATAR_BASE_TEXTURES[baseVariant][pose];
  for (let index = activeVisuals.length - 1; index >= 0; index -= 1) {
    const combination = activeVisuals[index].combinationPoseBaseOverrides?.find(candidate =>
      candidate.withItemIds.every(itemId => equippedIds.has(itemId)) && candidate.textures[pose]
    );
    if (combination?.textures[pose]) return combination.textures[pose];
    const override = activeVisuals[index].poseBaseOverrides?.[pose];
    if (override) return override;
  }
  return AVATAR_BASE_TEXTURES[baseVariant][pose];
}

function isTextureAsset(asset: AvatarTextureAsset | undefined): asset is AvatarTextureAsset {
  return Boolean(asset);
}
