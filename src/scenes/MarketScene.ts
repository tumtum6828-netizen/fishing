import Phaser from "phaser";
import { FISH_ART, getFishArt } from "../data/fishArt";
import { getMarketListings, readMarketData, sellFishAtMarket } from "../services/market";
import { readSaveData } from "../services/save";
import type { MarketListing } from "../types/market";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

const TREND_LABELS = {
  hot: { label: "กำลังต้องการ", color: "#39855f", back: 0xdff2df },
  normal: { label: "ราคาปกติ", color: "#6b655c", back: 0xeee9df },
  quiet: { label: "ความต้องการน้อย", color: "#9a6945", back: 0xf5e5d7 }
} as const;

export class MarketScene extends Phaser.Scene {
  private selectedName?: string;
  private notice = "เลือกสัตว์น้ำเพื่อดูราคาซื้อขายวันนี้";

  constructor() { super("MarketScene"); }

  preload(): void {
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
  }

  init(data?: { selectedName?: string; notice?: string }): void {
    this.selectedName = data?.selectedName;
    this.notice = data?.notice ?? "เลือกสัตว์น้ำเพื่อดูราคาซื้อขายวันนี้";
  }

  create(): void {
    const listings = getMarketListings();
    if (!listings.some(listing => listing.speciesName === this.selectedName)) {
      this.selectedName = listings[0]?.speciesName;
    }
    const selected = listings.find(listing => listing.speciesName === this.selectedName);
    const save = readSaveData();
    const market = readMarketData(save);
    drawSoftBackdrop(this);
    addRoundedPanel(this, 40, 28, 1200, 664, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(76, 48, "🧺  ตลาดรับซื้อสัตว์น้ำ", {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(77, 88, "ราคาเปลี่ยนทุกวันตามความต้องการของตลาด • สัตว์ในตู้จะไม่ถูกนำมาขาย", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    addRoundedPanel(this, 943, 49, 188, 46, 0xfff7e6, 0xe0c181, 18, 1, 1.2);
    this.add.text(1037, 72, `🪙 ${save.coins ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    const close = this.add.circle(1190, 69, 24, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1190, 67, "×", { fontFamily: THAI_FONT, fontSize: "30px", color: GAME_THEME.ink }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start("PlayerMenuScene", { page: "bag", bagCategory: "fish" }));

    this.add.text(74, 132, `สัตว์น้ำในกระเป๋า  •  ${listings.length} ชนิด`, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    });
    if (listings.length === 0) {
      addRoundedPanel(this, 72, 166, 752, 420, 0xfffdf7, GAME_THEME.line, 23, 1, 1.2);
      this.add.text(448, 365, "ยังไม่มีสัตว์น้ำในกระเป๋า\nออกตกปลาแล้วเลือกเก็บไว้ก่อนนะ", {
        fontFamily: THAI_FONT, fontSize: "23px", color: GAME_THEME.muted,
        align: "center", lineSpacing: 9
      }).setOrigin(.5);
    } else {
      listings.slice(0, 6).forEach((listing, index) => this.drawListing(listing, index));
    }
    this.drawDetail(selected);

    this.add.text(74, 623, `ขายสะสม ${market.totalSold} ตัว  •  ได้รับรวม ${market.totalEarned} เหรียญ`, {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    this.add.text(640, 660, this.notice, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#477260"
    }).setOrigin(.5);
  }

  private drawListing(listing: MarketListing, index: number): void {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 72 + col * 382;
    const y = 166 + row * 136;
    const selected = listing.speciesName === this.selectedName;
    const trend = TREND_LABELS[listing.trend];
    addRoundedPanel(this, x, y, 366, 118, selected ? 0xfff0cf : 0xfffdf7,
      selected ? GAME_THEME.orangeDark : GAME_THEME.line, 20, 1, selected ? 2 : 1.2);
    const art = getFishArt(listing.speciesName);
    if (art) this.add.image(x + 63, y + 59, art.textureKey)
      .setDisplaySize(96, 96 * art.aspectRatio);
    this.add.text(x + 122, y + 18, listing.speciesName, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(x + 122, y + 50, `มี ${listing.count} ตัว  •  เฉลี่ย ${listing.averageWeight.toFixed(2)} กก.`, {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    });
    addRoundedPanel(this, x + 122, y + 77, 112, 25, trend.back, trend.back, 11, 1, 0);
    this.add.text(x + 178, y + 90, trend.label, {
      fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: trend.color
    }).setOrigin(.5);
    this.add.text(x + 342, y + 78, `🪙 ${listing.unitPrice}/ตัว`, {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: "#b46b23"
    }).setOrigin(1, 0);
    addPillHitArea(this, x, y, 366, 118, () => {
      if (this.selectedName === listing.speciesName) return;
      this.scene.restart({ selectedName: listing.speciesName, notice: this.notice });
    });
  }

  private drawDetail(listing?: MarketListing): void {
    addRoundedPanel(this, 852, 132, 350, 486, 0xfffdf7, GAME_THEME.line, 22, 1, 1.5);
    this.add.text(877, 154, "รายละเอียดการขาย", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    if (!listing) {
      this.add.text(1027, 370, "เลือกสัตว์น้ำจากรายการ\nเพื่อดูรายละเอียด", {
        fontFamily: THAI_FONT, fontSize: "19px", color: GAME_THEME.muted,
        align: "center", lineSpacing: 8
      }).setOrigin(.5);
      return;
    }
    const art = getFishArt(listing.speciesName);
    if (art) this.add.image(1027, 235, art.textureKey)
      .setDisplaySize(230, 230 * art.aspectRatio);
    this.add.text(1027, 304, listing.speciesName, {
      fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    const percent = Math.round((listing.multiplier - 1) * 100);
    this.add.text(1027, 345,
      `ราคาพื้นฐานเฉลี่ย ${Math.round(listing.averageBaseValue)} เหรียญ\n`+
      `ราคาวันนี้ ${listing.unitPrice} เหรียญ  (${percent >= 0 ? "+" : ""}${percent}%)`, {
        fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted,
        align: "center", lineSpacing: 7
      }).setOrigin(.5);
    addRoundedPanel(this, 897, 398, 260, 58, GAME_THEME.orange, GAME_THEME.orangeDark, 20, 1, 1.5);
    this.add.text(1027, 427, `ขาย 1 ตัว  •  +${listing.unitPrice}`, {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, 897, 398, 260, 58, () => this.sell(listing, 1));

    const allPrice = Math.max(1, Math.round(listing.averageBaseValue * listing.count * listing.multiplier));
    addRoundedPanel(this, 897, 470, 260, 58, 0xffffff, GAME_THEME.orangeDark, 20, 1, 1.4);
    this.add.text(1027, 499, `ขายทั้งหมด ${listing.count} ตัว  •  +${allPrice}`, {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: "#9a5d25"
    }).setOrigin(.5);
    addPillHitArea(this, 897, 470, 260, 58, () => this.sell(listing, listing.count));

    const recent = readMarketData().history[0];
    this.add.text(877, 557, recent
      ? `ล่าสุด  ${recent.speciesName} ×${recent.quantity}  +${recent.earnedCoins} เหรียญ`
      : "ยังไม่มีประวัติการขาย", {
        fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted,
        wordWrap: { width: 300 }
      });
  }

  private sell(listing: MarketListing, quantity: number): void {
    const result = sellFishAtMarket(listing.speciesName, quantity);
    this.scene.restart({
      selectedName: listing.speciesName,
      notice: result.message
    });
  }
}
