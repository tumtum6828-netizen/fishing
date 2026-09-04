import Phaser from "phaser";
import {
  BATTLE_OPPONENTS, getBattleMasteryLevel, getBattleMasteryProgress, getBattleStats
} from "../data/battleData";
import { FISH_ART, getFishArt } from "../data/fishArt";
import { FISH_PROFILES, SPECIES_INFO } from "../data/gameData";
import { readAquarium } from "../services/aquarium";
import { readBattleProgress, recordBattleResult } from "../services/battle";
import { readInventory } from "../services/inventory";
import { readSaveData } from "../services/save";
import type { BattleOpponent, BattleStats } from "../types/battle";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

type BattleCandidate = { name: string; weight: number; source: string };
type BattleAction = "attack" | "guard" | "skill";

export class BattleScene extends Phaser.Scene {
  private returnScene = "WorldScene";
  private selected?: BattleCandidate;
  private selectedOpponentId?: string;
  private opponent?: BattleCandidate;
  private playerStats?: BattleStats;
  private opponentStats?: BattleStats;
  private playerMorale = 0;
  private opponentMorale = 0;
  private playerGuarding = false;
  private opponentGuarding = false;
  private skillCooldown = 0;
  private controlsLocked = false;
  private finished = false;
  private playerBar!: Phaser.GameObjects.Graphics;
  private opponentBar!: Phaser.GameObjects.Graphics;
  private playerMoraleText!: Phaser.GameObjects.Text;
  private opponentMoraleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private skillButtonText!: Phaser.GameObjects.Text;
  private playerImage?: Phaser.GameObjects.Image;
  private opponentImage?: Phaser.GameObjects.Image;

  constructor() { super("BattleScene"); }

  preload(): void {
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
  }

  init(data?: { returnScene?: string; selected?: BattleCandidate; opponentId?: string }): void {
    this.returnScene = data?.returnScene ?? "WorldScene";
    this.selected = data?.selected;
    this.selectedOpponentId = data?.opponentId;
    this.finished = false;
    this.controlsLocked = false;
    this.skillCooldown = 0;
    this.playerGuarding = false;
    this.opponentGuarding = false;
  }

