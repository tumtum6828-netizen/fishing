import Phaser from "phaser";
import { getBreedingRemainingMinutes, readBreeding } from "../services/breeding";
import { getDailyQuestSummary } from "../services/dailyQuests";
import { getStarterQuestSummary, readStarterQuest } from "../services/quests";
import { getAnglerLevel } from "../data/questData";
import { readSaveData } from "../services/save";
import { readCharacterSelection, getSelectedCharacter } from "../services/character";
import { readEquippedFashion } from "../services/fashion";
import { addRoundedPanel, GAME_THEME } from "./gameTheme";
import type { RodProfile } from "../data/gameData";
import { ROD_FIRST_PERSON_ART } from "../data/rodArt";
import { createAvatarLayerSet } from "./avatarRenderer";

export const THAI_FONT = '"Mitr", "Noto Sans Thai", Tahoma, sans-serif';

export type WorldMenuPage = "bag" | "character" | "dex" | "aquarium" | "battle" | "settings";

export type WorldTopBar = {
  locationText: Phaser.GameObjects.Text;
  clockText: Phaser.GameObjects.Text;
  miniMapDot: Phaser.GameObjects.Arc;
};

export function preloadWorldHudAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists("quest-board-v1")) {
    scene.load.image("quest-board-v1", "/assets/ui/quest-board-v1.png");
  }
}

export type MenuIcon = "bag" | "character" | "journal" | "aquarium" | "battle" | "settings" | "craft";

// จานปุ่มชุดเดียวใช้ร่วมกันทุกเมนูบนแผนที่ ตามธีมภาพคอนเซปต์: จานฟ้าน้ำทะเล ขอบครีมหนา เงานุ่ม
const DISC_BLUE = 0x3a90cd;
const DISC_HILITE = 0x7cc8ef;
const RING_CREAM = 0xf7efdb;
const RING_LINE = 0xc9a978;
const ICON_CREAM = 0xfffaee;
const ICON_SCALE = .76;

/**
 * ไอคอนเมนูโลกวาดเป็นรูปทึบ ไม่ใช่เส้นบาง เพื่อให้อ่านออกที่ขนาด ~24px บนพื้นหลังลายละเอียดสูง
 * `holeColor` ใช้เจาะช่องว่างในรูป โดยระบายทับด้วยสีพื้นปุ่ม เพราะ Graphics ไม่มี boolean op
 */
