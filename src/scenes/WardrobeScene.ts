import Phaser from "phaser";
import { FASHION_DEFINITIONS, FASHION_SLOTS, fashionItemsInSlot } from "../data/fashionData";
import { SHOP_ITEMS } from "../data/shopData";
import { getSelectedCharacter, readCharacterSelection } from "../services/character";
import { readEquippedFashion, toggleFashionItem } from "../services/fashion";
import { readSaveData } from "../services/save";
import type { FashionDefinition, FashionSlot } from "../types/fashion";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";
import { createAvatarLayerSet, preloadAvatarAssets } from "../ui/avatarRenderer";
import { createAvatarPreview, type AvatarPreviewController } from "../ui/avatarPreview";
import { pageSlice } from "../ui/paging";

const COLUMNS = 3;
const ROWS = 3;
const GAP = 17;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 122;
const GRID_LEFT = 548;
const GRID_TOP = 221;

export class WardrobeScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private notice!: Phaser.GameObjects.Text;
  private preview?: AvatarPreviewController;
  private previewWalking = false;
  private activeSlot: FashionSlot = "hat";
  private page = 0;

  constructor() { super("WardrobeScene"); }

  init(): void {
    this.preview = undefined;
    this.previewWalking = false;
    this.activeSlot = "hat";
    this.page = 0;
  }

  preload(): void {
    preloadAvatarAssets(this);
    // โหลดภาพตัวอย่างตามข้อมูล ไม่ผูกกับไอเทมชิ้นใดเป็นพิเศษ เพิ่มของใหม่แล้วโหลดตามเอง
    FASHION_DEFINITIONS.forEach(definition => {
      const texture = definition.previewTexture;
      if (texture && !this.textures.exists(texture.key)) this.load.image(texture.key, texture.path);
    });
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.preview = undefined; });
    drawSoftBackdrop(this);
    addRoundedPanel(this, 48, 38, 1184, 644, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);

    const back = this.add.circle(83, 80, 25, 0xfffdf7)
      .setStrokeStyle(1.5, GAME_THEME.line).setInteractive({ useHandCursor: true });
    this.add.text(83, 78, "‹", {
      fontFamily: THAI_FONT, fontSize: "35px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    back.on("pointerdown", () => this.scene.start("PlayerMenuScene", { page: "character" }));

    this.add.text(126, 62, "ตู้เสื้อผ้า", {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(126, 98, "เปลี่ยนได้เฉพาะเครื่องแต่งกาย • ไม่มีผลต่อค่าสถานะ", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });

    this.content = this.add.container();
    this.notice = this.add.text(640, 649, "แตะของที่เป็นเจ้าของเพื่อสวม หรือแตะอีกครั้งเพื่อถอด", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.render();
  }

  update(_time: number, delta: number): void {
    this.preview?.update(delta);
  }

  private render(): void {
    this.preview = undefined;
    this.content.removeAll(true);
    const save = readSaveData();
    const selected = getSelectedCharacter(save);
    const playerName = readCharacterSelection(save).playerName ?? selected.name;
    const equipped = readEquippedFashion(save);

    const preview = addRoundedPanel(this, 82, 145, 438, 458, 0xfffdf7, GAME_THEME.line, 24, 1, 1.4);
    const title = this.add.text(111, 164, `👤  ${playerName}`, {
      fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: GAME_THEME.ink
    });
    const shadow = this.add.ellipse(302, 515, 218, 24, 0xded4c4, .72);
    const avatar = createAvatarLayerSet(this, {
      x: 302, y: 374, width: 200, height: 300, originY: .54,
      tint: selected.tint, gender: selected.gender, baseVariant: selected.baseVariant, equipped, pose: "idle"
    });
    this.preview = createAvatarPreview(avatar, 374, this.previewWalking);
    const wornCount = Object.keys(equipped).length;
    const status = this.add.text(302, 535, wornCount > 0 ? `กำลังสวม ${wornCount} ชิ้น` : "ยังไม่ได้สวมเครื่องแต่งกาย", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold",
      color: wornCount > 0 ? GAME_THEME.greenText : GAME_THEME.muted
    }).setOrigin(.5);
    this.content.add([preview, title, shadow, ...avatar.objects, status]);

    [false, true].forEach((walking, index) => {
      const active = walking === this.previewWalking;
      const x = 174 + index * 132;
      const button = addRoundedPanel(this, x, 553, 124, 38,
        active ? GAME_THEME.teal : 0xffffff, active ? GAME_THEME.teal : GAME_THEME.line, 15, 1, 1.2);
      const label = this.add.text(x + 62, 572, walking ? "เดิน" : "ยืน", {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold",
        color: active ? "#ffffff" : GAME_THEME.ink
      }).setOrigin(.5);
      const hit = addPillHitArea(this, x, 553, 124, 38, () => {
        if (this.previewWalking === walking) return;
        this.previewWalking = walking;
        this.render();
      });
      this.content.add([button, label, hit]);
    });

    this.drawSlotTabs(equipped);
    this.drawItemGrid();
  }

  private drawSlotTabs(equipped: ReturnType<typeof readEquippedFashion>): void {
    FASHION_SLOTS.forEach((slot, index) => {
      const width = 154;
      const x = GRID_LEFT + index * (width + 6);
      const active = slot.id === this.activeSlot;
      const worn = Boolean(equipped[slot.id]);
      const panel = addRoundedPanel(this, x, 145, width, 60,
        active ? GAME_THEME.teal : 0xffffff, active ? GAME_THEME.teal : GAME_THEME.line, 16, 1, active ? 2.4 : 1.2);
      const icon = this.add.text(x + 28, 175, slot.icon, { fontSize: "22px" }).setOrigin(.5);
      const label = this.add.text(x + 50, 161, slot.label, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold",
        color: active ? "#ffffff" : GAME_THEME.ink
      });
      const count = this.add.text(x + 50, 183, worn ? "สวมอยู่" : `${fashionItemsInSlot(slot.id).length} ชิ้น`, {
        fontFamily: THAI_FONT, fontSize: "11px",
        color: active ? "#dff6ef" : worn ? GAME_THEME.greenText : GAME_THEME.muted
      });
      const hit = addPillHitArea(this, x, 145, width, 60, () => {
        if (this.activeSlot === slot.id) return;
        this.activeSlot = slot.id;
        this.page = 0;
        this.render();
      });
      this.content.add([panel, icon, label, count, hit]);
    });
  }

  private drawItemGrid(): void {
    const items = fashionItemsInSlot(this.activeSlot);
    const view = pageSlice(items, this.page, COLUMNS * ROWS);
    this.page = view.page;

    if (items.length === 0) {
      const slotLabel = FASHION_SLOTS.find(slot => slot.id === this.activeSlot)?.label ?? "";
      const panel = addRoundedPanel(this, GRID_LEFT, GRID_TOP, 634, 382, 0xfffdf7, GAME_THEME.line, 22, 1, 1.3);
      const text = this.add.text(GRID_LEFT + 317, GRID_TOP + 191,
        `ยังไม่มี${slotLabel}ในเกม\nจะเพิ่มในอัปเดตถัดไป`, {
          fontFamily: THAI_FONT, fontSize: "16px", color: GAME_THEME.muted, align: "center"
        }).setOrigin(.5);
      this.content.add([panel, text]);
      return;
    }

    view.items.forEach((definition, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      this.drawItemCard(
        definition,
        GRID_LEFT + column * (CARD_WIDTH + GAP),
        GRID_TOP + row * (CARD_HEIGHT + GAP)
      );
    });

    if (view.pageCount > 1) this.drawPager(view.pageCount);
  }

  private drawPager(pageCount: number): void {
    ([["‹", -1], ["›", 1]] as const).forEach(([glyph, step], index) => {
      const x = GRID_LEFT + index * 574;
      const target = this.page + step;
      const enabled = target >= 0 && target < pageCount;
      const button = addRoundedPanel(this, x, 617, 60, 40,
        enabled ? 0xffffff : 0xefeade, GAME_THEME.line, 14, 1, 1.2);
      const label = this.add.text(x + 30, 636, glyph, {
        fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold",
        color: enabled ? GAME_THEME.ink : GAME_THEME.muted
      }).setOrigin(.5);
      this.content.add([button, label]);
      if (!enabled) return;
      this.content.add(addPillHitArea(this, x, 617, 60, 40, () => {
        this.page = target;
        this.render();
      }));
    });
    this.content.add(this.add.text(GRID_LEFT + 317, 636, `หน้า ${this.page + 1} / ${pageCount}`, {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: GAME_THEME.muted
    }).setOrigin(.5));
  }

  private drawItemCard(definition: FashionDefinition, x: number, y: number): void {
    const save = readSaveData();
    const equipped = readEquippedFashion(save);
    const shopItem = SHOP_ITEMS.find(item => item.id === definition.itemId);
    const owned = (save.ownedShopItems?.[definition.itemId] ?? 0) > 0;
    const active = equipped[definition.slot] === definition.itemId;

    const panel = addRoundedPanel(this, x, y, CARD_WIDTH, CARD_HEIGHT,
      active ? GAME_THEME.paleGreen : 0xffffff,
      active ? GAME_THEME.teal : GAME_THEME.line, 18, 1, active ? 2.4 : 1.2);
    const iconCircle = this.add.circle(x + CARD_WIDTH / 2, y + 44, 34,
      active ? 0xd9ede1 : 0xfff0d6).setStrokeStyle(1.2, active ? 0x8fc3a5 : 0xe7c98d);
    const texture = definition.previewTexture;
    const artwork: Phaser.GameObjects.GameObject = texture && this.textures.exists(texture.key)
      ? this.fitPreview(this.add.image(x + CARD_WIDTH / 2, y + 44, texture.key), 56)
      : this.add.text(x + CARD_WIDTH / 2, y + 44, definition.worldIcon, { fontSize: "32px" }).setOrigin(.5);
    const name = this.add.text(x + CARD_WIDTH / 2, y + 82, shopItem?.name ?? definition.itemId, {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: GAME_THEME.ink,
      align: "center", wordWrap: { width: CARD_WIDTH - 22 }
    }).setOrigin(.5, 0);
    const state = this.add.text(x + CARD_WIDTH / 2, y + CARD_HEIGHT - 15,
      active ? "กำลังสวม • แตะเพื่อถอด" : owned ? "แตะเพื่อสวม" : "ซื้อที่ร้านลุงมนัส", {
        fontFamily: THAI_FONT, fontSize: "11px", fontStyle: "bold",
        color: active ? GAME_THEME.greenText : owned ? GAME_THEME.ink : GAME_THEME.muted
      }).setOrigin(.5);

    this.content.add([panel, iconCircle, artwork, name, state]);
    if (!owned) return;
    this.content.add(addPillHitArea(this, x, y, CARD_WIDTH, CARD_HEIGHT, () => {
      const result = toggleFashionItem(definition.itemId);
      this.notice.setText(result.message).setColor(result.ok ? GAME_THEME.greenText : "#b45c50");
      this.render();
    }));
  }

  /** ย่อภาพตัวอย่างให้พอดีกรอบโดยคงสัดส่วนจริง ไม่บีบให้ผิดรูป */
  private fitPreview(image: Phaser.GameObjects.Image, box: number): Phaser.GameObjects.Image {
    const scale = Math.min(box / image.width, box / image.height);
    return image.setDisplaySize(image.width * scale, image.height * scale);
  }
}
