import Phaser from "phaser";
import { FISH_PROFILES, RODS, SPECIES_INFO } from "../data/gameData";
import { FISH_ENVIRONMENT_WEIGHTS } from "../data/environmentData";
import { FISH_ART, getFishArt } from "../data/fishArt";
import { SPECIES_EDUCATION } from "../data/speciesEducation";
import { getAnglerLevel } from "../data/questData";
import { SHOP_ITEMS } from "../data/shopData";
import { readSaveData } from "../services/save";
import { getInventoryFishValue, readInventory } from "../services/inventory";
import type { FishInventoryStack } from "../services/save";
import { THAI_FONT } from "../ui/worldHud";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { getEquippedRodIndex } from "../services/equipment";
import { CHARACTER_PRESETS } from "../data/characterData";
import { getSelectedCharacter, isCharacterFinalized, readCharacterSelection, selectCharacterPreset } from "../services/character";
import type { CharacterGender } from "../types/character";
import { readEquippedFashion } from "../services/fashion";
import { createAvatarLayerSet, preloadAvatarAssets } from "../ui/avatarRenderer";

type MenuPage = "bag" | "character" | "dex" | "settings";
type BagCategory = "all" | "fish" | "trash" | "fashion";
type BagItem = { name: string; kind: "fish"; stack: FishInventoryStack }
  | { name: string; kind: "trash"; count: number }
  | { name: string; kind: "fashion"; count: number; icon: string };

const PAGE_LABELS: Record<MenuPage, { icon: string; label: string; title: string }> = {
  bag: { icon: "🎒", label: "กระเป๋า", title: "กระเป๋า" },
  character: { icon: "🧍", label: "ตัวละคร", title: "ตัวละคร" },
  dex: { icon: "📖", label: "สมุดสัตว์น้ำ", title: "สมุดสัตว์น้ำ" },
  settings: { icon: "⚙", label: "ตั้งค่า", title: "ตั้งค่า" }
};

export class PlayerMenuScene extends Phaser.Scene {
  private page: MenuPage = "bag";
  private bagCategory: BagCategory = "all";
  private bagLayer?: Phaser.GameObjects.Container;
  private bagDetailCard?: Phaser.GameObjects.Container;
  private dexDetailLayer?: Phaser.GameObjects.Container;
  private selectedBagKey?: string;
  private bagDetailFlipped = false;
  private characterGender?: CharacterGender;
  private readonly cream = GAME_THEME.cream;
  private readonly ink = GAME_THEME.ink;
  private readonly orange = GAME_THEME.orange;

  constructor() { super("PlayerMenuScene"); }

  preload(): void {
    preloadAvatarAssets(this);
    if (!this.textures.exists("fashion-straw-hat")) {
      this.load.image("fashion-straw-hat", "/assets/equipment/straw-hat-v1.png");
    }
    Object.values(SPECIES_EDUCATION).forEach(entry => {
      if (!this.textures.exists(entry.imageKey)) this.load.image(entry.imageKey, entry.imagePath);
    });
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
  }

  init(data?: { page?: MenuPage; bagCategory?: BagCategory; characterGender?: CharacterGender }): void {
    this.page = data?.page ?? "bag";
    this.bagCategory = data?.bagCategory ?? "all";
    this.characterGender = data?.characterGender;
  }

  create(): void {
    drawSoftBackdrop(this);
    this.drawShell();
    if (this.page === "bag") this.drawBag();
    else if (this.page === "character") this.drawCharacter();
    else if (this.page === "dex") this.drawDex();
    else this.drawSettings();
  }

  private drawShell(): void {
    addRoundedPanel(this, 48, 38, 1184, 644, this.cream, 0xe7c98d, 28, 1, 3);
    addRoundedPanel(this, 60, 50, 150, 620, 0xf5ead2, 0xe5d4b5, 23, 1, 1.25);
    (Object.keys(PAGE_LABELS) as MenuPage[]).forEach((key, index) => {
      const active = key === this.page;
      const y = 72 + index * 144;
      addRoundedPanel(this, 70, y, 130, 112, active ? this.orange : 0xfffdf7,
        active ? 0xe0902f : 0xded1b8, 24, 1, active ? 2 : 1.2);
      this.add.text(135, y + 33, PAGE_LABELS[key].icon, { fontSize: "28px" }).setOrigin(.5);
      this.add.text(135, y + 75, PAGE_LABELS[key].label, {
        fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: this.ink
      }).setOrigin(.5);
      addPillHitArea(this, 70, y, 130, 112, () => this.scene.restart({ page: key }));
    });

    this.add.text(245, 58, `${PAGE_LABELS[this.page].icon}  ${PAGE_LABELS[this.page].title}`, {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: this.ink
    });
    this.add.text(245, 97, "จัดการของสะสม อุปกรณ์ และข้อมูลการผจญภัย", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    const close = this.add.circle(1187, 75, 25, 0xfff9ea).setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1187, 73, "×", { fontFamily: THAI_FONT, fontSize: "31px", color: this.ink }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start("WorldScene"));
  }

