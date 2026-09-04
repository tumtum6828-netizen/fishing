import Phaser from "phaser";
import { STARTER_QUEST } from "../data/questData";
import {
  acceptStarterQuest,
  completeStarterQuest,
  readStarterQuest
} from "../services/quests";
import { THAI_FONT } from "../ui/worldHud";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";

export class QuestScene extends Phaser.Scene {
  constructor() { super("QuestScene"); }

  preload(): void {
    this.load.image("quest-shopkeeper", "/assets/characters/shopkeeper-v1.png");
  }

  create(): void {
    const quest = readStarterQuest();
    drawSoftBackdrop(this);
    addRoundedPanel(this, 48, 38, 1184, 644, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    const header = this.add.graphics();
    header.fillStyle(GAME_THEME.peach, 1).fillRoundedRect(51, 41, 1178, 88, 25);
    header.fillRect(51, 88, 1178, 41);
    this.add.circle(91, 82, 23, 0xffd889, .95);
    this.add.text(91, 82, "📜", { fontSize: "23px" }).setOrigin(.5);
    this.add.text(126, 66, "ภารกิจจากลุงมนัส", {
      fontFamily: THAI_FONT, fontSize: "27px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(127, 99, "ช่วยชุมชนริมอ่าว พร้อมเรียนรู้การดูแลแหล่งน้ำ", {
      fontFamily: THAI_FONT, fontSize: "13px", color: "#76552f"
    });
    const close = this.add.circle(1182, 82, 24, 0xfff9ea).setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1182, 80, "×", { fontFamily: THAI_FONT, fontSize: "31px", color: GAME_THEME.ink }).setOrigin(.5);
    close.on("pointerdown", () => this.returnToWorld());

    addRoundedPanel(this, 105, 154, 320, 470, 0xeaf3e4, 0xc6d5b4, 24, .96, 1.5);
    this.add.ellipse(265, 540, 180, 34, 0x315c45, .16);
    this.add.image(265, 515, "quest-shopkeeper").setOrigin(.5, 1).setDisplaySize(205, 308);
    this.add.text(265, 574, "ลุงมนัส", {
      fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#3f4f45"
    }).setOrigin(.5);
    this.add.text(265, 607, "เจ้าของร้านอุปกรณ์ริมอ่าว", {
      fontFamily: THAI_FONT, fontSize: "13px", color: "#718071"
    }).setOrigin(.5);

    this.add.text(465, 166, STARTER_QUEST.title, {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: GAME_THEME.ink
    });

    if (quest.status === "not-started") {
      this.addParagraph("ทะเลให้อะไรกับหมู่บ้านเรามากมาย แต่ช่วงนี้มีขยะลอยเข้าฝั่งเยอะขึ้น\nลองเริ่มจากเรียนรู้การตกปลา และช่วยเก็บขยะออกจากน้ำให้ลุงหน่อยนะ", 455, 225);
      this.drawStarterPack();
      this.makeButton(955, 570, 310, "รับอุปกรณ์และเริ่มภารกิจ", 0xe7a84b, () => {
        acceptStarterQuest();
        this.scene.restart();
      });
      this.makeTextButton(560, 570, "ไว้ค่อยกลับมา", () => this.returnToWorld());
      return;
    }

    if (quest.status === "active") {
      this.addParagraph("เอาคันเบ็ดไปลองที่ชายฝั่งหรือสะพานท่าเรือ\nสัตว์น้ำที่เก็บ ขาย หรือคืนแหล่งน้ำ ล้วนนับเป็นการตกสำเร็จ", 455, 225);
      this.drawProgress(quest.fishCaught, quest.trashCollected);
      this.makeButton(955, 570, 260, "ออกไปตกปลา", 0x4f9b82, () => this.returnToWorld("dock"));
      this.makeTextButton(560, 570, "กลับหมู่บ้าน", () => this.returnToWorld());
      return;
    }

    if (quest.status === "ready") {
      this.addParagraph("ยอดเยี่ยมมาก! นอกจากจะตกปลาได้แล้ว ยังช่วยทำให้ชายฝั่งสะอาดขึ้นด้วย\nรับรางวัลและอุปกรณ์ชิ้นใหม่สำหรับการผจญภัยครั้งต่อไปได้เลย", 455, 225);
      this.drawProgress(quest.fishCaught, quest.trashCollected);
      this.add.text(455, 455, `รางวัล   ${STARTER_QUEST.rewardCoins} เหรียญ   •   ${STARTER_QUEST.rewardXp} EXP   •   ปลดล็อกเอ็นถักเสริมแรง`, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: "#39735f"
      });
      this.makeButton(955, 570, 260, "ส่งภารกิจ", 0xe7a84b, () => {
        completeStarterQuest();
        this.scene.restart();
      });
      return;
    }

