import Phaser from "phaser";
import { DAILY_ALL_CLEAR_REWARD, getDailyQuestDefinitions } from "../data/dailyQuestData";
import {
  claimDailyAllClear, claimDailyQuest, readDailyQuestState
} from "../services/dailyQuests";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

export class DailyQuestScene extends Phaser.Scene {
  private returnScene = "WorldScene";

  constructor() { super("DailyQuestScene"); }

  init(data?: { returnScene?: string }): void {
    this.returnScene = data?.returnScene ?? "WorldScene";
  }

  create(): void {
    const state = readDailyQuestState();
    const quests = getDailyQuestDefinitions(state.dateKey);
    drawSoftBackdrop(this);
    addRoundedPanel(this, 42, 30, 1196, 660, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(78, 52, "📋  ภารกิจประจำวัน", {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(79, 92, "ออกสำรวจ ดูแลสัตว์น้ำ และช่วยรักษาแหล่งน้ำ • เปลี่ยนชุดใหม่ทุกวัน", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    });
    const close = this.add.circle(1192, 69, 24, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1192, 67, "×", {
      fontFamily: THAI_FONT, fontSize: "30px", color: GAME_THEME.ink
    }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start(this.returnScene));

    quests.forEach((quest, index) => {
      const y = 137 + index * 132;
      const value = state.progress[quest.id] ?? 0;
      const done = value >= quest.goal;
      const claimed = state.claimedIds.includes(quest.id);
      addRoundedPanel(this, 82, y, 1116, 114, claimed ? 0xeff6ec : 0xfffdf7,
        claimed ? 0x94c2a0 : done ? 0xe0ae50 : GAME_THEME.line, 22, 1, 1.4);
      this.add.circle(139, y + 57, 34, claimed ? 0xcce5cf : 0xffe4a8);
      this.add.text(139, y + 56, quest.icon, { fontSize: "27px" }).setOrigin(.5);
      this.add.text(191, y + 20, quest.title, {
        fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: GAME_THEME.ink
      });
      this.add.text(191, y + 52, quest.description, {
        fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
      });
      addRoundedPanel(this, 191, y + 79, 425, 10, 0xe6e0d5, 0xe6e0d5, 5, 1, 0);
      if (value > 0) addRoundedPanel(this, 192, y + 80, 423 * Math.min(1, value / quest.goal), 8,
        done ? 0x67b985 : 0xe9ae45, done ? 0x67b985 : 0xe9ae45, 4, 1, 0);
      this.add.text(635, y + 71, `${value}/${quest.goal}`, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: GAME_THEME.ink
      });
      const reward = [
        `🪙 ${quest.rewardCoins}`,
        `⭐ ${quest.rewardXp} EXP`,
        quest.rewardConservation > 0 ? `💚 ${quest.rewardConservation}` : ""
      ].filter(Boolean).join("  •  ");
      this.add.text(735, y + 34, reward, {
        fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#5b715f"
      });
      const canClaim = done && !claimed;
      addRoundedPanel(this, 945, y + 59, 210, 46,
        canClaim ? GAME_THEME.orange : claimed ? 0x9dcaab : GAME_THEME.mutedFill,
        canClaim ? GAME_THEME.orangeDark : claimed ? 0x6eac83 : 0xbeb7ab, 17, 1, 1.2);
      this.add.text(1050, y + 82, claimed ? "✓ รับแล้ว" : done ? "รับรางวัล" : "กำลังทำ", {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold",
        color: canClaim ? GAME_THEME.ink : claimed ? "#ffffff" : "#7c756c"
      }).setOrigin(.5);
      if (canClaim) addPillHitArea(this, 945, y + 59, 210, 46, () => {
        claimDailyQuest(quest.id);
        this.scene.restart({ returnScene: this.returnScene });
      });
    });

    const allClaimed = quests.every(quest => state.claimedIds.includes(quest.id));
    const bonusReady = allClaimed && !state.bonusClaimed;
    addRoundedPanel(this, 82, 544, 1116, 105, state.bonusClaimed ? 0xeaf4e8 : 0xffefd0,
      state.bonusClaimed ? 0x87bd98 : 0xe1a64d, 23, 1, 1.6);
    this.add.text(116, 562, "🎁  โบนัสทำครบทั้ง 3 ภารกิจ", {
      fontFamily: THAI_FONT, fontSize: "19px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(116, 603,
      `🪙 ${DAILY_ALL_CLEAR_REWARD.coins}  •  ⭐ ${DAILY_ALL_CLEAR_REWARD.xp} EXP  •  💚 ${DAILY_ALL_CLEAR_REWARD.conservation}`, {
        fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
      });
    addRoundedPanel(this, 945, 573, 210, 50,
      bonusReady ? GAME_THEME.orange : state.bonusClaimed ? 0x9dcaab : GAME_THEME.mutedFill,
      bonusReady ? GAME_THEME.orangeDark : state.bonusClaimed ? 0x6eac83 : 0xbeb7ab, 18, 1, 1.3);
    this.add.text(1050, 598, state.bonusClaimed ? "✓ รับแล้ว" : bonusReady ? "รับโบนัส" : "ทำให้ครบก่อน", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold",
      color: bonusReady ? GAME_THEME.ink : state.bonusClaimed ? "#ffffff" : "#7c756c"
    }).setOrigin(.5);
    if (bonusReady) addPillHitArea(this, 945, 573, 210, 50, () => {
      claimDailyAllClear();
      this.scene.restart({ returnScene: this.returnScene });
    });
  }
}