function drawMenuIcon(
  scene: Phaser.Scene,
  kind: MenuIcon,
  color: number,
  holeColor: number
): Phaser.GameObjects.Graphics {
  const icon = scene.add.graphics();
  icon.fillStyle(color, 1);

  if (kind === "bag") {
    // สายหิ้วบาง ตัวกระเป๋ากว้าง และหัวเข็มขัดคร่อมขอบฝา เพื่อไม่ให้อ่านเป็นแม่กุญแจ
    icon.lineStyle(2.6, color, 1);
    icon.beginPath();
    icon.arc(0, -6.5, 5.5, Math.PI, 0);
    icon.strokePath();
    icon.fillRoundedRect(-12.5, -6, 25, 19, 4.5);
    icon.fillStyle(holeColor, 1);
    icon.fillRect(-12.5, .5, 25, 1.8);
    icon.fillRoundedRect(-2.2, -.6, 4.4, 5, 1.4);
  } else if (kind === "character") {
    icon.fillCircle(0, -7, 5.8);
    icon.fillRoundedRect(-9.5, .5, 19, 13.5, 6.5);
  } else if (kind === "journal") {
    icon.fillPoints([{ x: -13, y: -9 }, { x: -1.4, y: -6 }, { x: -1.4, y: 10 }, { x: -13, y: 7 }], true);
    icon.fillPoints([{ x: 13, y: -9 }, { x: 1.4, y: -6 }, { x: 1.4, y: 10 }, { x: 13, y: 7 }], true);
    icon.fillStyle(holeColor, .55);
    icon.fillRect(-10, -3.4, 7, 1.5).fillRect(-10, .6, 7, 1.5);
    icon.fillRect(3, -3.4, 7, 1.5).fillRect(3, .6, 7, 1.5);
  } else if (kind === "aquarium") {
    icon.fillRoundedRect(-13, -10, 26, 21, 5);
    icon.fillStyle(holeColor, 1).fillRoundedRect(-10, -7, 20, 15, 3);
    icon.fillStyle(color, 1);
    icon.fillEllipse(2.5, 1, 11, 7);
    icon.fillTriangle(-2.5, 1, -8.5, -3.5, -8.5, 5.5);
    icon.fillStyle(holeColor, 1).fillCircle(5, -.8, 1.3);
  } else if (kind === "battle") {
    [Math.PI / 4, -Math.PI / 4].forEach(angle => {
      icon.save();
      icon.rotateCanvas(angle);
      icon.fillStyle(color, 1);
      icon.fillRoundedRect(-2.2, -14, 4.4, 21, 2.2);
      icon.fillRoundedRect(-5.5, 7, 11, 3.2, 1.6);
      icon.fillRoundedRect(-2, 10.5, 4, 4.5, 1.6);
      icon.restore();
    });
  } else if (kind === "craft") {
    // ค้อนเอียง อ่านเป็นเครื่องมือได้ชัดกว่าวางตรงซึ่งดูเป็นตัว T
    icon.save();
    icon.rotateCanvas(-.32);
    icon.fillRoundedRect(-9.5, -12, 19, 7, 2.5);
    icon.fillRoundedRect(-2, -5.5, 4, 17.5, 1.8);
    icon.restore();
  } else {
    for (let index = 0; index < 8; index += 1) {
      icon.save();
      icon.rotateCanvas(index * Math.PI / 4);
      icon.fillStyle(color, 1).fillRoundedRect(-3, -14.5, 6, 7.5, 2);
      icon.restore();
    }
    icon.fillStyle(color, 1).fillCircle(0, 0, 9.5);
    icon.fillStyle(holeColor, 1).fillCircle(0, 0, 3.8);
  }
  return icon;
}

/** ปุ่มกลมมาตรฐานของ HUD แผนที่ คืน container ที่วางไว้ที่ (x, y) แล้ว */
export function createHudDiscButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: MenuIcon,
  label: string,
  onPress: () => void
): Phaser.GameObjects.Container {
  const shadow = scene.add.circle(0, 4, 23, 0x0c3c52, .3);
  const ring = scene.add.circle(0, 0, 23, RING_CREAM, 1)
    .setStrokeStyle(1.6, RING_LINE, 1)
    .setInteractive({ useHandCursor: true });
  const disc = scene.add.circle(0, 0, 19, DISC_BLUE, 1);
  const hilite = scene.add.ellipse(0, -7, 30, 15, DISC_HILITE, .8);
  const icon = drawMenuIcon(scene, kind, ICON_CREAM, DISC_BLUE).setScale(ICON_SCALE);
  const discGroup = scene.add.container(0, 0, [shadow, ring, disc, hilite, icon]);

  const tooltip = scene.add.text(0, 31, label, {
    fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: "#5b4327"
  }).setOrigin(.5);
  const tagWidth = tooltip.width + 9;
  const tag = scene.add.graphics();
  tag.fillStyle(0x0c3c52, .22).fillRoundedRect(-tagWidth / 2, 25.5, tagWidth, 15, 7.5);
  tag.fillStyle(0xfdf5e2, .97).fillRoundedRect(-tagWidth / 2, 24, tagWidth, 15, 7.5);
  tag.lineStyle(1, RING_LINE, 1).strokeRoundedRect(-tagWidth / 2, 24, tagWidth, 15, 7.5);

  ring.on("pointerover", () => discGroup.setScale(1.1));
  ring.on("pointerout", () => discGroup.setScale(1));
  ring.on("pointerdown", () => {
    scene.tweens.add({ targets: discGroup, scale: .9, duration: 70, yoyo: true });
    onPress();
  });
  return scene.add.container(x, y, [discGroup, tag, tooltip]);
}