  private drawBag(): void {
    this.bagLayer?.destroy(true);
    this.bagLayer = undefined;
    const existingObjects = new Set(this.children.list);
    const inventory = readInventory();
    const fishValue = getInventoryFishValue(inventory);
    this.drawBagTab(230, 135, "ทั้งหมด", "all");
    this.drawBagTab(375, 110, "สัตว์น้ำ", "fish");
    this.drawBagTab(495, 110, "ขยะ", "trash");
    this.drawBagTab(615, 110, "ชุด", "fashion");
    addRoundedPanel(this, 974, 126, 220, 54, fishValue > 0 ? this.orange : GAME_THEME.mutedFill,
      fishValue > 0 ? GAME_THEME.orangeDark : 0xbab2a5, 20, 1, 1.5);
    this.add.text(1090, 153, fishValue > 0 ? "🧺 เปิดตลาดปลา" : "ไม่มีสัตว์น้ำให้ขาย", {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: fishValue > 0 ? this.ink : "#847b70"
    }).setOrigin(.5);
    if (fishValue > 0) {
      addPillHitArea(this, 974, 126, 220, 54, () => {
        this.scene.start("MarketScene");
      });
    }

    const save = readSaveData();
    const allItems: BagItem[] = [
      ...Object.entries(inventory.fish).map(([name, stack]) => ({ name, kind: "fish" as const, stack })),
      ...Object.entries(inventory.trash).map(([name, count]) => ({ name, kind: "trash" as const, count })),
      ...SHOP_ITEMS.filter(item => item.category === "fashion")
        .map(item => ({
          name: item.name,
          kind: "fashion" as const,
          count: save.ownedShopItems?.[item.id] ?? 0,
          icon: item.icon
        }))
        .filter(item => item.count > 0)
    ];
    const items = this.bagCategory === "all"
      ? allItems
      : allItems.filter(item => item.kind === this.bagCategory);
    if (items.length === 0) {
      const emptyMessage = this.bagCategory === "fish" ? "ยังไม่มีสัตว์น้ำในกระเป๋า\nเลือกเก็บหลังตกสำเร็จ"
        : this.bagCategory === "trash" ? "ยังไม่มีขยะในกระเป๋า\nขยะมีโอกาสติดเบ็ดขึ้นมา"
          : this.bagCategory === "fashion" ? "ยังไม่มีชุด\nซื้อเครื่องแต่งกายได้ที่ร้านลุงมนัส"
            : "กระเป๋ายังว่าง\nออกตกปลาเพื่อเก็บสิ่งของ";
      this.add.text(700, 370, emptyMessage, {
        fontFamily: THAI_FONT, fontSize: "25px", color: "#8e887d", align: "center", lineSpacing: 10
      }).setOrigin(.5);
      this.commitBagLayer(existingObjects);
      return;
    }
    const bagKey = (item: BagItem) => `${item.kind}:${item.name}`;
    if (!items.some(item => bagKey(item) === this.selectedBagKey)) {
      this.selectedBagKey = bagKey(items[0]);
      this.bagDetailFlipped = false;
    }
    items.forEach((item, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 311 + col * 154;
      const y = 238 + row * 110;
      const selected = bagKey(item) === this.selectedBagKey;
      addRoundedPanel(this, x - 66, y - 49, 132, 98, selected ? 0xfff1d4 : 0xffffff,
        selected ? GAME_THEME.orangeDark
          : item.kind === "fish" ? 0x82909c : item.kind === "trash" ? 0x5a9f79 : 0xc58a55,
        17, 1, selected ? 2.5 : 1.5);
      if (item.kind === "fish") this.drawFishIcon(x, y - 17, item.name, false, .52);
      else if (item.kind === "trash") this.add.text(x, y - 17, "♻", { fontSize: "34px" }).setOrigin(.5);
      else this.add.text(x, y - 17, item.icon, { fontSize: "34px" }).setOrigin(.5);
      const quantity = item.kind === "fish" ? item.stack.count : item.count;
      this.add.text(x, y + 25, item.name, {
        fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: this.ink, align: "center",
        wordWrap: { width: 120 }
      }).setOrigin(.5);
      this.add.circle(x + 48, y - 34, 13, 0x4e514a, .92);
      this.add.text(x + 48, y - 34, `×${quantity}`, {
        fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: "#fff9e7"
      }).setOrigin(.5);
      addPillHitArea(this, x - 66, y - 49, 132, 98, () => {
        if (this.selectedBagKey === bagKey(item)) return;
        this.selectedBagKey = bagKey(item);
        this.bagDetailFlipped = false;
        this.drawBag();
      });
    });
    const selectedItem = items.find(item => bagKey(item) === this.selectedBagKey) ?? items[0];
    this.bagDetailCard = this.createBagDetailCard(selectedItem);
    this.commitBagLayer(existingObjects);
  }

