import Phaser from "phaser";

export const GAME_THEME = {
  cream: 0xfff7df,
  paper: 0xfffcf2,
  peach: 0xffbf58,
  orange: 0xffad32,
  orangeDark: 0xd8791f,
  teal: 0x28a8a4,
  tealDark: 0x164f68,
  sky: 0x45bde7,
  blue: 0x287db5,
  paleGreen: 0xe8f7df,
  line: 0xc8a86d,
  mutedFill: 0xe7e1d4,
  ink: "#49341f",
  navyInk: "#143f59",
  muted: "#806f59",
  greenText: "#397c59"
} as const;

export function addRoundedPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: number = GAME_THEME.paper,
  strokeColor: number = GAME_THEME.line,
  radius = 18,
  alpha = 1,
  strokeWidth = 1.5
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(0x173f4c, .15).fillRoundedRect(x + 4, y + 7, width, height, radius);
  panel.fillStyle(fillColor, alpha).fillRoundedRect(x, y, width, height, radius);
  if (strokeWidth > 0) {
    panel.lineStyle(strokeWidth + 2, 0xffffff, .42).strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, radius);
    panel.lineStyle(strokeWidth, strokeColor, .98).strokeRoundedRect(x, y, width, height, radius);
  }
  return panel;
}

export function addPillHitArea(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  action: () => void
): Phaser.GameObjects.Zone {
  const hit = scene.add.zone(x, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
  hit.on("pointerdown", action);
  return hit;
}

export function drawSoftBackdrop(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor("#45bde7");
  const art = scene.add.graphics();
  art.fillGradientStyle(0x71d6f2, 0x71d6f2, 0x2da9d7, 0x2185b5, 1)
    .fillRect(0, 0, 1280, 720);
  art.fillStyle(0xffffff, .48).fillEllipse(190, 82, 330, 68);
  art.fillStyle(0xffffff, .38).fillEllipse(1060, 130, 390, 78);
  art.fillStyle(0x0b789c, .18).fillEllipse(1060, 720, 850, 285);
  art.fillStyle(0x8ce7e5, .2).fillEllipse(220, 700, 730, 220);
  art.lineStyle(2, 0xd8fbff, .2);
  for (let y = 500; y < 720; y += 42) {
    art.beginPath().moveTo(0, y).lineTo(1280, y + 12).strokePath();
  }
}
