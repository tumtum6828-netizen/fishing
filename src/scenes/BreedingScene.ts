import Phaser from "phaser";
import {
  BREEDING_MAX_LEVEL,
  BREEDING_LEVEL_REWARDS,
  formatBreedingTime,
  getBreedingDurationMinutes,
  getBreedingLevel,
  getBreedingLevelProgress,
  getBreedingTwinChance
} from "../data/breedingData";
import { FISH_ART, getFishArt } from "../data/fishArt";
import { FISH_PROFILES, SPECIES_INFO } from "../data/gameData";
import {
  cancelBreeding,
  claimBreedingLevelReward,
  claimOffspring,
  getBreedingRemainingMinutes,
  isBreedableFish,
  readBreeding,
  startBreeding
} from "../services/breeding";
import { getWorldTotalMinutes } from "../services/aquarium";
import { readInventory } from "../services/inventory";
import { readSaveData } from "../services/save";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

export class BreedingScene extends Phaser.Scene {
  private returnScene = "WorldScene";
  private notice = "เลือกปลาชนิดเดียวกันที่มีทั้งตัวผู้และตัวเมีย";

  constructor() { super("BreedingScene"); }

  preload(): void {
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
  }

  init(data?: { returnScene?: string; notice?: string }): void {
    this.returnScene = data?.returnScene ?? "WorldScene";
    this.notice = data?.notice ?? "เลือกปลาชนิดเดียวกันที่มีทั้งตัวผู้และตัวเมีย";
  }

  create(): void {
    drawSoftBackdrop(this);
    addRoundedPanel(this, 35, 28, 1210, 664, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(70, 50, "💕  ศูนย์เพาะพันธุ์", {
      fontFamily: THAI_FONT, fontSize: "30px", fontStyle: "bold", color: GAME_THEME.ink
    });
    const breeding = readBreeding();
    const masteryLevel = getBreedingLevel(breeding.xp);
    this.add.text(70, 91,
      `รองรับปลาทั่วไป • ใช้เวลา ${formatBreedingTime(getBreedingDurationMinutes(masteryLevel))} • ครั้งละ 1 คู่`, {
      fontFamily: THAI_FONT, fontSize: "15px", color: GAME_THEME.muted
    });
    this.drawMastery(breeding.xp, breeding.completedCount, breeding.claimedRewardLevels);
    const close = this.add.circle(1201, 66, 24, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1201, 64, "×", {
      fontFamily: THAI_FONT, fontSize: "30px", color: GAME_THEME.ink
    }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start("AquariumScene", { returnScene: this.returnScene }));

    const project = breeding.project;
    if (project) this.drawActiveProject(project.speciesName);
    else this.drawCandidates();

    this.add.text(640, 654, this.notice, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: GAME_THEME.greenText,
      align: "center", wordWrap: { width: 1050 }
    }).setOrigin(.5);
  }

  private drawMastery(xp: number, completedCount: number, claimedRewardLevels: number[]): void {
    const level = getBreedingLevel(xp);
    const progress = getBreedingLevelProgress(xp);
    const hasClaimableReward = BREEDING_LEVEL_REWARDS.some(reward =>
      reward.level <= level && !claimedRewardLevels.includes(reward.level));
    addRoundedPanel(this, 690, 45, 450, 62, 0xfff5f7, 0xe0b5c1, 18, 1, 1.2);
    this.add.text(710, 55, `🏅 ความชำนาญ Lv.${level}  •  สำเร็จ ${completedCount} ครั้ง`, {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: "#815263"
    });
    addRoundedPanel(this, 710, 84, 280, 10, 0xe1d9d7, 0xe1d9d7, 5, 1, 0);
    if (progress.progress > 0) addRoundedPanel(this, 711, 85, 278 * progress.progress, 8,
      0xe38fa7, 0xe38fa7, 4, 1, 0);
    this.add.text(990, 77, level >= BREEDING_MAX_LEVEL ? "MAX" : `${progress.current}/${progress.required}`, {
      fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: GAME_THEME.muted
    }).setOrigin(1, 0);
    addRoundedPanel(this, 1005, 54, 115, 43,
      hasClaimableReward ? GAME_THEME.orange : 0xffffff,
      hasClaimableReward ? GAME_THEME.orangeDark : 0xd8c8ca, 15, 1, 1.2);
    this.add.text(1062, 75, hasClaimableReward ? "🎁 รับรางวัล" : "🎁 รางวัล", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, 1005, 54, 115, 43, () => this.openRewardPanel(level, claimedRewardLevels));
  }