  private createBagDetailCard(item: BagItem): Phaser.GameObjects.Container {
    const children: Phaser.GameObjects.GameObject[] = [];
    const card = this.add.container(1050, 417);
    const panel = this.add.graphics();
    panel.fillStyle(0xfffef9, 1).fillRoundedRect(-155, -210, 310, 420, 22);
    panel.lineStyle(1.5, GAME_THEME.line, 1).strokeRoundedRect(-155, -210, 310, 420, 22);
    children.push(panel);

    const education = item.kind === "fish" ? SPECIES_EDUCATION[item.name] : undefined;
    if (this.bagDetailFlipped && education) {
      const badge = this.add.text(0, -188, "🔎  โลกจริง • การเรียนรู้", {
        fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: "#39715f"
      }).setOrigin(.5);
      const photo = this.createCoverImage(0, -124, education.imageKey, 270, 104);
      const photoFrame = this.add.graphics();
      photoFrame.lineStyle(2, 0xffffff, 1).strokeRoundedRect(-137, -178, 274, 108, 14);
      const title = this.add.text(0, -54, item.name, {
        fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: this.ink
      }).setOrigin(.5);
      const scientificName = this.add.text(0, -27, education.scientificName, {
        fontFamily: "Georgia, serif", fontSize: "15px", fontStyle: "italic", color: "#557a6b"
      }).setOrigin(.5);
      const facts = this.add.text(-128, 1,
        `ลักษณะเด่น  ${education.appearance}\n`+
        `ถิ่นอาศัย  ${education.habitat}\n`+
        `อาหาร  ${education.diet}\n`+
        `ขนาด  ${education.commonSize}\n`+
        `สถานะ  ${education.conservationStatus}\n`+
        `เกร็ดน่ารู้  ${education.fieldNote}`,
        {
          fontFamily: THAI_FONT, fontSize: "12px", color: "#635b50", lineSpacing: 1,
          wordWrap: { width: 256 }
        }
      );
      const credit = this.add.text(22, 178, `${education.sourceLabel}\nภาพ: ${education.imageCredit}`, {
        fontFamily: THAI_FONT, fontSize: "9.5px", color: "#989083", align: "center", lineSpacing: 1
      }).setOrigin(.5);
      const backButton = this.add.circle(-126, 179, 18, 0xfff1d4)
        .setStrokeStyle(1.5, GAME_THEME.orangeDark);
      const backIcon = this.add.text(-126, 177, "←", {
        fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#8a5a28"
      }).setOrigin(.5);
      const backHitArea = this.add.zone(-126, 179, 42, 42).setInteractive({ useHandCursor: true });
      backHitArea.on("pointerdown", () => this.flipBagDetail());
      children.push(badge, photo, photoFrame, title, scientificName, facts, credit, backButton, backIcon, backHitArea);
    } else {
      const preview = this.add.circle(0, -132, 58, 0xfff1d4).setStrokeStyle(1.5, 0xefd09b);
      const title = this.add.text(0, -49, item.name, {
        fontFamily: THAI_FONT, fontSize: "25px", fontStyle: "bold", color: this.ink, align: "center"
      }).setOrigin(.5);
      const count = this.add.text(0, -3, "", {
        fontFamily: THAI_FONT, fontSize: "18px", color: "#4f7968", align: "center"
      }).setOrigin(.5);
      const stats = this.add.text(0, 72, "", {
        fontFamily: THAI_FONT, fontSize: "16px", color: "#766958", align: "center", lineSpacing: 8,
        wordWrap: { width: 270 }
      }).setOrigin(.5);
      children.push(preview, title, count, stats);

      if (item.kind === "fish") {
        children.push(this.drawFishIcon(0, -132, item.name, false, 1));
        count.setText(`เก็บไว้จำนวน ${item.stack.count}`);
        stats.setText(
          `น้ำหนักรวม ${item.stack.totalWeight.toFixed(2)} กก.\n`+
          `ตัวใหญ่สุด ${item.stack.bestWeight.toFixed(2)} กก.\n`+
          `♂ ตัวผู้ ${item.stack.sexCounts.male}   •   ♀ ตัวเมีย ${item.stack.sexCounts.female}\n`+
          `ขายทั้งหมดได้ ${item.stack.totalValue} เหรียญ`
        );
        if (education) this.addBagDetailButton(children, "📖  เรียนรู้เพิ่มเติม", 171, () => this.flipBagDetail());
      } else if (item.kind === "trash") {
        children.push(this.add.text(0, -132, "♻", { fontSize: "66px" }).setOrigin(.5));
        count.setText(`เก็บไว้ ${item.count} ชิ้น`);
        stats.setText("ขยะที่นำขึ้นจากแหล่งน้ำ\nเก็บไว้สำหรับภารกิจและระบบแลกของ");
      } else {
        children.push(this.add.text(0, -132, item.icon, { fontSize: "66px" }).setOrigin(.5));
        count.setText(`มีแล้ว ${item.count} ชิ้น`);
        stats.setText("เครื่องแต่งกายที่เป็นเจ้าของ\nเตรียมไว้สำหรับระบบแต่งตัวละคร");
      }
    }
    card.add(children);
    return card;
  }

