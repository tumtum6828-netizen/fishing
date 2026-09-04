import Phaser from "phaser";
import { SHOP_CATEGORIES, SHOP_ITEMS, type ShopCategory, type ShopItem } from "../data/shopData";
import { getAnglerLevel } from "../data/questData";
import { readSaveData, writeSaveData } from "../services/save";
import { BAIT_UNITS_PER_BUNDLE, readBaitStock } from "../services/bait";
import { THAI_FONT } from "../ui/worldHud";
import { addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { pageSlice } from "../ui/paging";

// พื้นที่รายการสินค้าสูงถึง y=626 เท่านั้น (ขอบล่างแผงรายละเอียด) การ์ดสูง 138 ระยะแถว 158
// จึงวางได้จริง 2 แถว = 4 ชิ้นต่อหน้า ถ้าวาดเกินนี้ของจะหลุดออกนอกแผงและกดไม่ได้
const CATALOG_COLUMNS = 2;
const CATALOG_ROWS = 2;
const CATALOG_PER_PAGE = CATALOG_COLUMNS * CATALOG_ROWS;

export class ShopScene extends Phaser.Scene {
  private category: ShopCategory = "equipment";
  private selectedItem: ShopItem = SHOP_ITEMS[0];
  private page = 0;
  private tabs!: Phaser.GameObjects.Container;
  private catalog!: Phaser.GameObjects.Container;
  private detail!: Phaser.GameObjects.Container;
  private coinsText!: Phaser.GameObjects.Text;
  private noticeText!: Phaser.GameObjects.Text;

  private readonly ink = GAME_THEME.ink;
  private readonly muted = GAME_THEME.muted;
  private readonly cream = GAME_THEME.cream;
  private readonly orange = GAME_THEME.orange;
  private readonly line = GAME_THEME.line;

  constructor() { super("ShopScene"); }

  create(): void {
    drawSoftBackdrop(this);
    this.drawRoundedPanel(48, 38, 1184, 644, this.cream, 0xe7c98d, 28, 1, 3);

    const header = this.add.graphics();
    header.fillStyle(0xf7b24d, 1).fillRoundedRect(51, 41, 1178, 88, 25);
    header.fillRect(51, 88, 1178, 41);
    this.add.circle(91, 82, 23, 0xffd889, .95);
    this.add.text(91, 82, "🎣", { fontSize: "24px" }).setOrigin(.5);
    this.add.text(126, 68, "ร้านอุปกรณ์ลุงมนัส", {
      fontFamily: THAI_FONT, fontSize: "27px", fontStyle: "bold", color: this.ink
    });
    this.add.text(127, 99, "ของดีริมอ่าว  •  เลือกของที่เหมาะกับการผจญภัย", {
      fontFamily: THAI_FONT, fontSize: "13px", color: "#76552f"
    });

    this.drawRoundedPanel(1000, 58, 126, 48, 0xfff6df, 0xe9c77d, 22, .96, 1.5);
    this.coinsText = this.add.text(1063, 82, "", {
      fontFamily: THAI_FONT, fontSize: "19px", fontStyle: "bold", color: this.ink
    }).setOrigin(.5);

    const close = this.add.circle(1182, 82, 24, 0xfff9ea).setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1182, 80, "×", { fontFamily: THAI_FONT, fontSize: "31px", color: this.ink }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start("WorldScene", { spawn: "shop" }));

    this.tabs = this.add.container();
    this.catalog = this.add.container();
    this.detail = this.add.container();
    this.noticeText = this.add.text(640, 648, "แตะสินค้าเพื่อดูรายละเอียด", {
      fontFamily: THAI_FONT, fontSize: "14px", color: this.muted
    }).setOrigin(.5);

    this.refreshCoins();
    this.renderTabs();
    this.renderCatalog();
  }

  private renderTabs(): void {
    this.tabs.removeAll(true);
    SHOP_CATEGORIES.forEach((entry, index) => {
      const active = entry.id === this.category;
      const x = 76 + index * 166;
      const width = 150;
      const panel = this.drawRoundedPanel(
        x, 146, width, 48,
        active ? this.orange : 0xfffdf7,
        active ? 0xe0902f : this.line,
        18, 1, active ? 2 : 1.25
      );
      const label = this.add.text(x + width / 2, 170, `${entry.icon}  ${entry.label}`, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: active ? "bold" : "normal", color: this.ink
      }).setOrigin(.5);
      const hit = this.add.zone(x, 146, width, 48).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.category = entry.id;
        this.page = 0;
        this.selectedItem = SHOP_ITEMS.find(item => item.category === entry.id) ?? SHOP_ITEMS[0];
        this.noticeText.setText("แตะสินค้าเพื่อดูรายละเอียด").setColor(this.muted);
        this.renderTabs();
        this.renderCatalog();
      });
      hit.on("pointerover", () => label.setColor("#b35f19"));
      hit.on("pointerout", () => label.setColor(this.ink));
      this.tabs.add([panel, label, hit]);
    });
  }

  private renderCatalog(): void {
    this.catalog.removeAll(true);
    const save = readSaveData();
    const playerLevel = getAnglerLevel(save.anglerXp, save.collectionCount);
    const items = SHOP_ITEMS.filter(item => item.category === this.category);

    const heading = this.add.text(78, 218, SHOP_CATEGORIES.find(entry => entry.id === this.category)?.label ?? "สินค้า", {
      fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: this.ink
    });
    const view = pageSlice(items, this.page, CATALOG_PER_PAGE);
    const pageCount = view.pageCount;
    this.page = view.page;
    const count = this.add.text(836, 221,
      pageCount > 1 ? `${items.length} รายการ  •  หน้า ${this.page + 1}/${pageCount}` : `${items.length} รายการ`, {
        fontFamily: THAI_FONT, fontSize: "13px", color: this.muted
      }).setOrigin(1, 0);
    const divider = this.add.graphics().lineStyle(1, this.line, .9)
      .beginPath().moveTo(78, 254).lineTo(838, 254).strokePath();
    this.catalog.add([heading, count, divider]);

    view.items.forEach((item, index) => {
      const col = index % CATALOG_COLUMNS;
      const row = Math.floor(index / CATALOG_COLUMNS);
      const x = 78 + col * 384;
      const y = 273 + row * 158;
      const selected = item.id === this.selectedItem.id;
      const locked = playerLevel < item.unlockLevel && !save.unlockedShopItems?.includes(item.id);
      const card = this.drawRoundedPanel(
        x, y, 366, 138,
        selected ? 0xfff1d4 : 0xffffff,
        selected ? 0xf0a33b : this.line,
        18, 1, selected ? 2.5 : 1.25
      );
      const iconBack = this.add.circle(x + 54, y + 67, 35, selected ? 0xffd78b : 0xf5efe2);
      const icon = this.add.text(x + 54, y + 66, item.icon, { fontSize: "37px" }).setOrigin(.5);
      const name = this.add.text(x + 105, y + 22, item.name, {
        fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: locked ? "#9b9388" : this.ink
      });
      const description = this.add.text(x + 105, y + 53, item.description, {
        fontFamily: THAI_FONT, fontSize: "13px", color: locked ? "#aaa399" : this.muted,
        wordWrap: { width: 238 }, maxLines: 2, lineSpacing: 3
      });
      const status = locked ? `🔒 ปลดล็อกเลเวล ${item.unlockLevel}` : `🪙 ${item.price}`;
      const statusText = this.add.text(x + 105, y + 107, status, {
        fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: locked ? "#9a7d65" : "#c56c1d"
      });
      const hit = this.add.zone(x, y, 366, 138).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.selectedItem = item;
        this.noticeText.setText("แตะสินค้าเพื่อดูรายละเอียด").setColor(this.muted);
        this.renderCatalog();
      });
      this.catalog.add([card, iconBack, icon, name, description, statusText, hit]);
    });
    if (pageCount > 1) this.renderCatalogPager(pageCount);
    this.renderDetail();
  }

  private renderCatalogPager(pageCount: number): void {
    ([["‹ ก่อนหน้า", -1], ["ถัดไป ›", 1]] as const).forEach(([label, step], index) => {
      const target = this.page + step;
      const enabled = target >= 0 && target < pageCount;
      const x = 78 + index * 218;
      const panel = this.drawRoundedPanel(x, 592, 148, 42,
        enabled ? 0xffffff : 0xefeade, this.line, 16, 1, 1.25);
      const text = this.add.text(x + 74, 613, label, {
        fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold",
        color: enabled ? this.ink : this.muted
      }).setOrigin(.5);
      this.catalog.add([panel, text]);
      if (!enabled) return;
      const hit = this.add.zone(x, 592, 148, 42).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.page = target;
        this.renderCatalog();
      });
      this.catalog.add(hit);
    });
  }

  private renderDetail(): void {
    this.detail.removeAll(true);
    const save = readSaveData();
    const coins = save.coins ?? 0;
    const level = getAnglerLevel(save.anglerXp, save.collectionCount);
    const baitStock = readBaitStock(save);
    const owned = this.selectedItem.category === "bait"
      ? baitStock[this.selectedItem.id] ?? 0
      : save.ownedShopItems?.[this.selectedItem.id] ?? 0;
    const locked = level < this.selectedItem.unlockLevel
      && !save.unlockedShopItems?.includes(this.selectedItem.id);
    const alreadyOwned = !this.selectedItem.stackable && owned > 0;

    const panel = this.drawRoundedPanel(864, 146, 338, 480, 0xfffdf7, this.line, 21, 1, 1.5);
    const sectionLabel = this.add.text(888, 170, "รายละเอียดสินค้า", {
      fontFamily: THAI_FONT, fontSize: "13px", color: this.muted
    });
    const levelPill = this.drawRoundedPanel(1095, 162, 82, 30, 0xf2ead9, 0xe0d1b5, 14, 1, 1);
    const levelText = this.add.text(1136, 177, `Lv.${this.selectedItem.unlockLevel}`, {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#7e6e59"
    }).setOrigin(.5);
    const preview = this.add.circle(1033, 255, 59, 0xfff0d2).setStrokeStyle(1.5, 0xefd09b);
    const icon = this.add.text(1033, 255, this.selectedItem.icon, { fontSize: "59px" }).setOrigin(.5);
    const name = this.add.text(1033, 329, this.selectedItem.name, {
      fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: this.ink,
      align: "center", wordWrap: { width: 286 }
    }).setOrigin(.5);
    const description = this.add.text(1033, 383, this.selectedItem.description, {
      fontFamily: THAI_FONT, fontSize: "14px", color: this.muted, align: "center",
      wordWrap: { width: 276 }, lineSpacing: 4
    }).setOrigin(.5);
    const ownedPill = this.drawRoundedPanel(948, 435, 170, 36, 0xe8f2e7, 0xc8ddc5, 16, 1, 1);
    const ownedLabel = this.selectedItem.category === "bait" ? `มีเหยื่อ ${owned} ชิ้น` : `มีแล้ว ${owned} ชิ้น`;
    const ownedText = this.add.text(1033, 453, ownedLabel, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#4e8064"
    }).setOrigin(.5);

    const canBuy = !locked && !alreadyOwned && coins >= this.selectedItem.price;
    const button = this.drawRoundedPanel(
      899, 526, 268, 62,
      canBuy ? this.orange : 0xe2ddd3,
      canBuy ? 0xe39231 : 0xcac2b6,
      22, 1, 1.5
    );
    const buttonLabel = locked ? `ปลดล็อกเมื่อถึง Lv.${this.selectedItem.unlockLevel}`
      : alreadyOwned ? "มีชิ้นนี้แล้ว" : coins < this.selectedItem.price ? "เหรียญไม่พอ" : `ซื้อเลย  •  🪙 ${this.selectedItem.price}`;
    const buttonText = this.add.text(1033, 557, buttonLabel, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: canBuy ? this.ink : "#8b8379"
    }).setOrigin(.5);
    const hit = this.add.zone(899, 526, 268, 62).setOrigin(0).setInteractive({ useHandCursor: canBuy });
    if (canBuy) hit.on("pointerdown", () => this.buySelected());

    this.detail.add([
      panel, sectionLabel, levelPill, levelText, preview, icon, name, description,
      ownedPill, ownedText, button, buttonText, hit
    ]);
  }

  private buySelected(): void {
    const save = readSaveData();
    const coins = save.coins ?? 0;
    if (coins < this.selectedItem.price) return;
    const ownedShopItems = { ...(save.ownedShopItems ?? {}) };
    ownedShopItems[this.selectedItem.id] = (ownedShopItems[this.selectedItem.id] ?? 0) + 1;
    const baitStock = readBaitStock(save);
    if (this.selectedItem.category === "bait") {
      baitStock[this.selectedItem.id] = (baitStock[this.selectedItem.id] ?? 0) + BAIT_UNITS_PER_BUNDLE;
    }
    writeSaveData({ coins: coins - this.selectedItem.price, ownedShopItems, baitStock });
    this.noticeText.setText(`ซื้อ ${this.selectedItem.name} สำเร็จแล้ว ✓`).setColor("#2f8b62");
    this.refreshCoins();
    this.renderCatalog();
  }

  private refreshCoins(): void {
    this.coinsText.setText(`🪙  ${readSaveData().coins ?? 0}`);
  }

  private drawRoundedPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    strokeColor: number,
    radius: number,
    alpha = 1,
    strokeWidth = 1.5
  ): Phaser.GameObjects.Graphics {
    return addRoundedPanel(this, x, y, width, height, fillColor, strokeColor, radius, alpha, strokeWidth);
  }
}