export function createWorldMenu(
  scene: Phaser.Scene,
  onSelect: (page: WorldMenuPage) => void
): Phaser.GameObjects.Container {
  const items: readonly [MenuIcon, string, WorldMenuPage][] = [
    ["bag", "กระเป๋า", "bag"],
    ["character", "ตัวละคร", "character"],
    ["journal", "สมุดปลา", "dex"],
    ["aquarium", "ตู้ปลา", "aquarium"],
    ["battle", "ประลอง", "battle"],
    ["settings", "ตั้งค่า", "settings"]
  ];
  const children: Phaser.GameObjects.GameObject[] = [];
  const breedingProject = readBreeding().project;
  const breedingRemaining = breedingProject ? getBreedingRemainingMinutes() : 0;

  items.forEach(([kind, label, page], index) => {
    const x = 30 + index * 52;
    children.push(createHudDiscButton(scene, x, 121, kind, label, () => onSelect(page)));

    if (kind === "aquarium" && breedingProject) {
      const ready = breedingRemaining <= 0;
      const badge = scene.add.circle(x + 15, 90, 8, ready ? 0x63be8d : 0xe98aa5, 1)
        .setStrokeStyle(2, 0xfffbf0, 1);
      const badgeIcon = scene.add.text(x + 15, 90, ready ? "!" : "♥", {
        fontFamily: THAI_FONT, fontSize: ready ? "11px" : "9px", fontStyle: "bold", color: "#ffffff"
      }).setOrigin(.5);
      children.push(badge, badgeIcon);
      if (ready) scene.tweens.add({ targets: [badge, badgeIcon], scale: { from: .9, to: 1.18 }, duration: 620, yoyo: true, repeat: -1 });
    }
  });

  if (breedingProject) {
    const ready = breedingRemaining <= 0;
    const statusBack = scene.add.graphics();
    statusBack.fillStyle(ready ? 0xe9fff0 : 0xffedf2, .94)
      .fillRoundedRect(340, 88, 126, 34, 13);
    statusBack.lineStyle(1.2, ready ? 0x63a77e : 0xd7839b, .95)
      .strokeRoundedRect(340, 88, 126, 34, 13);
    const hours = Math.max(1, Math.ceil(breedingRemaining / 60));
    const statusText = scene.add.text(403, 105, ready ? "🐣 พร้อมรับลูก" : `💕 เหลือ ${hours} ชม.`, {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: ready ? "#3d7557" : "#895064"
    }).setOrigin(.5);
    children.push(statusBack, statusText);
  }

  return scene.add.container(0, 0, children).setDepth(10);
}

export function createFishingActionButton(
  scene: Phaser.Scene,
  onPress: () => void,
  rodId: RodProfile["id"]
): { container: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text } {
  const shadow = scene.add.circle(5, 7, 72, 0x173f4c, .28);
  const outer = scene.add.circle(0, 0, 70, GAME_THEME.orange, 1)
    .setStrokeStyle(5, 0xfff2c8, 1)
    .setInteractive({ useHandCursor: true });
  const inner = scene.add.circle(0, -3, 58, 0xffbd3f, 1)
    .setStrokeStyle(2, GAME_THEME.orangeDark, .9);
  const sheen = scene.add.ellipse(-18, -28, 50, 20, 0xffffff, .22).setRotation(-.35);
  const rod = scene.add.image(0, -37, ROD_FIRST_PERSON_ART[rodId].textureKey)
    .setOrigin(.47, .5)
    .setRotation(.52);
  rod.setCrop(rod.width * .16, rod.height * .55, rod.width * .72, rod.height * .45)
    .setDisplaySize(128, 165);
  const label = scene.add.text(0, 42, "ตกปลา", {
    fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: "#4d3218",
    stroke: "#fff2c8", strokeThickness: 2
  }).setOrigin(.5);
  const container = scene.add.container(1162, 610, [shadow, outer, inner, sheen, rod, label]).setDepth(12);
  outer.on("pointerdown", () => {
    scene.tweens.add({ targets: container, scale: .92, duration: 70, yoyo: true });
    onPress();
  });
  return { container, label };
}