  private addBagDetailButton(
    children: Phaser.GameObjects.GameObject[],
    label: string,
    y: number,
    onPress: () => void
  ): void {
    const background = this.add.graphics();
    background.fillStyle(0x4f9178, 1).fillRoundedRect(-103, y - 20, 206, 40, 18);
    background.lineStyle(1.5, 0x39715f, 1).strokeRoundedRect(-103, y - 20, 206, 40, 18);
    const text = this.add.text(0, y, label, {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: "#fffdf4"
    }).setOrigin(.5);
    const hitArea = this.add.zone(0, y, 206, 40).setInteractive({ useHandCursor: true });
    hitArea.on("pointerdown", onPress);
    children.push(background, text, hitArea);
  }

  private createCoverImage(
    x: number,
    y: number,
    textureKey: string,
    targetWidth: number,
    targetHeight: number
  ): Phaser.GameObjects.Image {
    const photo = this.add.image(x, y, textureKey);
    const sourceWidth = photo.frame.realWidth;
    const sourceHeight = photo.frame.realHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = targetWidth / targetHeight;

    if (sourceRatio > targetRatio) {
      const cropWidth = sourceHeight * targetRatio;
      photo.setCrop((sourceWidth - cropWidth) / 2, 0, cropWidth, sourceHeight);
      photo.setScale(targetHeight / sourceHeight);
    } else {
      const cropHeight = sourceWidth / targetRatio;
      photo.setCrop(0, (sourceHeight - cropHeight) / 2, sourceWidth, cropHeight);
      photo.setScale(targetWidth / sourceWidth);
    }
    return photo;
  }

