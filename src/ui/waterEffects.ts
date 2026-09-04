import Phaser from "phaser";

type WaterBiome = "coast" | "river";
type WaterPatch = readonly [number, number, number, number, number, number];
type WaterPoint = readonly [number, number, number];
type FishRoute = readonly [number, number, number, number];

const CAUSTIC_TEXTURE = "water-caustic-soft-v2";
const RIPPLE_TEXTURE = "water-ripple-soft-v2";
const FISH_BODY_TEXTURE = "water-fish-body-v3";
const FISH_TAIL_TEXTURE = "water-fish-tail-v3";

const CAUSTIC_PATCHES: Record<WaterBiome, readonly WaterPatch[]> = {
  coast: [
    [1040, 112, 250, 115, 28, 7], [1160, 235, 230, 105, -24, 8],
    [910, 230, 165, 82, 17, -5], [1180, 495, 225, 110, -22, 6],
    [1035, 575, 245, 118, 25, 8], [1170, 675, 230, 92, -20, -4]
  ],
  river: [
    [520, 82, 215, 95, 26, 7], [720, 112, 250, 105, 30, 8],
    [940, 165, 230, 100, 27, 9], [1125, 285, 220, 105, 18, 12],
    [92, 345, 175, 82, -18, 8], [265, 398, 185, 86, -22, 9],
    [1090, 490, 220, 100, 20, 14], [1150, 650, 235, 105, 17, 15]
  ]
};

const RIPPLE_POINTS: Record<WaterBiome, readonly WaterPoint[]> = {
  coast: [[1030, 185, 70], [1185, 515, 78], [1040, 655, 62]],
  river: [[645, 130, 58], [1085, 300, 66], [1080, 555, 72], [180, 385, 54]]
};

const FISH_ROUTES: Record<WaterBiome, readonly FishRoute[]> = {
  coast: [[965, 155, 1115, 178], [1150, 545, 1005, 575], [970, 670, 1130, 682]],
  river: [[590, 150, 720, 170], [960, 230, 1090, 260], [1110, 500, 1030, 555], [125, 375, 255, 402]]
};

function createCanvasTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(CAUSTIC_TEXTURE)) {
    const texture = scene.textures.createCanvas(CAUSTIC_TEXTURE, 256, 128)!;
    const context = texture.context;
    context.clearRect(0, 0, 256, 128);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "rgba(167, 245, 231, .38)";
    context.shadowBlur = 8;
    for (let row = 0; row < 6; row += 1) {
      const gradient = context.createLinearGradient(0, 0, 256, 0);
      gradient.addColorStop(0, "rgba(119, 220, 215, 0)");
      gradient.addColorStop(.24, "rgba(183, 246, 226, .68)");
      gradient.addColorStop(.7, "rgba(116, 211, 218, .42)");
      gradient.addColorStop(1, "rgba(100, 198, 210, 0)");
      context.strokeStyle = gradient;
      context.lineWidth = row % 2 === 0 ? 3 : 2;
      context.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = 14 + row * 20 + Math.sin(x * .045 + row * 1.7) * 5
          + Math.sin(x * .018 + row) * 3;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    texture.refresh();
  }

  if (!scene.textures.exists(RIPPLE_TEXTURE)) {
    const texture = scene.textures.createCanvas(RIPPLE_TEXTURE, 160, 80)!;
    const context = texture.context;
    context.clearRect(0, 0, 160, 80);
    context.strokeStyle = "rgba(175, 238, 228, .5)";
    context.shadowColor = "rgba(110, 220, 215, .3)";
    context.shadowBlur = 7;
    [1, .72, .46].forEach((scale, index) => {
      context.lineWidth = 2 - index * .35;
      context.beginPath();
      context.ellipse(80, 40, 72 * scale, 27 * scale, 0, 0, Math.PI * 2);
      context.stroke();
    });
    texture.refresh();
  }

  if (!scene.textures.exists(FISH_BODY_TEXTURE)) {
    const texture = scene.textures.createCanvas(FISH_BODY_TEXTURE, 88, 48)!;
    const context = texture.context;
    context.clearRect(0, 0, 88, 48);
    context.shadowColor = "rgba(35, 159, 175, .26)";
    context.shadowBlur = 9;
    const bodyGradient = context.createLinearGradient(12, 8, 78, 39);
    bodyGradient.addColorStop(0, "rgba(52, 170, 181, .6)");
    bodyGradient.addColorStop(.55, "rgba(17, 112, 139, .72)");
    bodyGradient.addColorStop(1, "rgba(12, 78, 112, .68)");
    context.fillStyle = bodyGradient;
    context.beginPath();
    context.moveTo(6, 24);
    context.bezierCurveTo(18, 7, 55, 5, 78, 20);
    context.quadraticCurveTo(84, 24, 78, 28);
    context.bezierCurveTo(55, 43, 18, 41, 6, 24);
    context.fill();

    context.shadowBlur = 3;
    context.beginPath();
    context.moveTo(26, 11);
    context.quadraticCurveTo(39, 0, 51, 10);
    context.quadraticCurveTo(38, 8, 26, 11);
    context.fill();
    context.beginPath();
    context.moveTo(38, 34);
    context.quadraticCurveTo(51, 47, 58, 32);
    context.quadraticCurveTo(48, 35, 38, 34);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = "rgba(206, 255, 242, .48)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(18, 24);
    context.bezierCurveTo(38, 20, 58, 23, 74, 21);
    context.stroke();
    context.fillStyle = "rgba(232, 255, 246, .72)";
    context.beginPath();
    context.arc(69, 20, 1.7, 0, Math.PI * 2);
    context.fill();
    texture.refresh();
  }

  if (!scene.textures.exists(FISH_TAIL_TEXTURE)) {
    const texture = scene.textures.createCanvas(FISH_TAIL_TEXTURE, 34, 44)!;
    const context = texture.context;
    context.clearRect(0, 0, 34, 44);
    context.shadowColor = "rgba(35, 159, 175, .24)";
    context.shadowBlur = 5;
    context.fillStyle = "rgba(14, 102, 132, .7)";
    context.beginPath();
    context.moveTo(32, 22);
    context.bezierCurveTo(20, 17, 13, 5, 3, 3);
    context.quadraticCurveTo(8, 21, 14, 22);
    context.quadraticCurveTo(8, 23, 3, 41);
    context.bezierCurveTo(13, 39, 20, 27, 32, 22);
    context.fill();
    texture.refresh();
  }
}