/**
 * จำว่าผู้เล่นปิดกระดานภารกิจไปแล้วหรือยัง
 * เก็บไว้ระดับโมดูล ไม่ลงเซฟ จึงคงอยู่ข้ามฉากภายในรอบเล่นเดียวกัน
 * และรีเซ็ตเองเมื่อเข้าเกมใหม่ ตรงกับที่ต้องการว่า "ล็อกอินเข้ามาใหม่ให้เปิด"
 */
let questBoardDismissed = false;
let questBoardDismissedWhileReady = false;

/** เรียกเมื่อเริ่มเกมใหม่ เพื่อให้กระดานกลับมาแสดงเสมอ */
export function resetQuestBoardDismissal(): void {
  questBoardDismissed = false;
  questBoardDismissedWhileReady = false;
}

export function createDailyQuestButton(scene: Phaser.Scene, returnScene: string): Phaser.GameObjects.Container {
  const summary = getDailyQuestSummary();
  const save = readSaveData();
  // มีรางวัลรอรับ นับทั้งภารกิจรายวันและภารกิจเริ่มต้นที่พร้อมส่ง
  const ready = summary.includes("รอรับ") || readStarterQuest(save).status === "ready";
  // ปิดไปตอนยังไม่มีรางวัล แล้วมีรางวัลโผล่มาทีหลัง ให้กลับมาแสดงเอง
  if (questBoardDismissed && ready && !questBoardDismissedWhileReady) {
    questBoardDismissed = false;
  }
  const board = scene.add.image(0, 0, "quest-board-v1").setDisplaySize(230, 315);
  const title = scene.add.text(0, -72, ready ? "🎁 ภารกิจพร้อมรับ" : "ภารกิจ", {
    fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: "#4b301d"
  }).setOrigin(.5);
  const starter = scene.add.text(0, -28, getStarterQuestSummary(save).replace(/\s*•\s*/g, "\n"), {
    fontFamily: THAI_FONT, fontSize: "11px", fontStyle: "bold", color: "#3b5d61",
    align: "center", wordWrap: { width: 160 }
  }).setOrigin(.5);
  const divider = scene.add.rectangle(0, 12, 154, 2, 0xc8a86d, .5);
  const label = scene.add.text(0, 48, summary.replace(/\s*•\s*/g, "\n"), {
    fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold",
    color: ready ? "#a35c1a" : "#5d5749", align: "center", wordWrap: { width: 158 }
  }).setOrigin(.5);
  const hintBack = scene.add.graphics();
  hintBack.fillStyle(ready ? GAME_THEME.orange : 0x2d87a9, .98).fillRoundedRect(-63, 78, 126, 32, 14);
  hintBack.lineStyle(2, 0xfff2c8, .9).strokeRoundedRect(-63, 78, 126, 32, 14);
  const hint = scene.add.text(0, 94, ready ? "รับรางวัล" : "ดูภารกิจทั้งหมด", {
    fontFamily: THAI_FONT, fontSize: "11px", fontStyle: "bold", color: "#fff8de"
  }).setOrigin(.5);
  const hitArea = scene.add.rectangle(0, 0, 222, 300, 0xffffff, .001)
    .setInteractive({ useHandCursor: true });
  // ปุ่มปิดต้องอยู่หลัง hitArea ในลิสต์ เพราะ Phaser ตรวจ input จากชิ้นบนสุดลงล่าง
  // ถ้าอยู่ก่อน hitArea จะกลืนคลิกไปเปิดหน้าภารกิจแทน
  const closeButton = scene.add.circle(88, -118, 14, GAME_THEME.cream, .97)
    .setStrokeStyle(1.6, 0xb98d4e, 1)
    .setInteractive({ useHandCursor: true });
  const closeIcon = scene.add.text(88, -120, "×", {
    fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: "#7a5122"
  }).setOrigin(.5);
  const container = scene.add
    .container(128, 326, [board, title, starter, divider, label, hintBack, hint, hitArea, closeButton, closeIcon])
    .setDepth(12);
  hitArea.on("pointerdown", () => {
    scene.tweens.add({ targets: container, scale: .96, duration: 70, yoyo: true });
    scene.scene.start("DailyQuestScene", { returnScene });
  });
  container.setVisible(!questBoardDismissed);
  closeButton.on("pointerdown", () => {
    questBoardDismissed = true;
    questBoardDismissedWhileReady = ready;
    scene.tweens.add({
      targets: container, scale: .82, alpha: 0, duration: 140,
      onComplete: () => container.setVisible(false).setScale(1).setAlpha(1)
    });
  });
  return container;
}