    this.addParagraph("ฝีมือดีขึ้นมากแล้วนะ อ่าวของเราก็สะอาดขึ้นด้วย\nเอ็นถักเสริมแรงเปิดขายในร้านแล้ว และตอนนี้เลเวลนักตกปลาของเธอเพิ่มขึ้นแล้ว", 455, 225);
    this.add.text(455, 340, "ภารกิจสำเร็จ", {
      fontFamily: THAI_FONT, fontSize: "24px", fontStyle: "bold", color: "#3b8968"
    });
    this.add.text(455, 385, `ได้รับ ${STARTER_QUEST.rewardCoins} เหรียญ  •  ${STARTER_QUEST.rewardXp} EXP`, {
      fontFamily: THAI_FONT, fontSize: "16px", color: "#5e695e"
    });
    this.makeButton(810, 570, 230, "เปิดร้านอุปกรณ์", 0x4f9b82, () => this.scene.start("ShopScene"));
    this.makeButton(1060, 570, 220, "ไปโต๊ะช่าง", 0xe7a84b, () => this.scene.start("CraftScene"));
    this.makeTextButton(560, 570, "กลับหมู่บ้าน", () => this.returnToWorld());
  }

  private addParagraph(text: string, x: number, y: number): void {
    this.add.text(x, y, text, {
      fontFamily: THAI_FONT, fontSize: "17px", color: "#5f675d", lineSpacing: 9,
      wordWrap: { width: 665 }
    });
  }

  private drawStarterPack(): void {
    const panel = this.add.graphics();
    panel.fillStyle(0xf5ecd5, .9).fillRoundedRect(455, 345, 650, 115, 20);
    panel.lineStyle(1.5, 0xd4bc86, .7).strokeRoundedRect(455, 345, 650, 115, 20);
    this.add.text(485, 365, "ชุดเริ่มต้น", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: "#6e5c3f"
    });
    this.add.text(485, 405, `คันไม้ไผ่ Lv.1   •   เหยื่อไส้เดือน ${STARTER_QUEST.starterBait} ชิ้น`, {
      fontFamily: THAI_FONT, fontSize: "18px", color: "#3f514b"
    });
  }

  private drawProgress(fishCaught: number, trashCollected: number): void {
    const panel = this.add.graphics();
    panel.fillStyle(0xeaf3e4, .9).fillRoundedRect(455, 350, 650, 120, 20);
    panel.lineStyle(1.5, 0x9ebd9c, .75).strokeRoundedRect(455, 350, 650, 120, 20);
    const fishDone = fishCaught >= STARTER_QUEST.fishGoal;
    const trashDone = trashCollected >= STARTER_QUEST.trashGoal;
    this.add.text(485, 372, `${fishDone ? "✓" : "○"}  ตกสัตว์น้ำให้สำเร็จ`, {
      fontFamily: THAI_FONT, fontSize: "18px", color: fishDone ? "#3b8968" : "#53645b"
    });
    this.add.text(1038, 372, `${fishCaught}/${STARTER_QUEST.fishGoal}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: "#3f514b"
    }).setOrigin(1, 0);
    this.add.text(485, 420, `${trashDone ? "✓" : "○"}  เก็บขยะจากแหล่งน้ำ`, {
      fontFamily: THAI_FONT, fontSize: "18px", color: trashDone ? "#3b8968" : "#53645b"
    });
    this.add.text(1038, 420, `${trashCollected}/${STARTER_QUEST.trashGoal}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: "#3f514b"
    }).setOrigin(1, 0);
  }

  private makeButton(x: number, y: number, width: number, label: string, color: number, action: () => void): void {
    const fill = color === 0x4f9b82 ? GAME_THEME.teal : GAME_THEME.orange;
    addRoundedPanel(this, x - width / 2, y - 29, width, 58, fill,
      fill === GAME_THEME.teal ? 0x397c68 : GAME_THEME.orangeDark, 21, 1, 1.5);
    this.add.text(x, y, label, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: "#fff9e7"
    }).setOrigin(.5);
    addPillHitArea(this, x - width / 2, y - 29, width, 58, action);
  }

  private makeTextButton(x: number, y: number, label: string, action: () => void): void {
    const button = this.add.text(x, y, label, {
      fontFamily: THAI_FONT, fontSize: "15px", color: "#687068"
    }).setOrigin(.5).setInteractive({ useHandCursor: true });
    button.on("pointerdown", action);
  }

  private returnToWorld(spawn: "shop" | "dock" = "shop"): void {
    this.scene.start("WorldScene", { spawn });
  }
}