function createFishShadow(
  scene: Phaser.Scene,
  route: FishRoute,
  index: number
): Phaser.GameObjects.Container {
  const [fromX, fromY, toX, toY] = route;
  const variantScale = [0.58, 0.72, 0.5][index % 3];
  const tail = scene.add.image(-31, 0, FISH_TAIL_TEXTURE).setOrigin(.94, .5);
  const body = scene.add.image(4, 0, FISH_BODY_TEXTURE);
  const children: Phaser.GameObjects.GameObject[] = [tail, body];
  if (index % 3 === 2) {
    const companionTail = scene.add.image(-8, -20, FISH_TAIL_TEXTURE).setOrigin(.94, .5).setScale(.56);
    const companionBody = scene.add.image(11, -20, FISH_BODY_TEXTURE).setScale(.56);
    children.unshift(companionTail, companionBody);
    scene.tweens.add({
      targets: companionTail, angle: { from: -11, to: 11 }, duration: 190,
      yoyo: true, repeat: -1, ease: "Sine.inOut"
    });
  }
  const fish = scene.add.container(fromX, fromY, children).setDepth(1);
  fish.setScale((toX < fromX ? -1 : 1) * variantScale, variantScale * (index % 3 === 1 ? 1.12 : 1));
  fish.setRotation(Math.atan2(toY - fromY, Math.abs(toX - fromX)));
  scene.tweens.add({
    targets: tail, angle: { from: -12, to: 12 }, duration: 230 + index * 25,
    yoyo: true, repeat: -1, ease: "Sine.inOut"
  });
  scene.tweens.add({
    targets: fish,
    x: toX,
    y: toY,
    alpha: { from: .16, to: .34 },
    duration: 5200 + index * 850,
    delay: index * 650,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
    onYoyo: () => { fish.scaleX *= -1; },
    onRepeat: () => { fish.scaleX *= -1; }
  });
  return fish;
}

export function createWaterEffects(scene: Phaser.Scene, biome: WaterBiome): void {
  createCanvasTextures(scene);

  CAUSTIC_PATCHES[biome].forEach(([x, y, width, height, driftX, driftY], index) => {
    const patch = scene.add.image(x, y, CAUSTIC_TEXTURE)
      .setDisplaySize(width, height)
      .setAlpha(.3)
      .setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: patch,
      x: x + driftX,
      y: y + driftY,
      alpha: { from: .2, to: .42 },
      scaleX: { from: .96, to: 1.05 },
      scaleY: { from: .95, to: 1.04 },
      duration: 3600 + index * 260,
      delay: index * 170,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });
  });

  RIPPLE_POINTS[biome].forEach(([x, y, width], index) => {
    const ripple = scene.add.image(x, y, RIPPLE_TEXTURE)
      .setDisplaySize(width, width * .5)
      .setAlpha(0)
      .setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: ripple,
      alpha: { from: .34, to: 0 },
      scaleX: { from: .45, to: 1.35 },
      scaleY: { from: .45, to: 1.35 },
      duration: 2400 + index * 180,
      delay: 900 + index * 1100,
      repeat: -1,
      repeatDelay: 1800 + index * 500,
      ease: "Sine.out"
    });
  });

  FISH_ROUTES[biome].forEach((route, index) => createFishShadow(scene, route, index));
}