export function createEnergyPanel(scene: Phaser.Scene): void {
  const save = readSaveData();
  const selection = readCharacterSelection(save);
  const character = getSelectedCharacter(save);
  const level = getAnglerLevel(save.anglerXp, save.collectionCount);
  const xp = Math.max(0, save.anglerXp ?? 0);
  const levelXp = xp % 100;
  const panel = addRoundedPanel(scene, 12, 10, 330, 88, 0xeffaf0, 0xe4bc6b, 30, .97, 2.4).setDepth(10);
  panel.fillStyle(0x1b7794, 1).fillCircle(58, 54, 42);
  panel.lineStyle(4, 0xffd46c, 1).strokeCircle(58, 54, 42);
  panel.lineStyle(2, 0xffffff, .9).strokeCircle(58, 54, 36);
  const equipped = readEquippedFashion(save);
  const portrait = createAvatarLayerSet(scene, {
    x: 58, y: 160, width: 105, height: 157, originY: 1,
    tint: character.tint, gender: character.gender, baseVariant: character.baseVariant, equipped, pose: "idle"
  });
  const portraitMaskShape = scene.make.graphics({ x: 0, y: 0 });
  portraitMaskShape.fillStyle(0xffffff).fillCircle(58, 54, 35);
  const portraitMask = portraitMaskShape.createGeometryMask();
  portrait.objects.forEach(object => {
    if (object instanceof Phaser.GameObjects.Image) object.setMask(portraitMask).setDepth(11);
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => portraitMask.destroy());
  scene.add.text(112, 24, `🍃 ${selection.playerName || "นักสำรวจ"}  •  เลเวล ${level}`, {
    fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.navyInk
  }).setDepth(11);
  addRoundedPanel(scene, 112, 57, 196, 19, 0x2b5761, 0xfff1c1, 9, 1, 1).setDepth(11);
  addRoundedPanel(scene, 115, 60, 190 * Math.max(.04, levelXp / 100), 13, 0x46d17f, 0x46d17f, 6, 1, 0).setDepth(12);
  drawStar(scene, 324, 66, 10, 4.6, 0xffc52e);
  scene.add.text(210, 66, `${levelXp} / 100`, {
    fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: "#ffffff",
    stroke: "#17615f", strokeThickness: 2
  }).setOrigin(.5).setDepth(13);
  scene.add.circle(58, 54, 42, 0xffffff, .001)
    .setInteractive({ useHandCursor: true }).setDepth(14)
    .on("pointerdown", () => scene.scene.start("PlayerMenuScene", { page: "character" }));
}

const CHIP_NAVY = 0x17466b;
const CHIP_NAVY_LIGHT = 0x2c6b96;
const CHIP_EDGE = 0xbfe4f2;

function drawMapPin(scene: Phaser.Scene, x: number, y: number, color: number, holeColor: number): void {
  const pin = scene.add.graphics().setDepth(11);
  pin.fillStyle(color, 1);
  pin.fillCircle(x, y - 3, 6);
  pin.fillTriangle(x - 4.6, y + 1, x + 4.6, y + 1, x, y + 9);
  pin.fillStyle(holeColor, 1).fillCircle(x, y - 3, 2.4);
}

function drawStar(scene: Phaser.Scene, x: number, y: number, outer: number, inner: number, color: number): void {
  const points: Phaser.Types.Math.Vector2Like[] = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    points.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
  }
  scene.add.graphics().setDepth(12).fillStyle(color, 1).fillPoints(points, true);
}

