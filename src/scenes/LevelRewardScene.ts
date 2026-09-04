import Phaser from "phaser";
import { LEVEL_REWARDS } from "../data/levelRewards";
import { getAnglerLevel } from "../data/questData";
import { claimLevelReward, readClaimedLevelRewards } from "../services/levelRewards";
import { readSaveData } from "../services/save";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

export class LevelRewardScene extends Phaser.Scene {
  private notice = "";

  constructor() { super("LevelRewardScene"); }

  init(data?: { notice?: string }): void {
    this.notice = data?.notice ?? "";
  }

  create(): void {
    drawSoftBackdrop(this);
    const save = readSaveData();
    const currentLevel = getAnglerLevel(save.anglerXp, save.collectionCount);
    const claimed = new Set(readClaimedLevelRewards());

    addRoundedPanel(this, 48, 38, 1184, 644, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(105, 84, "🎁  รางวัลนักตกปลา", {
      fontFamily: THAI_FONT, fontSize: "32px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(0, .5);
    this.add.text(105, 123, "เติบโตจากการตกปลา ทำภารกิจ และสำรวจสัตว์น้ำ", {
      fontFamily: THAI_FONT, fontSize: "15px", color: GAME_THEME.muted
    }).setOrigin(0, .5);

    addRoundedPanel(this, 930, 62, 210, 56, GAME_THEME.paleGreen, 0xc4d9c5, 21, 1, 1.25);
    this.add.text(1035, 90, `เลเวลปัจจุบัน  Lv.${currentLevel}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.greenText
    }).setOrigin(.5);

    const back = this.add.circle(1187, 75, 25, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e)
      .setInteractive({ useHandCursor: true });
    this.add.text(1187, 73, "×", {
      fontFamily: THAI_FONT, fontSize: "31px", color: GAME_THEME.ink
    }).setOrigin(.5);
    back.on("pointerdown", () => this.scene.start("PlayerMenuScene", { page: "character" }));

    LEVEL_REWARDS.forEach((reward, index) => {
      const x = 82 + index * 229;
      const unlocked = currentLevel >= reward.level;
      const received = claimed.has(reward.level);
      const border = received ? 0x83b392 : unlocked ? GAME_THEME.orangeDark : 0xc8c1b5;
      const fill = received ? 0xf1f7ee : unlocked ? 0xfffdf7 : 0xeeeae2;
      addRoundedPanel(this, x, 180, 205, 350, fill, border, 24, 1, unlocked ? 2 : 1.25);

      this.add.text(x + 102.5, 219, `Lv.${reward.level}`, {
        fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold",
        color: unlocked ? GAME_THEME.ink : "#9c958a"
      }).setOrigin(.5);
      this.add.circle(x + 102.5, 291, 48, unlocked ? 0xffefd0 : 0xdedbd4)
        .setStrokeStyle(1.25, unlocked ? 0xefcf99 : 0xc9c5bd);
      this.add.text(x + 102.5, 291, reward.item?.icon ?? "🪙", {
        fontSize: "45px", color: unlocked ? "#ffffff" : "#9c9992"
      }).setOrigin(.5).setAlpha(unlocked ? 1 : .5);

      this.add.text(x + 102.5, 363, `🪙 ${reward.coins} เหรียญ`, {
        fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: unlocked ? GAME_THEME.ink : "#989188"
      }).setOrigin(.5);
      this.add.text(x + 102.5, 409, reward.item ? `${reward.item.icon} ${reward.item.name} ×${reward.item.count}` : "", {
        fontFamily: THAI_FONT, fontSize: "15px", color: unlocked ? GAME_THEME.muted : "#a29c93",
        align: "center", wordWrap: { width: 170 }
      }).setOrigin(.5);

      const buttonFill = received ? 0xddeade : unlocked ? GAME_THEME.orange : 0xd8d4cc;
      addRoundedPanel(this, x + 22, 465, 161, 44, buttonFill,
        received ? 0xb8d0bc : unlocked ? GAME_THEME.orangeDark : 0xc4beb4, 17, 1, 1.25);
      const label = received ? "รับแล้ว ✓" : unlocked ? "รับรางวัล" : `ล็อกถึง Lv.${reward.level}`;
      this.add.text(x + 102.5, 487, label, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold",
        color: received ? GAME_THEME.greenText : unlocked ? GAME_THEME.ink : "#908a82"
      }).setOrigin(.5);
      if (unlocked && !received) {
        addPillHitArea(this, x + 22, 465, 161, 44, () => {
          if (claimLevelReward(reward.level)) {
            this.scene.restart({ notice: `รับรางวัล Lv.${reward.level} เรียบร้อยแล้ว!` });
          }
        });
      }
    });

    addRoundedPanel(this, 235, 566, 810, 68, 0xffffff, GAME_THEME.line, 21, 1, 1.2);
    const xp = Math.max(0, save.anglerXp ?? 0);
    const progress = (xp % 100) / 100;
    addRoundedPanel(this, 275, 607, 730, 12, 0xe5e1d9, 0xe5e1d9, 6, 1, 0);
    addRoundedPanel(this, 275, 607, 730 * progress, 12, GAME_THEME.orange, GAME_THEME.orange, 6, 1, 0);
    this.add.text(275, 584, this.notice || `EXP ${xp}  •  อีก ${100 - (xp % 100)} EXP ถึงเลเวลถัดไป`, {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: this.notice ? "bold" : "normal",
      color: this.notice ? "#3f805b" : GAME_THEME.muted
    });
  }
}
