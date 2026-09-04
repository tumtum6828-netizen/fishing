import Phaser from "phaser";
import { AQUARIUM_DECORATIONS, AQUARIUM_MAX_CAPACITY } from "../data/aquariumData";
import { FISH_ART, getFishArt } from "../data/fishArt";
import { FISH_PROFILES, LEGENDARY_FISH, SPECIES_INFO } from "../data/gameData";
import { getAnglerLevel } from "../data/questData";
import {
  cleanAquarium,
  feedAquarium,
  getAquariumCapacityForSave,
  getAquariumCleanliness,
  getAquariumHappiness,
  getAquariumSatiety,
  placeFishInAquarium,
  readAquarium,
  removeFishFromAquarium,
  toggleAquariumDecoration
} from "../services/aquarium";
import { readInventory } from "../services/inventory";
import { readSaveData } from "../services/save";
import { getBreedingRemainingMinutes, readBreeding } from "../services/breeding";
import type { AquariumResident } from "../types/aquarium";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

type AquariumTab = "fish" | "decor";

const FISH_COLORS: Record<string, { body: number; fin: number }> = {
  "ปลากระบอก": { body: 0xa9c9bc, fin: 0x70968c },
  "ปลากะพงขาว": { body: 0xc7d9d2, fin: 0x739c96 },
  "ปลาทู": { body: 0x71a8b7, fin: 0x315f73 }
};

export class AquariumScene extends Phaser.Scene {
  private returnScene = "WorldScene";
  private tab: AquariumTab = "fish";
  private notice = "แตะสัตว์น้ำในตู้ เพื่อนำกลับเข้ากระเป๋า";

  constructor() { super("AquariumScene"); }

  preload(): void {
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
  }

  init(data?: { returnScene?: string; tab?: AquariumTab; notice?: string }): void {
    this.returnScene = data?.returnScene ?? "WorldScene";
    this.tab = data?.tab ?? "fish";
    this.notice = data?.notice ?? "แตะสัตว์น้ำในตู้ เพื่อนำกลับเข้ากระเป๋า";
  }

  create(): void {
    drawSoftBackdrop(this);
    const save = readSaveData();
    const aquarium = readAquarium(save);
    const cleanliness = getAquariumCleanliness(save);
    const satiety = getAquariumSatiety(save);
    const happiness = getAquariumHappiness(save);
    const capacity = getAquariumCapacityForSave(save);
    const level = getAnglerLevel(save.anglerXp, save.collectionCount);
    const breedingProject = readBreeding(save).project;
    const breedingReady = breedingProject ? getBreedingRemainingMinutes(save) <= 0 : false;

    addRoundedPanel(this, 35, 28, 1210, 664, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(70, 51, "🐠  ตู้ปลาของฉัน", {
      fontFamily: THAI_FONT, fontSize: "30px", fontStyle: "bold", color: GAME_THEME.ink
    });
    const nextSlotText = capacity < AQUARIUM_MAX_CAPACITY ? `ช่องถัดไป Lv.${capacity * 2 + 1}` : "ปลดล็อกครบแล้ว";
    this.add.text(70, 91, `Lv.${level}  •  ${aquarium.residents.length}/${capacity} ตัว  •  ${nextSlotText}`, {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });

    addRoundedPanel(this, 335, 48, 164, 48,
      breedingReady ? 0xe5f8e9 : breedingProject ? 0xffe8ef : 0xfff4f7,
      breedingReady ? 0x66a980 : 0xd88aa2, 18, 1, 1.4);
    this.add.text(417, 72,
      breedingReady ? "🐣 พร้อมรับลูก" : breedingProject ? "💕 กำลังเพาะ" : "💕 เพาะพันธุ์", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold",
      color: breedingReady ? "#3d7557" : "#8f4e66"
    }).setOrigin(.5);
    addPillHitArea(this, 335, 48, 164, 48, () => {
      this.scene.start("BreedingScene", { returnScene: this.returnScene });
    });

    const close = this.add.circle(1201, 66, 24, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    this.add.text(1201, 64, "×", {
      fontFamily: THAI_FONT, fontSize: "30px", color: GAME_THEME.ink
    }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start(this.returnScene));

    this.drawCareMeters(cleanliness, satiety, happiness, aquarium.residents.length);
    this.drawTank(aquarium.residents, aquarium.decorationIds, cleanliness, happiness);
    this.drawSidePanel(aquarium.residents, capacity, level);

    this.add.text(452, 654, this.notice, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#547065",
      align: "center", wordWrap: { width: 760 }
    }).setOrigin(.5);
  }