/** ชิปสกุลเงินแบบแถบบนในภาพคอนเซปต์: พิลกรมท่า ไอคอนกลมซ้าย ตัวเลขขาว ปุ่ม + ขวา */
function createCurrencyChip(
  scene: Phaser.Scene,
  x: number,
  width: number,
  iconColor: number,
  iconEdge: number,
  glyph: string,
  value: number,
  onPlus?: () => void
): void {
  const chip = addRoundedPanel(scene, x, 14, width, 43, CHIP_NAVY, CHIP_EDGE, 21, .88, 1.4).setDepth(10);
  chip.fillStyle(iconColor, 1).fillCircle(x + 22, 35, 13);
  chip.lineStyle(2, iconEdge, 1).strokeCircle(x + 22, 35, 13);
  scene.add.text(x + 22, 35, glyph, { fontSize: "13px", color: "#ffffff" }).setOrigin(.5).setDepth(11);
  scene.add.text(x + 42, 35, `${value}`, {
    fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: "#ffffff"
  }).setOrigin(0, .5).setDepth(11);
  if (!onPlus) return;
  const plus = scene.add.circle(x + width - 22, 35, 12, CHIP_NAVY_LIGHT, 1)
    .setStrokeStyle(1.6, CHIP_EDGE, .9)
    .setInteractive({ useHandCursor: true })
    .setDepth(11);
  scene.add.text(x + width - 22, 34, "+", {
    fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: "#ffffff"
  }).setOrigin(.5).setDepth(12);
  plus.on("pointerdown", () => {
    scene.tweens.add({ targets: plus, scale: .88, duration: 70, yoyo: true });
    onPlus();
  });
}

export function createWorldTopBar(scene: Phaser.Scene, initialLocation: string, mapColor = 0x55b7c7): WorldTopBar {
  const save = readSaveData();
  addRoundedPanel(scene, 472, 12, 336, 78, CHIP_NAVY, CHIP_EDGE, 27, .88, 1.8).setDepth(10);
  drawMapPin(scene, 519, 34, 0xffffff, CHIP_NAVY);
  const locationText = scene.add.text(652, 28, initialLocation, {
    fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: "#ffffff"
  }).setOrigin(.5).setDepth(11);
  const clockText = scene.add.text(640, 64, "", {
    fontFamily: THAI_FONT, fontSize: "12px", color: "#d3ecfa"
  }).setOrigin(.5).setDepth(11);

  createCurrencyChip(scene, 838, 148, 0xffc52e, 0xc8791c, "◉", save.coins ?? 0,
    () => scene.scene.start("ShopScene"));
  createCurrencyChip(scene, 995, 148, 0xf28fae, 0xd06285, "❁", save.conservationPoints ?? 0);

  addRoundedPanel(scene, 1151, 12, 117, 102, CHIP_NAVY, CHIP_EDGE, 24, .88, 1.8).setDepth(10);
  addRoundedPanel(scene, 1159, 51, 101, 54, mapColor, 0xa8e6e8, 14, .72, 1).setDepth(11);
  scene.add.text(1209, 29, "แผนที่", {
    fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#ffffff"
  }).setOrigin(.5).setDepth(12);
  const miniMapDot = scene.add.circle(1208, 78, 5, 0xf05e45).setStrokeStyle(1.5, 0xffffff).setDepth(13);
  return { locationText, clockText, miniMapDot };
}