  create(): void {
    drawSoftBackdrop(this);
    addRoundedPanel(this, 35, 28, 1210, 664, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    const progress = readBattleProgress();
    this.add.text(70, 50, "🏆  สนามประลองสัตว์น้ำ", {
      fontFamily: THAI_FONT, fontSize: "30px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(70, 91, `กิจกรรมเสริมแบบเป็นมิตร  •  ชนะ ${progress.wins}  แพ้ ${progress.losses}  ชนะต่อเนื่อง ${progress.winStreak}`, {
      fontFamily: THAI_FONT, fontSize: "15px", color: GAME_THEME.muted
    });
    const close = this.add.circle(1201, 66, 24, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1201, 64, "×", {
      fontFamily: THAI_FONT, fontSize: "30px", color: GAME_THEME.ink
    }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start(this.returnScene));

    const opponent = BATTLE_OPPONENTS.find(item => item.id === this.selectedOpponentId);
    if (this.selected && opponent) this.createBattle(this.selected, opponent);
    else if (this.selected) this.createOpponentSelection(this.selected);
    else this.createSelection();
  }

  private getCandidates(): BattleCandidate[] {
    const save = readSaveData();
    const inventory = readInventory();
    const candidates = new Map<string, BattleCandidate>();
    Object.entries(inventory.fish).forEach(([name, stack]) => {
      if (FISH_PROFILES.find(profile => profile.name === name)?.kind !== "fish") return;
      candidates.set(name, { name, weight: stack.totalWeight / stack.count, source: "กระเป๋า" });
    });
    readAquarium(save).residents.forEach(resident => {
      if (FISH_PROFILES.find(profile => profile.name === resident.name)?.kind !== "fish") return;
      const current = candidates.get(resident.name);
      candidates.set(resident.name, {
        name: resident.name,
        weight: Math.max(current?.weight ?? 0, resident.weight),
        source: current ? "กระเป๋าและตู้" : "ตู้ปลา"
      });
    });
    return [...candidates.values()];
  }

  private createSelection(): void {
    const candidates = this.getCandidates();
    const battleProgress = readBattleProgress();
    this.add.text(640, 137, "เลือกตัวแทนลงสนาม", {
      fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    if (candidates.length === 0) {
      this.add.text(640, 350, "ยังไม่มีปลาในกระเป๋าหรือตู้ปลา\nออกตกปลาแล้วเก็บไว้ก่อนนะ", {
        fontFamily: THAI_FONT, fontSize: "25px", color: GAME_THEME.muted, align: "center", lineSpacing: 9
      }).setOrigin(.5);
      return;
    }

    const cardWidth = candidates.length === 1 ? 390 : 330;
    const totalWidth = candidates.length * cardWidth + (candidates.length - 1) * 28;
    const startX = Math.max(70, 640 - totalWidth / 2);
    candidates.slice(0, 3).forEach((candidate, index) => {
      const x = startX + index * (cardWidth + 28);
      const y = 185;
      const masteryXp = battleProgress.masteryXpBySpecies[candidate.name] ?? 0;
      const masteryLevel = getBattleMasteryLevel(masteryXp);
      const masteryProgress = getBattleMasteryProgress(masteryXp);
      const stats = getBattleStats(candidate.name, candidate.weight, masteryLevel);
      addRoundedPanel(this, x, y, cardWidth, 390, 0xfffdf7, 0xe2b862, 24, 1, 1.6);
      this.add.text(x + cardWidth / 2, y + 34, candidate.name, {
        fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5);
      const art = getFishArt(candidate.name);
      if (art) this.add.image(x + cardWidth / 2, y + 135, art.textureKey)
        .setDisplaySize(220, 220 * art.aspectRatio);
      this.add.text(x + cardWidth / 2, y + 238,
        `⚖ ${candidate.weight.toFixed(2)} กก.  •  จาก${candidate.source}\n`+
        `💪 ${stats.power}   🛡 ${stats.defense}   ⚡ ${stats.speed}\n`+
        `🏅 ความชำนาญ Lv.${masteryLevel}  •  ${masteryLevel >= 10 ? "MAX" : `${masteryProgress.current}/${masteryProgress.required} EXP`}`, {
          fontFamily: THAI_FONT, fontSize: "15px", color: GAME_THEME.muted,
          align: "center", lineSpacing: 7
        }).setOrigin(.5);
      addRoundedPanel(this, x + 65, y + 290, cardWidth - 130, 8, 0xe9e2d3, 0xe9e2d3, 4, 1, 0);
      if (masteryProgress.progress > 0) {
        this.add.rectangle(x + 66, y + 291, (cardWidth - 132) * masteryProgress.progress, 6, 0xe8ae3f)
          .setOrigin(0, 0);
      }
      addRoundedPanel(this, x + 55, y + 315, cardWidth - 110, 58,
        GAME_THEME.orange, GAME_THEME.orangeDark, 20, 1, 1.5);
      this.add.text(x + cardWidth / 2, y + 344, "เลือกลงสนาม", {
        fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5);
      addPillHitArea(this, x + 55, y + 315, cardWidth - 110, 58, () => {
        this.scene.restart({ returnScene: this.returnScene, selected: candidate });
      });
    });
    this.add.text(640, 625, "ค่าพลังเป็นกติกาสมมติของมินิเกม ไม่ใช่พฤติกรรมต่อสู้จริงของปลา", {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    }).setOrigin(.5);
  }

  private createOpponentSelection(selected: BattleCandidate): void {
    const progress = readBattleProgress();
    this.add.text(640, 137, `เลือกคู่แข่งให้ ${selected.name}`, {
      fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addRoundedPanel(this, 1010, 90, 140, 38, 0xffffff, GAME_THEME.line, 15, 1, 1);
    this.add.text(1080, 109, "← เปลี่ยนปลา", {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: GAME_THEME.muted
    }).setOrigin(.5);
    addPillHitArea(this, 1010, 90, 140, 38, () => {
      this.scene.restart({ returnScene: this.returnScene });
    });

    BATTLE_OPPONENTS.forEach((opponent, index) => {
      const x = 96 + index * 370;
      const y = 185;
      const unlocked = progress.wins >= opponent.unlockWins;
      const cleared = progress.clearedOpponentIds.includes(opponent.id);
      const range = SPECIES_INFO[opponent.speciesName]?.weight ?? [.3, 1.2];
      const weight = range[0] + (range[1] - range[0]) * opponent.weightFactor;
      const stats = getBattleStats(opponent.speciesName, weight, opponent.battleLevel);
      addRoundedPanel(this, x, y, 348, 390, unlocked ? 0xfffdf7 : 0xf1eee7,
        cleared ? 0x82bd9c : 0xe2b862, 24, 1, 1.6);
      this.add.text(x + 174, y + 31, opponent.title, {
        fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold",
        color: unlocked ? GAME_THEME.ink : GAME_THEME.muted
      }).setOrigin(.5);
      this.add.text(x + 174, y + 60, opponent.subtitle, {
        fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
      }).setOrigin(.5);
      const art = getFishArt(opponent.speciesName);
      if (art) this.add.image(x + 174, y + 145, art.textureKey)
        .setDisplaySize(190, 190 * art.aspectRatio).setAlpha(unlocked ? 1 : .38);
      this.add.text(x + 174, y + 220,
        `${opponent.speciesName}  •  ระดับ ${opponent.battleLevel}\n`+
        `💪 ${stats.power}   🛡 ${stats.defense}   💚 ${stats.maxMorale}`, {
          fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted,
          align: "center", lineSpacing: 7
        }).setOrigin(.5);
      const rewardText = cleared
        ? "✓ รับรางวัลครั้งแรกแล้ว"
        : `🎁 ชนะครั้งแรก +${opponent.firstClearCoins} เหรียญ`;
      this.add.text(x + 174, y + 275, rewardText, {
        fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold",
        color: cleared ? "#4f956f" : "#b16d27"
      }).setOrigin(.5);
      addRoundedPanel(this, x + 54, y + 310, 240, 58,
        unlocked ? GAME_THEME.orange : 0xd8d3c8,
        unlocked ? GAME_THEME.orangeDark : 0xbab3a7, 20, 1, 1.4);
      this.add.text(x + 174, y + 339, unlocked ? "เลือกคู่แข่ง" : `ชนะรวม ${opponent.unlockWins} ครั้ง`, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold",
        color: unlocked ? GAME_THEME.ink : GAME_THEME.muted
      }).setOrigin(.5);
      if (unlocked) addPillHitArea(this, x + 54, y + 310, 240, 58, () => {
        this.scene.restart({
          returnScene: this.returnScene, selected, opponentId: opponent.id
        });
      });
    });
    this.add.text(640, 625, "ชนะคู่แข่งเพื่อเปิดสนามถัดไป • รางวัลครั้งแรกของแต่ละสนามรับได้ครั้งเดียว", {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted
    }).setOrigin(.5);
  }

  private createBattle(selected: BattleCandidate, opponentDefinition: BattleOpponent): void {
    const opponentName = opponentDefinition.speciesName;
    const range = SPECIES_INFO[opponentName]?.weight ?? [.3, 1.2];
    const opponentWeight = range[0] + (range[1] - range[0]) * opponentDefinition.weightFactor;
    this.opponent = { name: opponentName, weight: opponentWeight, source: "คู่แข่ง NPC" };
    const masteryLevel = getBattleMasteryLevel(readBattleProgress().masteryXpBySpecies[selected.name] ?? 0);
    this.playerStats = getBattleStats(selected.name, selected.weight, masteryLevel);
    this.opponentStats = getBattleStats(opponentName, opponentWeight, opponentDefinition.battleLevel);
    this.playerMorale = this.playerStats.maxMorale;
    this.opponentMorale = this.opponentStats.maxMorale;

    addRoundedPanel(this, 65, 130, 1150, 435, 0xdff8f3, 0x8bc9c5, 25, 1, 2);
    const water = this.add.graphics();
    water.fillGradientStyle(0x75d3db, 0x75d3db, 0x278ba6, 0x278ba6, .94).fillRoundedRect(76, 141, 1128, 413, 19);
    water.lineStyle(2, 0xffffff, .22);
    for (let y = 245; y < 525; y += 58) water.beginPath().moveTo(95, y).lineTo(1185, y + 8).strokePath();

    this.add.text(115, 157, `${selected.name}  •  ชำนาญ Lv.${masteryLevel}`, {
      fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: "#173f4c"
    });
    this.add.text(1165, 157, `${opponentDefinition.title}  •  ${opponentName}`, {
      fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: "#173f4c"
    }).setOrigin(1, 0);
    this.playerBar = this.add.graphics();
    this.opponentBar = this.add.graphics();
    this.playerMoraleText = this.add.text(115, 207, "", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#173f4c"
    });
    this.opponentMoraleText = this.add.text(1165, 207, "", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#173f4c"
    }).setOrigin(1, 0);

    const playerArt = getFishArt(selected.name);
    if (playerArt) this.playerImage = this.add.image(330, 345, playerArt.textureKey)
      .setDisplaySize(Math.min(290, playerArt.resultWidth), Math.min(290, playerArt.resultWidth) * playerArt.aspectRatio);
    const opponentArt = getFishArt(opponentName);
    if (opponentArt) this.opponentImage = this.add.image(950, 345, opponentArt.textureKey)
      .setDisplaySize(Math.min(290, opponentArt.resultWidth), Math.min(290, opponentArt.resultWidth) * opponentArt.aspectRatio)
      .setFlipX(true);

    this.statusText = this.add.text(640, 485, "เลือกคำสั่งให้ตัวแทนของคุณ", {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: "#fff9e8",
      stroke: "#173f4c", strokeThickness: 5, align: "center"
    }).setOrigin(.5);
    this.createActionButton(165, 590, 270, "🌊 พุ่งชน", "โจมตีปกติ", "attack");
    this.createActionButton(505, 590, 270, "🛡 ตั้งรับ", "ลดพลังที่เสียรอบหน้า", "guard");
    this.skillButtonText = this.createActionButton(845, 590, 270,
      `✨ ${this.playerStats.skillName}`, "ท่าพิเศษ • พัก 2 รอบ", "skill");
    this.updateBattleHud();
  }

  private createActionButton(
    x: number, y: number, width: number, title: string, subtitle: string, action: BattleAction
  ): Phaser.GameObjects.Text {
    addRoundedPanel(this, x, y, width, 70, action === "skill" ? 0xffe9b8 : 0xfffdf7,
      action === "skill" ? 0xdca749 : GAME_THEME.line, 20, 1, 1.5);
    const titleText = this.add.text(x + width / 2, y + 24, title, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    this.add.text(x + width / 2, y + 51, subtitle, {
      fontFamily: THAI_FONT, fontSize: "11px", color: GAME_THEME.muted
    }).setOrigin(.5);
    addPillHitArea(this, x, y, width, 70, () => this.playerAction(action));
    return titleText;
  }

  private playerAction(action: BattleAction): void {
    if (this.controlsLocked || this.finished || !this.playerStats || !this.opponentStats) return;
    if (action === "skill" && this.skillCooldown > 0) {
      this.statusText.setText(`ท่าพิเศษต้องพักอีก ${this.skillCooldown} รอบ`);
      return;
    }
    this.controlsLocked = true;
    if (action === "guard") {
      this.playerGuarding = true;
      this.statusText.setText(`${this.selected?.name} ตั้งรับและรวบรวมกำลังใจ`);
      this.playerMorale = Math.min(this.playerStats.maxMorale, this.playerMorale + 5);
    } else {
      const multiplier = action === "skill" ? 1.55 : 1;
      let damage = this.rollDamage(this.playerStats.power, this.opponentStats.defense, multiplier);
      if (this.opponentGuarding) damage = Math.max(2, Math.round(damage * .48));
      this.opponentGuarding = false;
      this.opponentMorale = Math.max(0, this.opponentMorale - damage);
      this.statusText.setText(action === "skill"
        ? `${this.selected?.name} ใช้${this.playerStats.skillName}! คู่แข่งเสียกำลังใจ ${damage}`
        : `${this.selected?.name} พุ่งเข้าใส่! คู่แข่งเสียกำลังใจ ${damage}`);
      if (action === "skill") this.skillCooldown = 2;
      this.tweenStrike(this.playerImage, 28);
    }
    if (action !== "skill" && this.skillCooldown > 0) this.skillCooldown -= 1;
    this.updateBattleHud();
    if (this.opponentMorale <= 0) {
      this.finishBattle(true);
      return;
    }
    this.time.delayedCall(700, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    if (this.finished || !this.playerStats || !this.opponentStats || !this.opponent) return;
    if (Math.random() < .22) {
      this.opponentGuarding = true;
      this.statusText.setText(`${this.opponent.name} ตั้งรับ รอจังหวะสวนกลับ`);
    } else {
      let damage = this.rollDamage(this.opponentStats.power, this.playerStats.defense, 1);
      if (this.playerGuarding) damage = Math.max(2, Math.round(damage * .45));
      this.playerGuarding = false;
      this.playerMorale = Math.max(0, this.playerMorale - damage);
      this.statusText.setText(`${this.opponent.name} โต้กลับ! ตัวแทนเราเสียกำลังใจ ${damage}`);
      this.tweenStrike(this.opponentImage, -28);
    }
    this.updateBattleHud();
    if (this.playerMorale <= 0) {
      this.finishBattle(false);
      return;
    }
    this.time.delayedCall(450, () => {
      if (!this.finished) {
        this.controlsLocked = false;
        this.statusText.setText("ถึงตาของเรา เลือกคำสั่งต่อไป");
      }
    });
  }

  private rollDamage(power: number, defense: number, multiplier: number): number {
    return Math.max(3, Math.round(power * multiplier * Phaser.Math.FloatBetween(.88, 1.12) - defense * .42));
  }

  private tweenStrike(image: Phaser.GameObjects.Image | undefined, distance: number): void {
    if (!image) return;
    this.tweens.add({ targets: image, x: `+=${distance}`, duration: 100, yoyo: true, ease: "Quad.Out" });
  }

  private updateBattleHud(): void {
    if (!this.playerStats || !this.opponentStats) return;
    this.drawMoraleBar(this.playerBar, 115, 190, this.playerMorale / this.playerStats.maxMorale);
    this.drawMoraleBar(this.opponentBar, 865, 190, this.opponentMorale / this.opponentStats.maxMorale);
    this.playerMoraleText.setText(`กำลังใจ ${this.playerMorale}/${this.playerStats.maxMorale}`);
    this.opponentMoraleText.setText(`กำลังใจ ${this.opponentMorale}/${this.opponentStats.maxMorale}`);
    this.skillButtonText?.setText(this.skillCooldown > 0
      ? `✨ พักอีก ${this.skillCooldown} รอบ`
      : `✨ ${this.playerStats.skillName}`);
  }

  private drawMoraleBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, ratio: number): void {
    graphics.clear();
    graphics.fillStyle(0x315c67, .45).fillRoundedRect(x, y, 300, 13, 6);
    const color = ratio > .5 ? 0x66c589 : ratio > .25 ? 0xf0b44a : 0xe4675d;
    if (ratio > 0) graphics.fillStyle(color, 1).fillRoundedRect(x + 1, y + 1, 298 * ratio, 11, 5);
  }

  private finishBattle(won: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.controlsLocked = true;
    const speciesName = this.selected?.name ?? "ปลา";
    const opponentDefinition = BATTLE_OPPONENTS.find(item => item.id === this.selectedOpponentId)
      ?? BATTLE_OPPONENTS[0];
    const result = recordBattleResult(
      won, speciesName, opponentDefinition.id,
      opponentDefinition.firstClearCoins, opponentDefinition.winXp
    );
    this.time.delayedCall(450, () => {
      const objects: Phaser.GameObjects.GameObject[] = [];
      objects.push(this.add.rectangle(640, 360, 1280, 720, 0x102f38, .58).setInteractive());
      objects.push(addRoundedPanel(this, 350, 205, 580, 310, GAME_THEME.paper, won ? 0x79b995 : 0xd39a83, 27, 1, 3));
      objects.push(this.add.text(640, 260, won ? "🏆 ชนะการประลอง!" : "🌊 พ่ายแพ้อย่างเป็นมิตร", {
        fontFamily: THAI_FONT, fontSize: "30px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5));
      objects.push(this.add.text(640, 325, won
        ? `รับรวม ${result.coins} เหรียญ${result.firstClearReward > 0 ? `  •  รวมโบนัสครั้งแรก ${result.firstClearReward}` : ""}\n${speciesName} ได้ EXP +${result.xpGain}  •  ความชำนาญ Lv.${result.masteryLevel}${result.leveledUp ? "  เลเวลเพิ่ม!" : ""}`
        : `ปลาไม่บาดเจ็บ พักแล้วกลับมาลองใหม่ได้\n${speciesName} ได้ EXP +${result.xpGain}  •  ความชำนาญ Lv.${result.masteryLevel}${result.leveledUp ? "  เลเวลเพิ่ม!" : ""}`, {
        fontFamily: THAI_FONT, fontSize: "17px", color: GAME_THEME.muted,
        align: "center", lineSpacing: 8
      }).setOrigin(.5));
      objects.push(addRoundedPanel(this, 410, 405, 210, 58, 0xffffff, GAME_THEME.line, 19, 1, 1.2));
      objects.push(this.add.text(515, 434, "เลือกตัวใหม่", {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5));
      objects.push(addPillHitArea(this, 410, 405, 210, 58, () => this.scene.restart({ returnScene: this.returnScene })));
      objects.push(addRoundedPanel(this, 650, 405, 220, 58, GAME_THEME.orange, GAME_THEME.orangeDark, 19, 1, 1.5));
      objects.push(this.add.text(760, 434, "ประลองอีกครั้ง", {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5));
      objects.push(addPillHitArea(this, 650, 405, 220, 58, () => {
        this.scene.restart({
          returnScene: this.returnScene, selected: this.selected,
          opponentId: opponentDefinition.id
        });
      }));
      this.add.container(0, 0, objects).setDepth(100);
    });
  }
}