  private drawCareMeters(cleanliness: number, satiety: number, happiness: number, residentCount: number): void {
    const color = cleanliness >= 60 ? 0x62b990 : cleanliness >= 35 ? 0xd7a447 : 0xca6457;
    const label = cleanliness >= 75 ? "น้ำใสสะอาด"
      : cleanliness >= 50 ? "เริ่มมีคราบตะไคร่"
        : cleanliness >= 25 ? "น้ำเริ่มขุ่น" : "ควรล้างตู้แล้ว";
    const foodLabel = residentCount === 0 ? "ตู้ว่าง" : satiety >= 70 ? "อิ่มดี" : satiety >= 35 ? "เริ่มหิว" : "หิวแล้ว";
    const foodColor = satiety >= 60 ? 0x62b990 : satiety >= 35 ? 0xd7a447 : 0xca6457;
    this.add.text(520, 45, `สะอาด ${cleanliness}%`, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(520, 67, label, { fontFamily: THAI_FONT, fontSize: "11px", color: GAME_THEME.muted });
    addRoundedPanel(this, 520, 88, 154, 10, 0xded8c9, 0xded8c9, 5, 1, 0);
    if (cleanliness > 0) addRoundedPanel(this, 521, 89, 152 * cleanliness / 100, 8, color, color, 4, 1, 0);

    this.add.text(692, 45, `ความอิ่ม ${satiety}%`, {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(692, 67, `${foodLabel}  •  ความสุข ${happiness}%`, {
      fontFamily: THAI_FONT, fontSize: "11px", color: GAME_THEME.muted
    });
    addRoundedPanel(this, 692, 88, 154, 10, 0xded8c9, 0xded8c9, 5, 1, 0);
    if (satiety > 0) addRoundedPanel(this, 693, 89, 152 * satiety / 100, 8, foodColor, foodColor, 4, 1, 0);

    addRoundedPanel(this, 864, 48, 126, 48,
      cleanliness < 100 ? GAME_THEME.teal : GAME_THEME.mutedFill,
      cleanliness < 100 ? 0x397c68 : 0xbeb7ab, 18, 1, 1.5);
    this.add.text(927, 72, cleanliness < 100 ? "🧽 ล้างตู้" : "✨ สะอาด", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold",
      color: cleanliness < 100 ? "#ffffff" : "#7c756c"
    }).setOrigin(.5);
    if (cleanliness < 100) {
      addPillHitArea(this, 864, 48, 126, 48, () => {
        const result = cleanAquarium();
        this.restartWithNotice(result.message);
      });
    }

    const canFeed = residentCount > 0 && satiety < 90;
    addRoundedPanel(this, 1002, 48, 142, 48, canFeed ? GAME_THEME.orange : GAME_THEME.mutedFill,
      canFeed ? GAME_THEME.orangeDark : 0xbeb7ab, 18, 1, 1.5);
    this.add.text(1073, 72, canFeed ? "🥣 ให้อาหาร" : residentCount === 0 ? "🥣 ตู้ว่าง" : "😊 อิ่มแล้ว", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: canFeed ? GAME_THEME.ink : "#7c756c"
    }).setOrigin(.5);
    if (canFeed) addPillHitArea(this, 1002, 48, 142, 48, () => {
      const result = feedAquarium();
      this.restartWithNotice(result.message);
    });
  }

  private drawTank(residents: AquariumResident[], decorationIds: string[], cleanliness: number, happiness: number): void {
    const tank = this.add.graphics();
    tank.fillStyle(0x2b525b, .2).fillRoundedRect(60, 139, 812, 480, 25);
    tank.fillStyle(0xdff8f3, .96).fillRoundedRect(68, 145, 796, 462, 22);
    const murk = Math.max(0, (75 - cleanliness) / 75);
    const cleanWater = cleanliness >= 45 ? 0x67c9d4 : 0x8fae78;
    const deepWater = cleanliness >= 45 ? 0x268ba5 : 0x607a58;
    tank.fillGradientStyle(cleanWater, cleanWater, deepWater, deepWater, .9)
      .fillRoundedRect(78, 171, 776, 412, 16);
    if (murk > 0) tank.fillStyle(0x6f7950, murk * .42).fillRoundedRect(78, 171, 776, 412, 16);
    tank.fillStyle(0xd8b77a, .95).fillRoundedRect(78, 529, 776, 54, 0);
    tank.fillStyle(0xf1d69d, .65);
    for (let x = 94; x < 842; x += 28) tank.fillCircle(x, 545 + (x % 4) * 5, 4 + (x % 3));
    tank.lineStyle(6, 0xb9d7d4, .96).strokeRoundedRect(68, 145, 796, 462, 22);
    tank.lineStyle(2, 0xffffff, .58).beginPath().moveTo(90, 193).lineTo(90, 450).strokePath();

    this.drawDecorations(decorationIds);
    this.drawAlgae(cleanliness);
    this.createBubbles(cleanliness);

    if (residents.length === 0) {
      this.add.text(466, 350, "ตู้ยังว่างอยู่\nเลือกสัตว์น้ำจากกระเป๋าด้านขวา", {
        fontFamily: THAI_FONT, fontSize: "24px", color: "#e8fff5", align: "center",
        stroke: "#275b65", strokeThickness: 5, lineSpacing: 8
      }).setOrigin(.5);
      return;
    }

    const fishStarts = [[205, 245], [685, 335], [515, 215], [280, 425], [710, 455], [470, 355]];
    const floorStarts = [[245, 487], [650, 502], [390, 518], [555, 520], [730, 516], [170, 514]];
    residents.forEach((aquariumResident, index) => {
      const name = aquariumResident.name;
      const species = FISH_PROFILES.find(profile => profile.name === name);
      const start = species?.kind === "fish" ? fishStarts[index] : floorStarts[index];
      const resident = this.createFish(
        start?.[0] ?? 250, start?.[1] ?? 350, aquariumResident, index % 2 === 0 ? 1 : -1
      );
      this.animateResident(resident, name, index, happiness);
    });
  }

  private animateResident(resident: Phaser.GameObjects.Container, name: string, index: number, happiness: number): void {
    const species = FISH_PROFILES.find(profile => profile.name === name);
    const kind = species?.kind ?? "fish";
    let step = 0;

    if (kind === "mollusk") {
      this.tweens.add({
        targets: resident,
        x: `+=${index % 2 === 0 ? 12 : -12}`,
        y: "-=3",
        angle: { from: -2, to: 2 },
        duration: (5200 + index * 310) * (1.35 - happiness * .0035),
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1
      });
      return;
    }

    const moveToNextPoint = (): void => {
      if (!resident.active) return;
      step += 1;
      const isCrab = name === "ปูม้า";
      const isPrawn = name === "กุ้งก้ามกราม";
      const targetX = Phaser.Math.Between(165, 760);
      const targetY = kind === "fish"
        ? Phaser.Math.Between(215, 470)
        : Phaser.Math.Between(isCrab ? 490 : 458, 510);
      const distance = Phaser.Math.Distance.Between(resident.x, resident.y, targetX, targetY);
      const darting = isPrawn && step % 4 === 0;
      const baseDuration = darting ? Phaser.Math.Between(430, 650)
        : isCrab ? Math.max(1700, distance * 8.2)
          : isPrawn ? Math.max(1500, distance * 6.4)
            : Math.max(1700, distance * 6.8);
      const duration = baseDuration * (1.35 - happiness * .0035);
      let previousX = resident.x;
      this.tweens.add({
        targets: resident,
        x: targetX,
        y: targetY,
        duration,
        ease: darting ? "Cubic.Out" : "Sine.InOut",
        onUpdate: () => {
          const movement = resident.x - previousX;
          if (Math.abs(movement) > .02 && !isCrab) resident.setScale(movement > 0 ? 1 : -1, 1);
          resident.setAngle(isCrab
            ? Math.sin(this.time.now / 300 + index) * 2.2
            : Math.sin(this.time.now / 430 + index) * (darting ? 4 : 1.8));
          previousX = resident.x;
        },
        onComplete: () => {
          resident.setAngle(0);
          this.time.delayedCall(Phaser.Math.Between(180, isCrab ? 780 : 540), moveToNextPoint);
        }
      });
    };
    this.time.delayedCall(250 + index * 120, moveToNextPoint);
  }

  private createFish(
    x: number,
    y: number,
    aquariumResident: AquariumResident,
    direction: number
  ): Phaser.GameObjects.Container {
    const name = aquariumResident.name;
    const profile = getFishArt(name);
    const art: Phaser.GameObjects.GameObject = profile
      ? this.add.image(0, 0, profile.textureKey)
        .setDisplaySize(profile.aquariumWidth, profile.aquariumWidth * profile.aspectRatio)
      : this.createFallbackFish(name);
    const hitWidth = profile ? Math.max(90, profile.aquariumWidth + 24) : 145;
    const hitHeight = profile ? Math.max(68, profile.aquariumWidth * profile.aspectRatio + 18) : 75;
    const hit = this.add.zone(0, 0, hitWidth, hitHeight).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => this.openResidentDetail(aquariumResident));
    const container = this.add.container(x, y, [art, hit]).setScale(direction, 1);
    return container;
  }