  private flipBagDetail(): void {
    const card = this.bagDetailCard;
    if (!card || card.scaleX === 0) return;
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 130,
      ease: "Sine.In",
      onComplete: () => {
        this.bagDetailFlipped = !this.bagDetailFlipped;
        this.drawBag();
        const nextCard = this.bagDetailCard;
        if (!nextCard) return;
        nextCard.setScale(0, 1);
        this.tweens.add({ targets: nextCard, scaleX: 1, duration: 160, ease: "Back.Out" });
      }
    });
  }

  private drawCharacter(): void {
    const save = readSaveData();
    if (isCharacterFinalized(save)) {
      this.drawFinalizedCharacter();
      return;
    }
    const rod = RODS[getEquippedRodIndex(save)];
    const selected = getSelectedCharacter(save);
    const gender = this.characterGender ?? selected.gender;
    const presets = CHARACTER_PRESETS.filter(preset => preset.gender === gender);

    (["male", "female"] as CharacterGender[]).forEach((value, index) => {
      const active = value === gender;
      const x = 245 + index * 130;
      addRoundedPanel(this, x, 124, 116, 44, active ? this.orange : 0xffffff,
        active ? GAME_THEME.orangeDark : GAME_THEME.line, 17, 1, active ? 2 : 1.2);
      this.add.text(x + 58, 146, value === "male" ? "👦 ชาย" : "👧 หญิง", {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: active ? "bold" : "normal", color: this.ink
      }).setOrigin(.5);
      addPillHitArea(this, x, 124, 116, 44, () => this.scene.restart({
        page: "character", characterGender: value
      }));
    });

    this.add.text(510, 135, `เลือกได้ ${presets.length} แบบ • ไม่มีผลต่อค่าสถานะ`, {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    });
    presets.forEach((preset, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = 242 + col * 108;
      const y = 188 + row * 132;
      const active = preset.id === selected.id;
      addRoundedPanel(this, x, y, 96, 116, active ? 0xfff0cf : 0xffffff,
        active ? preset.accent : GAME_THEME.line, 18, 1, active ? 2.5 : 1.1);
      this.add.circle(x + 48, y + 39, 27, preset.accent, .22).setStrokeStyle(2, preset.accent, .8);
      createAvatarLayerSet(this, {
        x: x + 48, y: y + 71, width: 43, height: 65, originY: 1,
        tint: preset.tint, gender: preset.gender, baseVariant: preset.baseVariant, equipped: {}, pose: "idle"
      });
      this.add.text(x + 48, y + 77, preset.name, {
        fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: this.ink
      }).setOrigin(.5);
      this.add.text(x + 48, y + 98, preset.theme, {
        fontFamily: THAI_FONT, fontSize: "9px", color: GAME_THEME.muted
      }).setOrigin(.5);
      addPillHitArea(this, x, y, 96, 116, () => {
        selectCharacterPreset(preset.id);
        this.scene.restart({ page: "character", characterGender: gender });
      });
    });

    addRoundedPanel(this, 800, 124, 390, 426, 0xfffdf7, GAME_THEME.line, 22, 1, 1.4);
    this.add.text(825, 146, "ตัวละครที่เลือก", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    this.add.ellipse(995, 440, 230, 34, 0xded4c4, .68);
    createAvatarLayerSet(this, {
      x: 995, y: 444, width: 185, height: 278, originY: 1,
      tint: selected.tint, gender: selected.gender, baseVariant: selected.baseVariant, equipped: {}, pose: "idle"
    });
    addRoundedPanel(this, 876, 454, 238, 55, 0xfff0cf, selected.accent, 18, 1, 1.3);
    this.add.text(995, 472, `${selected.gender === "male" ? "👦" : "👧"} ${selected.name}`, {
      fontFamily: THAI_FONT, fontSize: "19px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(995, 494, `ธีม ${selected.theme}`, {
      fontFamily: THAI_FONT, fontSize: "11px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.add.text(995, 528, "ยืนยันได้ครั้งเดียวก่อนเริ่มผจญภัย", {
      fontFamily: THAI_FONT, fontSize: "10px", color: "#9b8f7e"
    }).setOrigin(.5);

    addRoundedPanel(this, 242, 468, 252, 82, 0xffffff, GAME_THEME.line, 18, 1, 1.2);
    this.add.text(368, 490, `🎣 ${rod.name} Lv.${rod.level}`, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(368, 527, "จัดอุปกรณ์  ›", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#2f7b69"
    }).setOrigin(.5);
    addPillHitArea(this, 242, 468, 252, 82, () => this.scene.start("EquipmentScene"));
    addRoundedPanel(this, 510, 468, 252, 82, 0xffffff, GAME_THEME.line, 18, 1, 1.2);
    this.add.text(636, 494, "🧢 ชุดและเครื่องแต่งกาย", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(636, 527, "เตรียมระบบไว้แล้ว", {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    }).setOrigin(.5);

    addRoundedPanel(this, 230, 575, 975, 87, 0xffffff, GAME_THEME.line, 20);
    const level = getAnglerLevel(save.anglerXp, save.collectionCount);
    const levelProgress = save.anglerXp !== undefined
      ? (Math.max(0, save.anglerXp) % 100) / 100
      : Math.min((save.collectionCount ?? 0) / 10, 1);
    const progress = Math.min(levelProgress, 1);
    addRoundedPanel(this, 270, 631, 700, 12, 0xe8e4dc, 0xe8e4dc, 6, 1, 0);
    addRoundedPanel(this, 270, 631, 700 * progress, 12, this.orange, this.orange, 6, 1, 0);
    this.add.text(270, 596, `เลเวลนักตกปลา Lv.${level}  •  EXP ${save.anglerXp ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: this.ink
    });
    addRoundedPanel(this, 996, 597, 178, 42, this.orange, GAME_THEME.orangeDark, 16, 1, 1.5);
    this.add.text(1085, 618, "🎁 รางวัลเลเวล", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    addPillHitArea(this, 996, 597, 178, 42, () => this.scene.start("LevelRewardScene"));
  }

  private drawFinalizedCharacter(): void {
    const save = readSaveData();
    const selected = getSelectedCharacter(save);
    const equippedFashion = readEquippedFashion(save);
    const playerName = readCharacterSelection(save).playerName ?? selected.name;
    const rod = RODS[getEquippedRodIndex(save)];
    addRoundedPanel(this, 230, 122, 460, 430, 0xfffdf7, GAME_THEME.line, 23, 1, 1.4);
    this.add.text(258, 145, "ตัวละครหลัก", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });
    this.add.ellipse(460, 465, 245, 37, 0xded4c4, .7);
    createAvatarLayerSet(this, {
      x: 460, y: 325, width: 220, height: 330, originY: .54,
      tint: selected.tint, gender: selected.gender, baseVariant: selected.baseVariant, equipped: equippedFashion, pose: "idle"
    });
    if (equippedFashion.shoes) {
      this.add.text(460, 462, "👟", { fontSize: "34px" }).setOrigin(.5);
    }
    addRoundedPanel(this, 340, 472, 240, 58, 0xfff0cf, selected.accent, 19, 1, 1.4);
    this.add.text(460, 490, `${selected.gender === "male" ? "👦" : "👧"} ${playerName}`, {
      fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(460, 514, `รูปแบบ ${selected.name} • ธีม ${selected.theme}`, {
      fontFamily: THAI_FONT, fontSize: "11px", color: GAME_THEME.muted
    }).setOrigin(.5);

    addRoundedPanel(this, 714, 138, 238, 148, 0xffffff, GAME_THEME.line, 20, 1, 1.2);
    this.add.text(833, 174, `🎣 ${rod.name} Lv.${rod.level}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(833, 218, rod.allowsLegendary ? "รองรับปลาตำนาน" : "จำกัดชนิดปลาตามระดับ", {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.add.text(833, 258, "จัดอุปกรณ์  ›", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#2f7b69"
    }).setOrigin(.5);
    addPillHitArea(this, 714, 138, 238, 148, () => this.scene.start("EquipmentScene"));

    addRoundedPanel(this, 970, 138, 234, 148, 0xffffff, GAME_THEME.line, 20, 1, 1.2);
    this.add.text(1087, 181, "🧢 เครื่องแต่งกาย", {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    this.add.text(1087, 224, "หมวก • ชุด • รองเท้า", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.add.text(1087, 258, `${Object.keys(equippedFashion).length} ชิ้นกำลังสวม  ›`, {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#2f7b69"
    }).setOrigin(.5);
    addPillHitArea(this, 970, 138, 234, 148, () => this.scene.start("WardrobeScene"));

    addRoundedPanel(this, 714, 310, 490, 176, 0xffffff, GAME_THEME.line, 20, 1, 1.2);
    this.add.text(744, 340, "ค่าสถานะนักตกปลา", {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: this.ink
    });
    this.add.text(744, 385, `🐟 ตกสำเร็จ ${save.collectionCount ?? 0} ครั้ง   •   ♻ แต้มอนุรักษ์ ${save.conservationPoints ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });
    this.add.text(744, 428, "รูปลักษณ์ไม่มีผลต่อพลังหรือโอกาสได้ปลา", {
      fontFamily: THAI_FONT, fontSize: "12px", color: "#6f8b78"
    });

    addRoundedPanel(this, 230, 575, 975, 87, 0xffffff, GAME_THEME.line, 20);
    const level = getAnglerLevel(save.anglerXp, save.collectionCount);
    const levelProgress = save.anglerXp !== undefined
      ? (Math.max(0, save.anglerXp) % 100) / 100
      : Math.min((save.collectionCount ?? 0) / 10, 1);
    addRoundedPanel(this, 270, 631, 700, 12, 0xe8e4dc, 0xe8e4dc, 6, 1, 0);
    addRoundedPanel(this, 270, 631, 700 * Math.min(levelProgress, 1), 12, this.orange, this.orange, 6, 1, 0);
    this.add.text(270, 596, `เลเวลนักตกปลา Lv.${level}  •  EXP ${save.anglerXp ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: this.ink
    });
    addRoundedPanel(this, 996, 597, 178, 42, this.orange, GAME_THEME.orangeDark, 16, 1, 1.5);
    this.add.text(1085, 618, "🎁 รางวัลเลเวล", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);
    addPillHitArea(this, 996, 597, 178, 42, () => this.scene.start("LevelRewardScene"));
  }

  private drawDex(): void {
    const save = readSaveData();
    const discovered = new Set(save.discoveredSpecies ?? []);
    const records = new Map(save.records ?? []);
    addRoundedPanel(this, 230, 118, 975, 70, 0xffffff, GAME_THEME.line, 20);
    this.add.text(255, 131, `ค้นพบแล้ว ${discovered.size}/${Object.keys(SPECIES_INFO).length} ชนิด`, {
      fontFamily: THAI_FONT, fontSize: "24px", fontStyle: "bold", color: this.ink
    });
    this.add.text(255, 164, `ตกสำเร็จทั้งหมด ${save.collectionCount ?? 0} ครั้ง • ♻ คะแนนอนุรักษ์ ${save.conservationPoints ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "18px", color: "#777168"
    });

    Object.keys(SPECIES_INFO).forEach((name, index) => {
      const found = discovered.has(name);
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 350 + col * 225;
      const y = 290 + row * 190;
      const legendary = name === "ปลากระโทงดาบ";
      const biomes = legendary ? ["coast"] : (FISH_ENVIRONMENT_WEIGHTS[name]?.biomes ?? []);
      const location = biomes.length === 2
        ? "ชายฝั่ง • ลำธาร"
        : biomes[0] === "river" ? "ลำธาร" : "ชายฝั่ง";
      addRoundedPanel(this, x - 102.5, y - 84, 205, 168, 0xffffff,
        found ? (legendary ? 0xaa75c8 : 0x82909c) : 0xc5c2b8, 20, 1, 2);
      this.drawFishIcon(x, y - 35, name, !found);
      this.add.text(x, y + 15, found ? name : "???", {
        fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: this.ink
      }).setOrigin(.5);
      this.add.text(x, y + 43, found ? (legendary ? "👑 ตำนาน" : "☆ ทั่วไป") : "ยังไม่ค้นพบ", {
        fontFamily: THAI_FONT, fontSize: "16px", color: found && legendary ? "#8b4ba7" : "#777168"
      }).setOrigin(.5);
      this.add.text(x, y + 64, found ? `${location} • ใหญ่สุด ${(records.get(name) ?? 0).toFixed(2)} กก.` : "สำรวจเพื่อปลดล็อก", {
        fontFamily: THAI_FONT, fontSize: "12px", color: "#918a80"
      }).setOrigin(.5);
      if (found) {
        addPillHitArea(this, x - 102.5, y - 84, 205, 168, () => {
          this.showDexSpeciesDetails(name, records.get(name) ?? 0);
        });
      }
    });
  }

  private showDexSpeciesDetails(name: string, recordWeight: number): void {
    const education = SPECIES_EDUCATION[name];
    if (!education) return;
    this.dexDetailLayer?.destroy(true);
    const existingObjects = new Set(this.children.list);
    const closeDetails = () => {
      const layer = this.dexDetailLayer;
      if (!layer) return;
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 130,
        onComplete: () => {
          layer.destroy(true);
          if (this.dexDetailLayer === layer) this.dexDetailLayer = undefined;
        }
      });
    };

    const veil = this.add.rectangle(720, 390, 1010, 570, 0x143f49, .48).setInteractive();
    veil.on("pointerdown", closeDetails);
    addRoundedPanel(this, 255, 120, 950, 542, 0xfffdf7, 0xd5b879, 26, 1, 2);
    const modalHitArea = this.add.zone(730, 391, 950, 542).setInteractive();
    modalHitArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, 290, 640) <= 30) closeDetails();
    });

    this.add.text(305, 153, `📖  ${name}`, {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: this.ink
    });
    this.add.text(305, 193, education.scientificName, {
      fontFamily: "Georgia, serif", fontSize: "17px", fontStyle: "italic", color: "#557a6b"
    });
    const backButton = this.add.circle(290, 640, 18, 0xfff1d4)
      .setStrokeStyle(1.5, GAME_THEME.orangeDark)
      .setInteractive({ useHandCursor: true });
    backButton.on("pointerdown", closeDetails);
    this.add.text(290, 638, "←", {
      fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#8a5a28"
    }).setOrigin(.5);

    addRoundedPanel(this, 285, 220, 430, 265, 0xf1eadc, 0xddcda9, 20, 1, 1.2);
    this.createCoverImage(500, 350, education.imageKey, 402, 237);
    this.add.text(500, 504, `ภาพ: ${education.imageCredit}`, {
      fontFamily: THAI_FONT, fontSize: "10.5px", color: "#8e8679", align: "center"
    }).setOrigin(.5);

    addRoundedPanel(this, 742, 220, 433, 300, 0xfffbf1, 0xe3d7bd, 20, 1, 1);
    this.add.text(770, 242,
      `ลักษณะเด่น\n${education.appearance}\n\n`+
      `ถิ่นอาศัย\n${education.habitat}\n\n`+
      `อาหาร\n${education.diet}`,
      {
        fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: this.ink,
        lineSpacing: 2, wordWrap: { width: 377 }
      }
    );

    addRoundedPanel(this, 330, 535, 845, 96, GAME_THEME.paleGreen, 0xc4d9c5, 20, 1, 1);
    this.add.text(356, 551,
      `ขนาดที่พบบ่อย  ${education.commonSize}     •     สถานะ  ${education.conservationStatus}\n`+
      `เกร็ดน่ารู้  ${education.fieldNote}\n`+
      `สถิติของคุณ  ตัวใหญ่สุด ${recordWeight.toFixed(2)} กก.     •     ${education.sourceLabel}`,
      {
        fontFamily: THAI_FONT, fontSize: "14px", color: "#4d6659", lineSpacing: 5,
        wordWrap: { width: 790 }
      }
    );

    const detailObjects = this.children.list.filter(gameObject => !existingObjects.has(gameObject));
    this.dexDetailLayer = this.add.container(0, 0, detailObjects).setAlpha(0);
    this.tweens.add({ targets: this.dexDetailLayer, alpha: 1, duration: 160, ease: "Sine.Out" });
  }

  private drawSettings(): void {
    [["🔊 เสียง", "เปิด"], ["📳 การสั่น", "เปิด"], ["🌐 ภาษา", "ไทย"], ["💾 บันทึกเกม", "อัตโนมัติ"]].forEach(([label, value], index) => {
      const y = 165 + index * 105;
      addRoundedPanel(this, 280, y - 39, 900, 78, 0xffffff, GAME_THEME.line, 20);
      this.add.text(310, y, label, { fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: this.ink }).setOrigin(0, .5);
      this.add.text(1110, y, value, { fontFamily: THAI_FONT, fontSize: "21px", color: "#5e766b" }).setOrigin(1, .5);
    });
  }

  private drawBagTab(x: number, width: number, label: string, category: BagCategory): void {
    const active = this.bagCategory === category;
    addRoundedPanel(this, x, 126, width, 54, active ? this.orange : 0xffffff,
      active ? GAME_THEME.orangeDark : GAME_THEME.line, 20, 1, active ? 2 : 1.25);
    this.add.text(x + width / 2, 153, label, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: active ? "bold" : "normal", color: this.ink
    }).setOrigin(.5);
    addPillHitArea(this, x, 126, width, 54, () => {
      if (this.bagCategory === category) return;
      this.bagCategory = category;
      this.selectedBagKey = undefined;
      this.bagDetailFlipped = false;
      this.drawBag();
    });
  }

  private commitBagLayer(existingObjects: Set<Phaser.GameObjects.GameObject>): void {
    const bagObjects = this.children.list.filter(gameObject => !existingObjects.has(gameObject));
    this.bagLayer = this.add.container(0, 0, bagObjects);
  }

  private drawPill(x: number, y: number, width: number, label: string, active = false): void {
    addRoundedPanel(this, x, y - 27, width, 54, active ? this.orange : 0xffffff,
      active ? GAME_THEME.orangeDark : GAME_THEME.line, 20, 1, active ? 2 : 1.25);
    this.add.text(x + width / 2, y, label, {
      fontFamily: THAI_FONT, fontSize: "19px", fontStyle: active ? "bold" : "normal", color: this.ink
    }).setOrigin(.5);
  }

  private drawFishIcon(x: number, y: number, name: string, locked: boolean, scale = 1): Phaser.GameObjects.GameObject {
    const g = this.add.graphics();
    const colors: Record<string, number> = {
      "ปลากระบอก": 0xaec8bd,
      "ปลากะพงขาว": 0xc9d8d2,
      "ปลาทู": 0x6e9fb0,
      "กุ้งก้ามกราม": 0x62aeb5,
      "ปูม้า": 0x4e91b1,
      "หอยแครง": 0xb76d4c,
      "หอยกาบเอเชีย": 0xcba675,
      "ปลากระโทงดาบ": 0x4d7fa7
    };
    const color = locked ? 0xaaa9a2 : (colors[name] ?? 0x9db7ae);
    const kind = name === "ปลากระโทงดาบ"
      ? "fish"
      : (FISH_PROFILES.find(profile => profile.name === name)?.kind ?? "fish");

    const fishArt = getFishArt(name);
    if (fishArt && this.textures.exists(fishArt.textureKey)) {
      g.destroy();
      const width = fishArt.previewWidth * scale;
      const image = this.add.image(x, y, fishArt.textureKey)
        .setDisplaySize(width, width * fishArt.aspectRatio);
      if (locked) image.setTintFill(0xaaa9a2).setAlpha(.82);
      return image;
    }

    if (kind === "crustacean" && name === "ปูม้า") {
      g.lineStyle(Math.max(2, 3 * scale), color, 1);
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(x + side * 22 * scale, y - 4 * scale);
        g.lineTo(x + side * 43 * scale, y - 20 * scale);
        g.lineTo(x + side * 52 * scale, y - 14 * scale);
        g.moveTo(x + side * 26 * scale, y + 4 * scale);
        g.lineTo(x + side * 47 * scale, y + 14 * scale);
        g.moveTo(x + side * 18 * scale, y + 10 * scale);
        g.lineTo(x + side * 36 * scale, y + 27 * scale);
        g.strokePath();
      }
      g.fillStyle(color).fillEllipse(x, y, 66 * scale, 42 * scale);
      g.fillCircle(x - 13 * scale, y - 21 * scale, 5 * scale);
      g.fillCircle(x + 13 * scale, y - 21 * scale, 5 * scale);
      if (!locked) {
        g.fillStyle(0xf3f0e8).fillCircle(x - 13 * scale, y - 21 * scale, 2.2 * scale);
        g.fillCircle(x + 13 * scale, y - 21 * scale, 2.2 * scale);
      }
      return g;
    }

    if (kind === "crustacean") {
      g.lineStyle(Math.max(1.5, 2 * scale), color, 1);
      g.beginPath();
      g.moveTo(x + 20 * scale, y - 9 * scale);
      g.lineTo(x + 47 * scale, y - 30 * scale);
      g.moveTo(x + 22 * scale, y - 5 * scale);
      g.lineTo(x + 52 * scale, y - 17 * scale);
      g.strokePath();
      g.fillStyle(color);
      for (let i = 0; i < 5; i += 1) {
        g.fillEllipse(x - i * 11 * scale, y + i * 2 * scale, (31 - i * 2) * scale, 26 * scale);
      }
      g.fillTriangle(
        x - 52 * scale, y + 7 * scale,
        x - 72 * scale, y - 5 * scale,
        x - 68 * scale, y + 18 * scale
      );
      if (!locked) g.fillStyle(0x273d46).fillCircle(x + 9 * scale, y - 7 * scale, 3 * scale);
      return g;
    }

    if (kind === "mollusk") {
      g.fillStyle(color).fillEllipse(x, y + 4 * scale, 82 * scale, 58 * scale);
      g.lineStyle(Math.max(1.5, 2 * scale), locked ? 0xaaa9a2 : 0x765443, .82);
      g.strokeEllipse(x, y + 4 * scale, 82 * scale, 58 * scale);
      if (!locked) {
        for (const offset of [-28, -14, 0, 14, 28]) {
          g.beginPath();
          g.moveTo(x, y - 23 * scale);
          g.lineTo(x + offset * scale, y + 25 * scale);
          g.strokePath();
        }
      }
      return g;
    }

    g.fillStyle(color).fillEllipse(x, y, 88 * scale, 42 * scale);
    g.fillTriangle(
      x - 40 * scale, y,
      x - 72 * scale, y - 27 * scale,
      x - 72 * scale, y + 27 * scale
    );
    if (!locked) g.fillStyle(0x273d46).fillCircle(x + 27 * scale, y - 7 * scale, 4 * scale);
    if (name === "ปลากระโทงดาบ" && !locked) {
      g.fillRect(x + 37 * scale, y - 3 * scale, 55 * scale, 6 * scale);
    }
    return g;
  }
}