  private openRewardPanel(currentLevel: number, claimedRewardLevels: number[]): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(640, 360, 1280, 720, 0x102f38, .58).setInteractive());
    objects.push(addRoundedPanel(this, 315, 115, 650, 500, GAME_THEME.paper, 0xd6b879, 27, 1, 3));
    objects.push(this.add.text(640, 154, "🎁 รางวัลความชำนาญ", {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5));
    objects.push(this.add.text(640, 188, "เป็นโบนัสกิจกรรมเสริม รับได้ครั้งเดียวต่อระดับ", {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    }).setOrigin(.5));

    BREEDING_LEVEL_REWARDS.forEach((reward, index) => {
      const y = 225 + index * 82;
      const claimed = claimedRewardLevels.includes(reward.level);
      const unlocked = currentLevel >= reward.level;
      const canClaim = unlocked && !claimed;
      objects.push(addRoundedPanel(this, 350, y, 580, 66,
        claimed ? 0xe9f5ec : canClaim ? 0xfff5dc : 0xeeeae3,
        claimed ? 0x8fbea0 : canClaim ? 0xe0ad50 : 0xc8c0b5, 18, 1, 1.2));
      objects.push(this.add.text(375, y + 12, `Lv.${reward.level}  ${reward.label}`, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: GAME_THEME.ink
      }));
      const rewardText = [
        reward.coins > 0 ? `🪙 ${reward.coins}` : "",
        reward.conservationPoints > 0 ? `♻ ${reward.conservationPoints}` : ""
      ].filter(Boolean).join("   ");
      objects.push(this.add.text(375, y + 39, rewardText, {
        fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
      }));
      objects.push(addRoundedPanel(this, 810, y + 13, 98, 40,
        canClaim ? GAME_THEME.orange : claimed ? 0xdceee1 : GAME_THEME.mutedFill,
        canClaim ? GAME_THEME.orangeDark : claimed ? 0x91b49c : 0xbeb7ab, 14, 1, 1));
      objects.push(this.add.text(859, y + 33, claimed ? "รับแล้ว" : canClaim ? "รับรางวัล" : `รอ Lv.${reward.level}`, {
        fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold",
        color: claimed ? "#4f8064" : canClaim ? GAME_THEME.ink : "#817b73"
      }).setOrigin(.5));
      if (canClaim) {
        const hit = addPillHitArea(this, 810, y + 13, 98, 40, () => {
          const result = claimBreedingLevelReward(reward.level);
          overlay.destroy(true);
          this.scene.restart({ returnScene: this.returnScene, notice: result.message });
        });
        objects.push(hit);
      }
    });

    const close = this.add.circle(925, 155, 21, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    objects.push(close);
    objects.push(this.add.text(925, 153, "×", {
      fontFamily: THAI_FONT, fontSize: "26px", color: GAME_THEME.ink
    }).setOrigin(.5));
    const overlay = this.add.container(0, 0, objects).setDepth(100);
    close.on("pointerdown", () => overlay.destroy(true));
  }

  private drawCandidates(): void {
    const inventory = readInventory();
    const level = getBreedingLevel(readBreeding().xp);
    const speciesNames = FISH_PROFILES.filter(profile => isBreedableFish(profile.name)).map(profile => profile.name);
    speciesNames.forEach((name, index) => {
      const x = 70 + index * 392;
      const y = 145;
      const stack = inventory.fish[name];
      const maleCount = stack?.sexCounts.male ?? 0;
      const femaleCount = stack?.sexCounts.female ?? 0;
      const ready = maleCount > 0 && femaleCount > 0;
      addRoundedPanel(this, x, y, 360, 445, ready ? 0xfffdf7 : 0xf1ede5,
        ready ? 0xe2b862 : 0xc9c1b4, 24, 1, ready ? 2 : 1.2);
      this.add.text(x + 180, y + 35, name, {
        fontFamily: THAI_FONT, fontSize: "24px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5);
      const art = getFishArt(name);
      if (art) {
        const image = this.add.image(x + 180, y + 145, art.textureKey)
          .setDisplaySize(225, 225 * art.aspectRatio);
        if (!stack) image.setTintFill(0xb5b1a8).setAlpha(.65);
      }
      this.add.text(x + 180, y + 248, `♂ ตัวผู้ ${maleCount} ตัว     ♀ ตัวเมีย ${femaleCount} ตัว`, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: ready ? "#467462" : "#8b8378"
      }).setOrigin(.5);
      this.add.text(x + 180, y + 292, ready
        ? "พ่อแม่พันธุ์พร้อมเริ่มดูแล"
        : "ต้องมีตัวผู้และตัวเมียอย่างละ 1 ตัว", {
        fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted, align: "center"
      }).setOrigin(.5);
      addRoundedPanel(this, x + 55, y + 340, 250, 58, ready ? GAME_THEME.orange : GAME_THEME.mutedFill,
        ready ? GAME_THEME.orangeDark : 0xbeb7ab, 20, 1, 1.5);
      this.add.text(x + 180, y + 369, ready ? "💕 เริ่มเพาะพันธุ์" : "ยังไม่พร้อม", {
        fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: ready ? GAME_THEME.ink : "#817b73"
      }).setOrigin(.5);
      if (ready) addPillHitArea(this, x + 55, y + 340, 250, 58, () => {
        const result = startBreeding(name);
        this.scene.restart({ returnScene: this.returnScene, notice: result.message });
      });
    });
    this.add.text(640, 615,
      `โอกาสได้ลูกแฝด ${(getBreedingTwinChance(level) * 100).toFixed(1)}%  •  วิธีผสมพันธุ์จริงแตกต่างกันตามชนิดและสภาพแวดล้อม`, {
        fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted, align: "center"
      }).setOrigin(.5);
  }

  private drawActiveProject(speciesName: string): void {
    const save = readSaveData();
    const project = readBreeding(save).project;
    if (!project) return;
    const remaining = getBreedingRemainingMinutes(save);
    const elapsed = Math.max(0, getWorldTotalMinutes(save) - project.startedAtWorldMinute);
    const projectDuration = Math.max(1, project.readyAtWorldMinute - project.startedAtWorldMinute);
    const progress = Phaser.Math.Clamp(elapsed / projectDuration, 0, 1);
    const ready = remaining <= 0;

    addRoundedPanel(this, 160, 140, 960, 455, 0xfffdf7, 0xe2b862, 27, 1, 2);
    this.add.text(640, 178, ready ? "🐣 ลูกปลาพร้อมย้ายแล้ว!" : `กำลังดูแลคู่${speciesName}`, {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    const art = getFishArt(speciesName);
    if (art) {
      const width = Math.min(250, art.resultWidth);
      this.add.image(435, 320, art.textureKey).setDisplaySize(width, width * art.aspectRatio);
      this.add.image(845, 320, art.textureKey).setDisplaySize(width, width * art.aspectRatio).setFlipX(true);
    }
    const heart = this.add.text(640, 315, ready ? "🐣" : "💕", { fontSize: "64px" }).setOrigin(.5);
    this.tweens.add({ targets: heart, scale: { from: .92, to: 1.12 }, duration: 760, yoyo: true, repeat: -1 });

    addRoundedPanel(this, 315, 407, 650, 18, 0xded8c9, 0xded8c9, 9, 1, 0);
    if (progress > 0) addRoundedPanel(this, 317, 409, 646 * progress, 14,
      ready ? 0x62b990 : GAME_THEME.orange, ready ? 0x62b990 : GAME_THEME.orange, 7, 1, 0);
    this.add.text(640, 449, ready ? "เสร็จสมบูรณ์" : `เหลือ ${formatBreedingTime(remaining)}`, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: ready ? "#438267" : GAME_THEME.ink
    }).setOrigin(.5);
    const fact = SPECIES_INFO[speciesName]?.fact;
    if (fact) this.add.text(640, 482, `เรื่องน่ารู้: ${fact}`, {
      fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted
    }).setOrigin(.5);

    addRoundedPanel(this, 350, 520, 210, 54, 0xffffff, GAME_THEME.line, 18, 1, 1.2);
    this.add.text(455, 547, "ยกเลิกและคืนปลา", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, 350, 520, 210, 54, () => {
      const result = cancelBreeding();
      this.scene.restart({ returnScene: this.returnScene, notice: result.message });
    });

    addRoundedPanel(this, 580, 520, 350, 54, ready ? GAME_THEME.orange : GAME_THEME.mutedFill,
      ready ? GAME_THEME.orangeDark : 0xbeb7ab, 18, 1, 1.5);
    this.add.text(755, 547, ready ? "🐣 รับลูกปลาและคืนพ่อแม่" : "⏳ กำลังเติบโต", {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: ready ? GAME_THEME.ink : "#817b73"
    }).setOrigin(.5);
    if (ready) addPillHitArea(this, 580, 520, 350, 54, () => {
      const result = claimOffspring();
      this.scene.restart({ returnScene: this.returnScene, notice: result.message });
    });
  }
}