  private openResidentDetail(resident: AquariumResident): void {
    const species = FISH_PROFILES.find(profile => profile.name === resident.name);
    const info = SPECIES_INFO[resident.name];
    const artProfile = getFishArt(resident.name);
    const satiety = getAquariumSatiety();
    const happiness = getAquariumHappiness();
    const sexLabel = resident.sex === "male" ? "♂ ตัวผู้" : "♀ ตัวเมีย";
    const objects: Phaser.GameObjects.GameObject[] = [];

    objects.push(this.add.rectangle(640, 360, 1280, 720, 0x102f38, .58)
      .setInteractive({ useHandCursor: false }));
    objects.push(addRoundedPanel(this, 245, 150, 790, 420, GAME_THEME.paper, 0xd6b879, 28, 1, 3));
    objects.push(this.add.text(570, 185, resident.name, {
      fontFamily: THAI_FONT, fontSize: "30px", fontStyle: "bold", color: GAME_THEME.ink
    }));
    objects.push(this.add.text(570, 226, `${sexLabel}   •   ${species?.behavior ?? "สงบ"}`, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold",
      color: resident.sex === "male" ? "#347ca2" : "#b65f79"
    }));

    if (artProfile) {
      const width = Math.min(250, artProfile.resultWidth);
      objects.push(this.add.image(410, 338, artProfile.textureKey)
        .setDisplaySize(width, width * artProfile.aspectRatio));
    } else {
      const fallback = this.createFallbackFish(resident.name).setPosition(410, 338).setScale(1.7);
      objects.push(fallback);
    }

    objects.push(addRoundedPanel(this, 560, 270, 420, 128, 0xf5efe2, GAME_THEME.line, 18, 1, 1.2));
    objects.push(this.add.text(585, 290,
      `⚖ น้ำหนัก ${resident.weight.toFixed(2)} กก.\n`+
      `😊 ความสุข ${happiness}%   •   🥣 ความอิ่ม ${satiety}%\n`+
      `🌊 พฤติกรรม ${species?.behavior ?? "สงบ"}`, {
        fontFamily: THAI_FONT, fontSize: "17px", color: GAME_THEME.ink, lineSpacing: 10
      }));
    objects.push(this.add.text(570, 420, info ? `เรื่องน่ารู้: ${info.fact}` : "สัตว์น้ำประจำตู้ของคุณ", {
      fontFamily: THAI_FONT, fontSize: "15px", color: GAME_THEME.muted,
      wordWrap: { width: 405 }, lineSpacing: 5
    }));
    objects.push(this.add.text(570, 466, "เพศและข้อมูลประจำตัวจะติดไปด้วยเมื่อย้ายกลับกระเป๋า", {
      fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.greenText
    }));

    objects.push(addRoundedPanel(this, 560, 505, 150, 48, 0xffffff, GAME_THEME.line, 17, 1, 1.2));
    objects.push(this.add.text(635, 529, "กลับไปดูตู้", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5));
    const closeHit = addPillHitArea(this, 560, 505, 150, 48, () => overlay.destroy(true));
    objects.push(closeHit);

    objects.push(addRoundedPanel(this, 725, 505, 250, 48, 0xffeee8, 0xd78970, 17, 1, 1.2));
    objects.push(this.add.text(850, 529, "↩ นำกลับเข้ากระเป๋า", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#8a4d3d"
    }).setOrigin(.5));
    const removeHit = addPillHitArea(this, 725, 505, 250, 48, () => {
      const result = removeFishFromAquarium(resident.name);
      overlay.destroy(true);
      this.restartWithNotice(result.message);
    });
    objects.push(removeHit);

    const closeCircle = this.add.circle(995, 190, 22, 0xfff9ea)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    closeCircle.on("pointerdown", () => overlay.destroy(true));
    objects.push(closeCircle);
    objects.push(this.add.text(995, 188, "×", {
      fontFamily: THAI_FONT, fontSize: "27px", color: GAME_THEME.ink
    }).setOrigin(.5));

    const overlay = this.add.container(0, 0, objects).setDepth(100);
  }

  private createFallbackFish(name: string): Phaser.GameObjects.Graphics {
    const colors = FISH_COLORS[name] ?? { body: 0xa7c5b9, fin: 0x648e83 };
    const art = this.add.graphics();
    art.fillStyle(colors.fin).fillTriangle(-42, 0, -68, -24, -68, 24);
    art.fillStyle(colors.body).fillEllipse(0, 0, 92, 43);
    art.lineStyle(2.5, 0x315b67, .9).strokeEllipse(0, 0, 92, 43);
    art.fillStyle(0x263e48).fillCircle(31, -8, 3);
    return art;
  }

  private drawDecorations(decorationIds: string[]): void {
    const art = this.add.graphics();
    if (decorationIds.includes("water-plants")) {
      art.lineStyle(9, 0x327d62, 1);
      for (const x of [145, 171, 197]) {
        art.beginPath().moveTo(x, 545).lineTo(x - 8, 498).lineTo(x + 3, 463).strokePath();
      }
      art.fillStyle(0x58a977).fillEllipse(145, 492, 28, 13).fillEllipse(190, 480, 31, 14);
    }
    if (decorationIds.includes("smooth-stones")) {
      art.fillStyle(0x72847c).fillEllipse(395, 544, 105, 44);
      art.fillStyle(0x91a29a).fillEllipse(435, 548, 84, 35);
      art.fillStyle(0xa8b4a9).fillEllipse(365, 555, 65, 27);
    }
    if (decorationIds.includes("treasure-chest")) {
      art.fillStyle(0x7b4c2d).fillRoundedRect(700, 514, 94, 57, 8);
      art.lineStyle(5, 0xd3a63c, 1).strokeRoundedRect(700, 514, 94, 57, 8);
      art.fillStyle(0xd3a63c).fillRect(742, 516, 11, 52).fillCircle(747, 541, 8);
    }
  }

  private drawAlgae(cleanliness: number): void {
    if (cleanliness >= 70) return;
    const intensity = (70 - cleanliness) / 70;
    const algae = this.add.graphics();
    algae.fillStyle(0x426d3c, .2 + intensity * .55);
    const count = Math.round(8 + intensity * 34);
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0;
      const x = side ? 84 + (index % 3) * 7 : 842 - (index % 4) * 6;
      const y = 190 + (index * 53) % 330;
      algae.fillEllipse(x, y, 10 + (index % 4) * 3, 18 + (index % 5) * 4);
    }
  }

  private createBubbles(cleanliness: number): void {
    const alpha = cleanliness < 25 ? .25 : .58;
    for (let index = 0; index < 12; index += 1) {
      const bubble = this.add.circle(120 + index * 58, 520 - (index % 4) * 62, 3 + index % 4, 0xeaffff, alpha)
        .setStrokeStyle(1, 0xffffff, .45);
      this.tweens.add({
        targets: bubble,
        y: 195 + (index % 3) * 22,
        alpha: { from: alpha, to: 0 },
        duration: 3100 + index * 210,
        delay: index * 170,
        repeat: -1
      });
    }
  }

  private drawSidePanel(residents: AquariumResident[], capacity: number, level: number): void {
    addRoundedPanel(this, 890, 126, 320, 505, 0xfffdf7, GAME_THEME.line, 22, 1, 1.5);
    this.drawTabButton(906, 145, 138, "🐠 เพิ่มสัตว์", "fish");
    this.drawTabButton(1052, 145, 138, "✨ ตกแต่ง", "decor");
    if (this.tab === "fish") this.drawFishPicker(residents, capacity);
    else this.drawDecorationPicker(level);
  }

  private drawTabButton(x: number, y: number, width: number, label: string, tab: AquariumTab): void {
    const active = this.tab === tab;
    addRoundedPanel(this, x, y, width, 48, active ? GAME_THEME.orange : 0xffffff,
      active ? GAME_THEME.orangeDark : GAME_THEME.line, 18, 1, active ? 2 : 1.2);
    this.add.text(x + width / 2, y + 24, label, {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, x, y, width, 48, () => {
      if (this.tab === tab) return;
      this.scene.restart({ returnScene: this.returnScene, tab, notice: this.notice });
    });
  }

  private drawFishPicker(residents: AquariumResident[], capacity: number): void {
    const inventory = readInventory();
    const residentNames = new Set(residents.map(resident => resident.name));
    const availableNames = [...new Set([...Object.keys(inventory.fish), ...residentNames])];
    const fishEntries = availableNames.filter(name => {
      const profile = FISH_PROFILES.find(fish => fish.name === name);
      const stack = inventory.fish[name];
      return (residentNames.has(name) || (stack?.count ?? 0) > 0) && Boolean(profile) && name !== LEGENDARY_FISH.name;
    });
    this.add.text(920, 215, `สัตว์น้ำในกระเป๋า  •  ว่าง ${Math.max(0, capacity - residents.length)}`, {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    });
    if (fishEntries.length === 0) {
      this.add.text(1050, 340, "ยังไม่มีสัตว์น้ำ\nในกระเป๋า", {
        fontFamily: THAI_FONT, fontSize: "20px", color: "#918a80", align: "center", lineSpacing: 8
      }).setOrigin(.5);
      return;
    }
    fishEntries.slice(0, 4).forEach((name, index) => {
      const stack = inventory.fish[name];
      const y = 262 + index * 82;
      const aquariumResident = residents.find(resident => resident.name === name);
      const alreadyInTank = Boolean(aquariumResident);
      const full = residents.length >= capacity;
      addRoundedPanel(this, 910, y, 280, 68, alreadyInTank ? 0xe9f3eb : 0xffffff,
        alreadyInTank ? 0x9fc79f : GAME_THEME.line, 17, 1, 1.2);
      this.drawPickerFish(946, y + 34, name);
      this.add.text(983, y + 16, name, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: GAME_THEME.ink
      });
      this.add.text(983, y + 40, alreadyInTank
        ? "อยู่ในตู้ • แตะดูรายละเอียด"
        : `×${stack?.count ?? 0}  ♂${stack?.sexCounts.male ?? 0}  ♀${stack?.sexCounts.female ?? 0}`, {
        fontFamily: THAI_FONT, fontSize: "12px", color: alreadyInTank ? "#4f8064" : "#887b6c"
      });
      const enabled = !alreadyInTank && !full;
      addRoundedPanel(this, 1114, y + 15, 60, 38, enabled ? GAME_THEME.teal : GAME_THEME.mutedFill,
        enabled ? 0x397c68 : 0xbeb7ab, 14, 1, 1.2);
      this.add.text(1144, y + 34, enabled ? "+ ใส่" : "—", {
        fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: enabled ? "#ffffff" : "#8a837a"
      }).setOrigin(.5);
      if (aquariumResident) addPillHitArea(this, 910, y, 196, 68, () => {
        this.openResidentDetail(aquariumResident);
      });
      if (enabled) addPillHitArea(this, 1114, y + 15, 60, 38, () => {
        const result = placeFishInAquarium(name);
        this.restartWithNotice(result.message);
      });
    });
  }

  private drawPickerFish(x: number, y: number, name: string): void {
    const profile = getFishArt(name);
    if (profile) {
      this.add.image(x, y, profile.textureKey).setDisplaySize(64, 64 * profile.aspectRatio);
      return;
    }
    const colors = FISH_COLORS[name] ?? { body: 0xa7c5b9, fin: 0x648e83 };
    const g = this.add.graphics();
    g.fillStyle(colors.fin).fillTriangle(x - 18, y, x - 31, y - 12, x - 31, y + 12);
    g.fillStyle(colors.body).fillEllipse(x, y, 40, 20);
    g.fillStyle(0x2c4850).fillCircle(x + 12, y - 4, 2);
  }

  private drawDecorationPicker(level: number): void {
    this.add.text(920, 215, "เลือกวางหรือเก็บของตกแต่ง", {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    });
    const aquarium = readAquarium();
    AQUARIUM_DECORATIONS.forEach((decoration, index) => {
      const y = 263 + index * 98;
      const unlocked = level >= decoration.unlockLevel;
      const active = aquarium.decorationIds.includes(decoration.id);
      addRoundedPanel(this, 910, y, 280, 80, active ? 0xfff1d4 : unlocked ? 0xffffff : 0xe8e3da,
        active ? GAME_THEME.orangeDark : unlocked ? GAME_THEME.line : 0xbdb6aa, 18, 1, active ? 2 : 1.2);
      this.add.text(946, y + 40, decoration.icon, { fontSize: "31px" }).setOrigin(.5);
      this.add.text(979, y + 17, decoration.name, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
      });
      this.add.text(979, y + 45, unlocked ? (active ? "กำลังตกแต่ง" : "แตะเพื่อวาง") : `ปลดล็อก Lv.${decoration.unlockLevel}`, {
        fontFamily: THAI_FONT, fontSize: "13px", color: unlocked ? "#5b766a" : "#918a80"
      });
      if (unlocked) addPillHitArea(this, 910, y, 280, 80, () => {
        const result = toggleAquariumDecoration(decoration.id);
        this.restartWithNotice(result.message, "decor");
      });
    });
  }

  private restartWithNotice(notice: string, tab = this.tab): void {
    this.scene.restart({ returnScene: this.returnScene, tab, notice });
  }
}
