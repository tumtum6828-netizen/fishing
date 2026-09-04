import Phaser from "phaser";
import "./style.css";
import { FISH_PROFILES, LEGENDARY_FISH, RODS, SPECIES_INFO, type FishProfile } from "./data/gameData";
import { SHOP_ITEMS } from "./data/shopData";
import { adoptPlayerSaveForDevTest, readSaveData, writeSaveData, type SaveData } from "./services/save";
import { PlayerMenuScene } from "./scenes/PlayerMenuScene";
import { QuestScene } from "./scenes/QuestScene";
import { CraftScene } from "./scenes/CraftScene";
import { LevelRewardScene } from "./scenes/LevelRewardScene";
import { RiverScene } from "./scenes/RiverScene";
import { ShopScene } from "./scenes/ShopScene";
import { WorldScene } from "./scenes/WorldScene";
import { AquariumScene } from "./scenes/AquariumScene";
import { BreedingScene } from "./scenes/BreedingScene";
import { BattleScene } from "./scenes/BattleScene";
import { DailyQuestScene } from "./scenes/DailyQuestScene";
import { MarketScene } from "./scenes/MarketScene";
import { CharacterSetupScene } from "./scenes/CharacterSetupScene";
import { WardrobeScene } from "./scenes/WardrobeScene";
import { THAI_FONT } from "./ui/worldHud";
import { recordStarterQuestCatch } from "./services/quests";
import { recordDailyQuestProgress } from "./services/dailyQuests";
import { addFishToInventory, addTrashToInventory, rollAquaticSex } from "./services/inventory";
import type { AquaticSex } from "./types/aquarium";
import { consumeSelectedBait, readBaitStock, readSelectedBait, setSelectedBait } from "./services/bait";
import { addPillHitArea, addRoundedPanel, GAME_THEME } from "./ui/gameTheme";
import { getAnglerLevel } from "./data/questData";
import { activatePotion, consumeActivePotionRound, readActivePotion, readPotionStock } from "./services/potions";
import {
  checkRodUpgrade, getEquippedRodIndex, getFishingEquipment, getRodLockReason,
  getRodUpgradeLevel, isRodUnlocked, upgradeRod
} from "./services/equipment";
import { getRodUpgradeBonuses, ROD_UPGRADE_MAX_LEVEL } from "./data/equipmentUpgradeData";
import { TRASH_LOOT_BY_BIOME } from "./data/craftingData";
import { getBiteWaitMs, getTrashHookChance, rollCatch } from "./services/fishSelection";
import { advanceWorldTime, formatFishingEnvironment, getTimePeriod, readWorldState, type WorldState } from "./services/worldTime";
import { createWeatherOverlay } from "./ui/weatherEffects";
import { FISH_ART, getFishArt } from "./data/fishArt";
import { seedPrototypeTestData } from "./services/testData";
import { migrateSpeciesLog, recordCatch } from "./services/journal";
import { preloadRodArt, ROD_FIRST_PERSON_ART } from "./data/rodArt";

type BattleState = "ready" | "casting" | "waiting" | "hooking" | "fighting" | "caught" | "escaped";
type FishPhase = "burst" | "rest" | "turn";

class HubScene extends Phaser.Scene {
  constructor() { super("HubScene"); }

  create(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x73d4e9, 0x73d4e9, 0x1ba7c2, 0x147b9d, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0xf6e4aa, 1).fillRect(0, 500, 1280, 220);
    g.fillStyle(0x2e826f, 1).fillTriangle(0, 500, 210, 220, 430, 500);
    g.fillTriangle(780, 500, 1010, 180, 1280, 500);

    this.add.text(640, 105, "ผจญภัยโลกสายน้ำ", {
      fontFamily: THAI_FONT, fontSize: "52px", fontStyle: "bold", color: "#fff6d5",
      stroke: "#173c4a", strokeThickness: 8
    }).setOrigin(.5);
    this.add.text(640, 162, "สำรวจ • ตกปลา • เรียนรู้ • อนุรักษ์", {
      fontFamily: THAI_FONT, fontSize: "24px", color: "#ffffff", stroke: "#173c4a", strokeThickness: 5
    }).setOrigin(.5);

    const save = readSaveData();
    addRoundedPanel(this, 452, 190, 376, 52, GAME_THEME.tealDark, GAME_THEME.orange, 22, .9, 1.5);
    this.add.text(640, 216, `🪙 ${save.coins ?? 0}     🐟 ${save.collectionCount ?? 0}     ♻ ${save.conservationPoints ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "19px", color: "#fff6d5"
    }).setOrigin(.5);

    this.makeMenuButton(415, 330, "🎣", "ออกตกปลา", () => this.scene.start("FishingScene"));
    this.makeMenuButton(865, 330, "📖", "สารานุกรม", () => this.scene.start("PlayerMenuScene", { page: "dex" }));
    this.makeMenuButton(415, 495, "🐟", "คอลเลกชัน", () => this.scene.start("PlayerMenuScene", { page: "bag" }));
    this.makeMenuButton(865, 495, "🧍", "ตัวละคร", () => this.scene.start("PlayerMenuScene", { page: "character" }));
  }

  private makeMenuButton(x: number, y: number, icon: string, label: string, action: () => void, muted = false): void {
    addRoundedPanel(this, x - 165, y - 62.5, 330, 125,
      muted ? 0x657b79 : GAME_THEME.tealDark, muted ? 0xc8d4ce : GAME_THEME.orange, 28, .96, 2.5);
    this.add.text(x - 95, y, icon, { fontSize: "45px" }).setOrigin(.5);
    this.add.text(x + 25, y, label, {
      fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: "#fff6d5"
    }).setOrigin(.5);
    addPillHitArea(this, x - 165, y - 62.5, 330, 125, action);
  }
}

class DexScene extends Phaser.Scene {
  constructor() { super("DexScene"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#173f4c");
    addRoundedPanel(this, 50, 35, 1180, 650, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(640, 70, "สารานุกรมสัตว์น้ำ", {
      fontFamily: THAI_FONT, fontSize: "44px", fontStyle: "bold", color: "#173849"
    }).setOrigin(.5);
    addRoundedPanel(this, 40, 43, 150, 54, GAME_THEME.teal, 0x397c68, 20, 1, 1.5);
    this.add.text(115, 70, "← กลับ", { fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    addPillHitArea(this, 40, 43, 150, 54, () => this.scene.start("WorldScene"));

    const save = readSaveData();
    const discovered = new Set(save.discoveredSpecies ?? []);
    const records = new Map(save.records ?? []);
    Object.entries(SPECIES_INFO).forEach(([name, info], index) => {
      const found = discovered.has(name);
      const y = 165 + index * 125;
      addRoundedPanel(this, 135, y - 50, 1010, 100, found ? 0xffffff : 0xe8e2d3,
        found ? GAME_THEME.line : 0xc8c0af, 20, .92, 1.5);
      this.add.text(185, y - 20, found ? "🐟" : "?", { fontSize: "40px", color: "#315968" }).setOrigin(.5);
      const displayName = found ? name : index === Object.keys(SPECIES_INFO).length - 1 ? "??? ปลาตำนาน" : "??? ยังไม่ค้นพบ";
      this.add.text(245, y - 29, displayName, {
        fontFamily: THAI_FONT, fontSize: "25px", fontStyle: "bold", color: "#173849"
      });
      const detail = found
        ? `สถิติ ${(records.get(name) ?? 0).toFixed(2)} กก.  •  ${info.fact}`
        : "ออกสำรวจและตกปลาเพื่อปลดล็อกข้อมูล";
      this.add.text(245, y + 10, detail, {
        fontFamily: THAI_FONT, fontSize: "18px", color: "#46636b", wordWrap: { width: 820 }
      });
    });
  }
}

class EquipmentScene extends Phaser.Scene {
  constructor() { super("EquipmentScene"); }

  preload(): void {
    preloadRodArt(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#173f4c");
    addRoundedPanel(this, 50, 35, 1180, 650, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    this.add.text(640, 65, "อุปกรณ์ตกปลา", {
      fontFamily: THAI_FONT, fontSize: "38px", fontStyle: "bold", color: "#173849"
    }).setOrigin(.5);
    addRoundedPanel(this, 70, 48, 130, 44, GAME_THEME.teal, 0x397c68, 18, 1, 1.5);
    this.add.text(135, 70, "← กลับ", { fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    addPillHitArea(this, 70, 48, 130, 44, () => this.scene.start("PlayerMenuScene", { page: "character" }));

    const save = readSaveData();
    const selected = getEquippedRodIndex(save);
    addRoundedPanel(this, 1010, 42, 155, 46, 0xfff7e5, 0xe0c181, 18, 1, 1.2);
    this.add.text(1087, 65, `🪙 ${save.coins ?? 0}`, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    RODS.forEach((rod, index) => {
      const x = 260 + index * 380;
      const active = index === selected;
      const unlocked = isRodUnlocked(index, save);
      const upgradeLevel = getRodUpgradeLevel(rod.id, save);
      const bonuses = getRodUpgradeBonuses(upgradeLevel);
      const upgradeCheck = checkRodUpgrade(rod.id, save);
      addRoundedPanel(this, x - 165, 120, 330, 460, active ? 0xfff1d4 : unlocked ? 0xffffff : 0xe5e1d8,
        active ? GAME_THEME.orangeDark : unlocked ? GAME_THEME.line : 0xb9b3a8, 26, unlocked ? .98 : .82, active ? 3 : 1.5);
      addRoundedPanel(this, x - 91, 132, 182, 84, unlocked ? 0xfff8e9 : 0xd7d2c8,
        unlocked ? 0xe4b357 : 0xbab3a7, 22, unlocked ? 1 : .82, 1.5);
      this.add.image(x, 174, ROD_FIRST_PERSON_ART[rod.id].textureKey)
        .setOrigin(.5)
        .setDisplaySize(92, 126)
        .setRotation(1.05)
        .setAlpha(unlocked ? 1 : .38);
      if (!unlocked) this.add.text(x, 174, "🔒", { fontSize: "30px" }).setOrigin(.5);
      this.add.text(x, 224, rod.name, {
        fontFamily: THAI_FONT, fontSize: "28px", fontStyle: "bold", color: "#173849"
      }).setOrigin(.5);
      this.add.text(x, 256, `ระดับคัน ${rod.level}  •  ปรับแต่ง +${upgradeLevel}`, {
        fontFamily: THAI_FONT, fontSize: "18px", color: "#6f746e"
      }).setOrigin(.5);
      const fishAccess = rod.level === 1
        ? "สัตว์น้ำสงบและหอย"
        : rod.level === 2
          ? "สัตว์น้ำทั่วไปและหายาก"
          : "สัตว์น้ำทุกกลุ่ม";
      const lineResistance = rod.lineResistance * bonuses.lineResistanceMultiplier;
      const durability = Math.round((2 - lineResistance) * 100);
      this.add.text(x, 350,
        `ความทนสาย  ${durability}%\nกำลังรอก  ${Math.round((rod.reelPower + bonuses.reelPowerBonus) * 100)}%\nควบคุม  ${Math.round((rod.control + bonuses.controlBonus) * 100)}%\nระยะสูงสุด  ${rod.maxCastDistance + bonuses.castDistanceBonus} ม.\nโชคตกปลา  +${Math.round((rod.luckBonus + bonuses.luckBonus) * 100)}%`, {
        fontFamily: THAI_FONT, fontSize: "17px", color: "#315968", align: "left", lineSpacing: 6,
        wordWrap: { width: 270 }
      }).setOrigin(.5);
      this.add.text(x, 448, `${fishAccess} • ${rod.allowsLegendary ? "พบปลาตำนานได้" : "ยังไม่พบปลาตำนาน"}`, {
        fontFamily: THAI_FONT, fontSize: "13px", color: "#6c766f", align: "center",
        wordWrap: { width: 285 }
      }).setOrigin(.5);
      addRoundedPanel(this, x - 145, 482, 135, 48,
        active || !unlocked ? GAME_THEME.mutedFill : GAME_THEME.teal,
        active || !unlocked ? 0xbeb7ab : 0x397c68, 18, 1, 1.5);
      this.add.text(x - 77.5, 506, active ? "กำลังใช้" : unlocked ? "เลือกใช้" : "ยังล็อก", {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: unlocked ? "#ffffff" : "#786f63"
      }).setOrigin(.5);
      if (unlocked && !active) {
        addPillHitArea(this, x - 145, 482, 135, 48, () => {
          writeSaveData({ rodIndex: index });
          this.scene.restart();
        });
      }
      const maxUpgrade = upgradeLevel >= ROD_UPGRADE_MAX_LEVEL;
      addRoundedPanel(this, x + 10, 482, 135, 48,
        upgradeCheck.canUpgrade ? GAME_THEME.orange : GAME_THEME.mutedFill,
        upgradeCheck.canUpgrade ? GAME_THEME.orangeDark : 0xbeb7ab, 18, 1, 1.5);
      const upgradeLabel = maxUpgrade ? "MAX +5" : upgradeCheck.cost
        ? `อัป +${upgradeLevel + 1}  🪙${upgradeCheck.cost.coins}`
        : "อัปเกรด";
      this.add.text(x + 77.5, 506, upgradeLabel, {
        fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold",
        color: upgradeCheck.canUpgrade ? GAME_THEME.ink : "#786f63"
      }).setOrigin(.5);
      if (upgradeCheck.canUpgrade) addPillHitArea(this, x + 10, 482, 135, 48, () => {
        upgradeRod(rod.id);
        this.scene.restart();
      });
      const materialText = maxUpgrade ? "ปรับแต่งเต็มประสิทธิภาพแล้ว"
        : upgradeCheck.cost?.materials.length
          ? upgradeCheck.cost.materials.map(item => `${item.name} ×${item.amount}`).join(" • ")
          : upgradeCheck.reason;
      this.add.text(x, 554, unlocked ? materialText : getRodLockReason(index, save), {
        fontFamily: THAI_FONT, fontSize: "11px", color: upgradeCheck.canUpgrade ? "#6b765e" : "#9a7563",
        align: "center", wordWrap: { width: 292 }
      }).setOrigin(.5);
    });
    const reinforced = (save.ownedShopItems?.["reinforced-line"] ?? 0) > 0;
    addRoundedPanel(this, 360, 605, 560, 52, reinforced ? GAME_THEME.paleGreen : 0xf2eee4,
      reinforced ? 0x9fc79f : 0xd3cab8, 18, 1, 1.25);
    this.add.text(640, 631, reinforced
      ? "🧵 เอ็นถักเสริมแรงติดตั้งแล้ว • ลดแรงตึงเพิ่ม 8%"
      : "🧵 ยังไม่มีเอ็นถักเสริมแรง • ซื้อได้ที่ร้านลุงมนัส", {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: reinforced ? "#3f7149" : "#71695f"
    }).setOrigin(.5);
  }
}

class FishingScene extends Phaser.Scene {
  private returnScene = "WorldScene";
  private returnSpawn: string | undefined;
  private biome: "coast" | "river" = "coast";
  private state: BattleState = "ready";
  private fishStamina = 100;
  private fishMaxStamina = 100;
  private fishProfile = FISH_PROFILES[0];
  private isLegendary = false;
  private rodIndex = 0;
  private selectedBaitId: string | undefined;
  private roundBaitId: string | undefined;
  private roundPotionId: string | undefined;
  private tension = 30;
  private fishDistance = 28;
  private castPower = 0;
  private castDirection = 1;
  private castDistance = 10;
  private castTarget = .5;
  private castReleasedAt = -1000;
  private hookDeadline = 0;
  private biteTimer?: Phaser.Time.TimerEvent;
  private hookTimer?: Phaser.Time.TimerEvent;
  private castGrade: "excellent" | "good" | "poor" = "poor";
  private hookedTrash = false;
  private caughtTrashName = "กระป๋องเก่า";
  private catchName = "ปลากะพง";
  private pendingSex: AquaticSex = "male";
  private fishDirection = -1;
  private fishBurst = 0;
  private fishPhase: FishPhase = "burst";
  private fishPhaseTimer = 0;
  private rodInput = 0;
  private reeling = false;
  private battleTime = 0;
  private nextFightShakeAt = 0;
  private records = new Map<string, number>();
  private discoveredSpecies = new Set<string>();
  private coins = 0;
  private conservationPoints = 0;
  private collectionCount = 0;
  private anglerXp = 0;
  private lineResistance = 1;
  private reelPower = 1;
  private rodControl = 1;
  private maxCastDistance = 50;
  private luckBonus = 0;
  private pendingWeight = 0;
  private pendingXp = 0;
  private worldState: WorldState = { day: 1, minutes: 480, weather: "clear" };
  private environmentVisualKey = "";

  private fish!: Phaser.GameObjects.Container;
  private fishNameText!: Phaser.GameObjects.Text;
  private fishHud!: Phaser.GameObjects.Container;
  private rodButton!: Phaser.GameObjects.Graphics;
  private rodText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private baitBack!: Phaser.GameObjects.Arc;
  private baitNameText!: Phaser.GameObjects.Text;
  private baitHintText!: Phaser.GameObjects.Text;
  private baitPicker?: Phaser.GameObjects.Container;
  private potionBack!: Phaser.GameObjects.Arc;
  private potionNameText!: Phaser.GameObjects.Text;
  private potionHintText!: Phaser.GameObjects.Text;
  private potionPicker?: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private phaseBack!: Phaser.GameObjects.Graphics;
  private distanceText!: Phaser.GameObjects.Text;
  private distanceBadgeBack!: Phaser.GameObjects.Arc;
  private waterContact!: Phaser.GameObjects.Graphics;
  private reelButton!: Phaser.GameObjects.Arc;
  private reelTitle!: Phaser.GameObjects.Text;
  private reelSubtitle!: Phaser.GameObjects.Text;
  private leftButton!: Phaser.GameObjects.Arc;
  private rightButton!: Phaser.GameObjects.Arc;
  private line!: Phaser.GameObjects.Graphics;
  private lineGauge!: Phaser.GameObjects.Graphics;
  private rod!: Phaser.GameObjects.Graphics;
  private rodSprite!: Phaser.GameObjects.Image;
  private castGauge!: Phaser.GameObjects.Graphics;
  private resultPanel!: Phaser.GameObjects.Container;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultRarity!: Phaser.GameObjects.Text;
  private resultDetails!: Phaser.GameObjects.Text;
  private resultFact!: Phaser.GameObjects.Text;
  private resultFishPreview!: Phaser.GameObjects.Container;
  private resultFishBody!: Phaser.GameObjects.Ellipse;
  private resultFishTail!: Phaser.GameObjects.Triangle;
  private resultFishFin!: Phaser.GameObjects.Triangle;
  private resultFishBeak!: Phaser.GameObjects.Rectangle;
  private resultFishSprite!: Phaser.GameObjects.Image;
  private resultFishEye!: Phaser.GameObjects.Arc;
  private resultFishPupil!: Phaser.GameObjects.Arc;
  private resultCreatureArt!: Phaser.GameObjects.Graphics;
  private keepButton!: Phaser.GameObjects.Rectangle;
  private sellButton!: Phaser.GameObjects.Rectangle;
  private releaseButton!: Phaser.GameObjects.Rectangle;
  private keepButtonBack!: Phaser.GameObjects.Graphics;
  private sellButtonBack!: Phaser.GameObjects.Graphics;
  private releaseButtonBack!: Phaser.GameObjects.Graphics;
  private keepButtonText!: Phaser.GameObjects.Text;
  private sellButtonText!: Phaser.GameObjects.Text;
  private releaseButtonText!: Phaser.GameObjects.Text;
  private dexPanel!: Phaser.GameObjects.Container;
  private dexListText!: Phaser.GameObjects.Text;
  private environmentText!: Phaser.GameObjects.Text;
  private weatherOverlay?: Phaser.GameObjects.Container;

  constructor() { super("FishingScene"); }

  init(data?: { returnScene?: string; returnSpawn?: string; biome?: "coast" | "river" }): void {
    this.returnScene = data?.returnScene ?? "WorldScene";
    this.returnSpawn = data?.returnSpawn;
    this.biome = data?.biome ?? "coast";
  }

  preload(): void {
    if (!this.textures.exists("fishing-coast-bg-v1")) {
      this.load.image("fishing-coast-bg-v1", "assets/fishing/coast-fishing-bg-v2.png");
    }
    Object.values(FISH_ART).forEach(art => {
      if (!this.textures.exists(art.textureKey)) this.load.image(art.textureKey, art.path);
    });
    if (!this.textures.exists("fishing-river-bg-v1")) {
      this.load.image("fishing-river-bg-v1", "assets/fishing/river-fishing-bg-v2.png");
    }
    preloadRodArt(this);
  }

  create(): void {
    this.loadProgress();
    this.cameras.main.setBackgroundColor("#8bdff3");
    this.drawWorld();
    this.refreshWeatherVisuals();
    this.createFish();
    this.createRod();
    this.createHud();
    this.createControls();
    this.resetBattle();

    const leftDown = () => (this.rodInput = -1);
    const leftUp = () => { if (this.rodInput < 0) this.rodInput = 0; };
    const rightDown = () => (this.rodInput = 1);
    const rightUp = () => { if (this.rodInput > 0) this.rodInput = 0; };
    const actionDown = () => this.actionDown();
    const actionUp = () => this.actionUp();
    this.input.keyboard?.on("keydown-LEFT", leftDown);
    this.input.keyboard?.on("keyup-LEFT", leftUp);
    this.input.keyboard?.on("keydown-RIGHT", rightDown);
    this.input.keyboard?.on("keyup-RIGHT", rightUp);
    this.input.keyboard?.on("keydown-SPACE", actionDown);
    this.input.keyboard?.on("keyup-SPACE", actionUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearFishingTimers();
      this.input.keyboard?.off("keydown-LEFT", leftDown);
      this.input.keyboard?.off("keyup-LEFT", leftUp);
      this.input.keyboard?.off("keydown-RIGHT", rightDown);
      this.input.keyboard?.off("keyup-RIGHT", rightUp);
      this.input.keyboard?.off("keydown-SPACE", actionDown);
      this.input.keyboard?.off("keyup-SPACE", actionUp);
    });
  }

  private drawWorld(): void {
    const backgroundKey = this.biome === "river" ? "fishing-river-bg-v1" : "fishing-coast-bg-v1";
    this.add.image(640, 360, backgroundKey).setDisplaySize(1280, 720).setDepth(-10);

    // ภาพน้ำมีรายละเอียดอยู่แล้ว จึงเติมเฉพาะการเคลื่อนไหวบาง ๆ ให้ฉากมีชีวิต
    // โดยไม่แสดงเงาปลาก่อนฮุก เพื่อคงความลุ้นระหว่างรอปลาเข้ากินเหยื่อ
    const shimmerRows = this.biome === "river"
      ? [[330, 150], [410, 260], [500, 90], [555, 360], [455, 650], [350, 830], [520, 980]]
      : [[310, 100], [380, 290], [470, 180], [540, 430], [410, 700], [505, 850], [570, 1040]];
    shimmerRows.forEach(([y, x], index) => {
      const shimmer = this.add.ellipse(x, y, 100 + (index % 3) * 34, 4 + (index % 2), 0xdffef6, .12)
        .setDepth(-5)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shimmer,
        x: x + 35 + index * 4,
        alpha: { from: .04, to: .2 },
        scaleX: { from: .72, to: 1.15 },
        duration: 2600 + index * 310,
        delay: index * 170,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut"
      });
    });

    const ripplePositions = this.biome === "river"
      ? [[355, 505], [890, 430], [690, 565]]
      : [[330, 485], [875, 390], [735, 555]];
    ripplePositions.forEach(([x, y], index) => {
      const ripple = this.add.ellipse(x, y, 74, 20)
        .setStrokeStyle(2, 0xd7fff7, .42)
        .setFillStyle(0xffffff, 0)
        .setDepth(-4)
        .setScale(.35)
        .setAlpha(0);
      this.tweens.add({
        targets: ripple,
        alpha: { from: .36, to: 0 },
        scaleX: { from: .35, to: 1.5 },
        scaleY: { from: .35, to: 1.5 },
        duration: 2300 + index * 250,
        delay: 700 + index * 1100,
        repeat: -1,
        repeatDelay: 1700 + index * 420,
        ease: "Sine.out"
      });
    });
  }

  private createFish(): void {
    const body = this.add.ellipse(0, 0, 150, 62, 0xb8d8d2).setStrokeStyle(5, 0x315b67);
    const tail = this.add.triangle(-92, 0, 0, 0, 55, -43, 55, 43, 0x75b0ad).setStrokeStyle(4, 0x315b67);
    const fin = this.add.triangle(-2, 20, 0, 0, 42, 12, 10, 34, 0x75b0ad);
    const eye = this.add.circle(47, -12, 7, 0xffffff).setStrokeStyle(3, 0x315b67);
    const pupil = this.add.circle(49, -12, 3, 0x172e38);
    this.fish = this.add.container(545, 420, [tail, body, fin, eye, pupil]);
    this.waterContact = this.add.graphics().setDepth(4);
  }

  private createRod(): void {
    this.rod = this.add.graphics().setDepth(2);
    this.line = this.add.graphics().setDepth(1);
    this.lineGauge = this.add.graphics().setDepth(6);
    this.castGauge = this.add.graphics().setDepth(5);
    this.rodSprite = this.add.image(640, 722, ROD_FIRST_PERSON_ART[RODS[this.rodIndex].id].textureKey)
      .setOrigin(.47, 1)
      .setDisplaySize(430, 492)
      .setDepth(2);
  }

  private createHud(): void {
    this.fishNameText = this.add.text(1200, 180, "แรงตึงสาย 30%", {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: "#fff6d5",
      stroke: "#173c4a", strokeThickness: 4
    }).setOrigin(.5);
    this.fishHud = this.add.container(0, 0, [this.fishNameText]).setDepth(8).setVisible(false);

    this.rodButton = addRoundedPanel(this, 936, 18, 294, 82, GAME_THEME.tealDark, 0xa7e8f2, 25, .93, 2);
    this.rodText = this.add.text(1083, 43, "", {
      fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: "#fff6d5", align: "center"
    }).setOrigin(.5);
    this.add.text(1083, 74, "เปลี่ยนได้จากหน้าอุปกรณ์", {
      fontFamily: THAI_FONT, fontSize: "12px", color: "#bfe9e5"
    }).setOrigin(.5);
    this.updateRodLabel();

    addRoundedPanel(this, 20, 18, 300, 82, GAME_THEME.tealDark, 0xa7e8f2, 25, .93, 2);
    this.environmentText = this.add.text(170, 59, formatFishingEnvironment(this.worldState, this.biome), {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#fff6d5",
      align: "center", lineSpacing: 4
    }).setOrigin(.5);

    addRoundedPanel(this, 532, 20, 216, 46, GAME_THEME.cream, 0xe9bd62, 20, .97, 1.5);
    this.resourceText = this.add.text(640, 43, "", {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    this.updateResourceLabel();

    addRoundedPanel(this, 20, 116, 118, 46, GAME_THEME.cream, 0xe9bd62, 18, .97, 1.5);
    this.add.text(79, 139, "← กลับ", {
      fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, 20, 116, 118, 46, () => {
      if (this.state === "ready" && !this.resultPanel.visible) {
        this.scene.start(this.returnScene, this.returnSpawn ? { spawn: this.returnSpawn } : undefined);
      }
    });

    this.add.circle(1039, 621, 44, 0x173f4c, .28);
    this.baitBack = this.add.circle(1035, 615, 42, GAME_THEME.cream, .98)
      .setStrokeStyle(4, GAME_THEME.orange, 1)
      .setInteractive({ useHandCursor: true });
    this.baitNameText = this.add.text(1035, 606, "", { fontSize: "28px" }).setOrigin(.5);
    this.baitHintText = this.add.text(1035, 637, "", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    this.add.text(1035, 672, "เหยื่อ", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#fff5d8",
      stroke: "#173f4c", strokeThickness: 4
    }).setOrigin(.5);
    this.baitBack.on("pointerdown", () => this.toggleBaitPicker(true));
    this.updateBaitHud();

    this.add.circle(949, 621, 41, 0x173f4c, .28);
    this.potionBack = this.add.circle(945, 615, 39, GAME_THEME.cream, .98)
      .setStrokeStyle(4, GAME_THEME.teal, 1)
      .setInteractive({ useHandCursor: true });
    this.potionNameText = this.add.text(945, 606, "🧪", { fontSize: "25px" }).setOrigin(.5);
    this.potionHintText = this.add.text(945, 636, "ไม่มี", {
      fontFamily: THAI_FONT, fontSize: "11px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    this.add.text(945, 671, "ยาช่วยตก", {
      fontFamily: THAI_FONT, fontSize: "11px", fontStyle: "bold", color: "#fff5d8",
      stroke: "#173f4c", strokeThickness: 4
    }).setOrigin(.5);
    this.potionBack.on("pointerdown", () => this.togglePotionPicker(true));
    this.updatePotionHud();

    this.statusText = this.add.text(640, 150, "", {
      fontFamily: THAI_FONT, fontSize: "40px", fontStyle: "bold", color: "#fff7d4",
      stroke: "#173c4a", strokeThickness: 7, align: "center"
    }).setOrigin(.5);
    this.hintText = this.add.text(640, 202, "", {
      fontFamily: THAI_FONT, fontSize: "22px", color: "#ffffff", stroke: "#173c4a", strokeThickness: 5
    }).setOrigin(.5);
    this.phaseBack = this.add.graphics().setDepth(7).setVisible(false);
    this.phaseText = this.add.text(640, 268, "", {
      fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: "#ffffff",
      stroke: "#173c4a", strokeThickness: 5
    }).setOrigin(.5).setDepth(8).setVisible(false);
    this.distanceBadgeBack = this.add.circle(545, 340, 31, GAME_THEME.tealDark, .9)
      .setStrokeStyle(3, GAME_THEME.orange, 1).setDepth(6).setVisible(false);
    this.distanceText = this.add.text(545, 340, "28 ม.", {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: "#fff7d4",
      stroke: "#173c4a", strokeThickness: 3
    }).setOrigin(.5).setDepth(7).setVisible(false);
    this.createResultPanel();
  }

  private createResultPanel(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071f2a, .48);
    const card = addRoundedPanel(this, 310, 165, 660, 430, GAME_THEME.cream, GAME_THEME.orange, 28, 1, 3);
    this.resultTitle = this.add.text(640, 205, "", {
      fontFamily: THAI_FONT, fontSize: "38px", fontStyle: "bold", color: "#173849", align: "center"
    }).setOrigin(.5);
    this.resultRarity = this.add.text(640, 252, "", {
      fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: "#a35b16"
    }).setOrigin(.5);

    this.resultFishTail = this.add.triangle(-112, 0, 0, 0, 65, -48, 65, 48, 0x75b0ad).setStrokeStyle(4, 0x315b67);
    this.resultFishBody = this.add.ellipse(0, 0, 190, 82, 0xb8d8d2).setStrokeStyle(5, 0x315b67);
    this.resultFishFin = this.add.triangle(-4, 29, 0, 0, 52, 13, 12, 42, 0x75b0ad);
    this.resultFishBeak = this.add.rectangle(132, -2, 95, 9, 0x315b67).setOrigin(0, .5).setVisible(false);
    this.resultFishEye = this.add.circle(62, -17, 9, 0xffffff).setStrokeStyle(3, 0x315b67);
    this.resultFishPupil = this.add.circle(65, -17, 4, 0x172e38);
    this.resultCreatureArt = this.add.graphics();
    this.resultFishSprite = this.add.image(0, 0, "fish-art-mullet-v2").setVisible(false);
    this.resultFishPreview = this.add.container(640, 338, [
      this.resultCreatureArt, this.resultFishSprite, this.resultFishTail, this.resultFishBody, this.resultFishFin,
      this.resultFishBeak, this.resultFishEye, this.resultFishPupil
    ]);

    this.resultDetails = this.add.text(640, 425, "", {
      fontFamily: THAI_FONT, fontSize: "27px", color: "#173849", align: "center", lineSpacing: 10
    }).setOrigin(.5);
    this.resultFact = this.add.text(640, 492, "", {
      fontFamily: THAI_FONT, fontSize: "20px", color: "#315968", align: "center",
      wordWrap: { width: 560 }
    }).setOrigin(.5);
    this.keepButtonBack = addRoundedPanel(this, 405, 534, 150, 52, GAME_THEME.teal, 0x397c68, 19, 1, 1.5);
    this.sellButtonBack = addRoundedPanel(this, 565, 534, 150, 52, GAME_THEME.orange, GAME_THEME.orangeDark, 19, 1, 1.5);
    this.releaseButtonBack = addRoundedPanel(this, 725, 534, 150, 52, 0x5297ae, 0x39778c, 19, 1, 1.5);
    this.keepButton = this.add.rectangle(480, 560, 150, 52, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.sellButton = this.add.rectangle(640, 560, 150, 52, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.releaseButton = this.add.rectangle(800, 560, 150, 52, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.keepButtonText = this.add.text(480, 560, "เก็บ", { fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    this.sellButtonText = this.add.text(640, 560, "ขาย", { fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    this.releaseButtonText = this.add.text(800, 560, "ปล่อยกลับ", { fontFamily: THAI_FONT, fontSize: "20px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    this.keepButton.on("pointerdown", () => this.resolveCatch("keep"));
    this.sellButton.on("pointerdown", () => this.resolveCatch("sell"));
    this.releaseButton.on("pointerdown", () => this.resolveCatch("release"));
    this.resultPanel = this.add.container(0, 0, [
      shade, card, this.resultTitle, this.resultRarity, this.resultFishPreview,
      this.resultDetails, this.resultFact,
      this.keepButtonBack, this.sellButtonBack, this.releaseButtonBack,
      this.keepButton, this.sellButton, this.releaseButton,
      this.keepButtonText, this.sellButtonText, this.releaseButtonText
    ])
      .setDepth(20).setVisible(false);
    this.createDexPanel();
  }

  private createDexPanel(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071f2a, .56);
    const book = addRoundedPanel(this, 290, 110, 700, 500, GAME_THEME.cream, GAME_THEME.orange, 28, 1, 3);
    const title = this.add.text(640, 145, "สารานุกรมสัตว์น้ำ", {
      fontFamily: THAI_FONT, fontSize: "36px", fontStyle: "bold", color: "#173849"
    }).setOrigin(.5);
    this.dexListText = this.add.text(365, 205, "", {
      fontFamily: THAI_FONT, fontSize: "23px", color: "#244b59", lineSpacing: 18,
      wordWrap: { width: 550 }
    });
    const closeBack = addRoundedPanel(this, 545, 534, 190, 52, GAME_THEME.teal, 0x397c68, 19, 1, 1.5);
    const closeButton = this.add.rectangle(640, 560, 190, 52, 0xffffff, 0).setInteractive({ useHandCursor: true });
    const closeText = this.add.text(640, 560, "ปิดสมุด", {
      fontFamily: THAI_FONT, fontSize: "21px", fontStyle: "bold", color: "#ffffff"
    }).setOrigin(.5);
    closeButton.on("pointerdown", () => this.toggleDex(false));
    this.dexPanel = this.add.container(0, 0, [shade, book, title, this.dexListText, closeBack, closeButton, closeText])
      .setDepth(30).setVisible(false);
  }

  private makeTouchButton(x: number, y: number, label: string): Phaser.GameObjects.Arc {
    this.add.circle(x + 5, y + 7, 61, 0x173f4c, .3);
    const button = this.add.circle(x, y, 58, GAME_THEME.tealDark, .88).setStrokeStyle(5, 0xd9f4ef).setInteractive();
    this.add.circle(x, y, 47, 0x287d9a, .52).setStrokeStyle(1.5, 0xffffff, .35);
    this.add.text(x, y, label, { fontFamily: THAI_FONT, fontSize: "39px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    return button;
  }

  private createControls(): void {
    this.leftButton = this.makeTouchButton(105, 625, "←");
    this.rightButton = this.makeTouchButton(245, 625, "→");
    this.add.circle(1166, 622, 81, 0x173f4c, .32);
    this.reelButton = this.add.circle(1160, 615, 76, GAME_THEME.orange).setStrokeStyle(7, 0xfff0bd).setInteractive();
    this.add.circle(1160, 615, 63, 0xffbf43, .7).setStrokeStyle(2, GAME_THEME.orangeDark, .72);
    this.add.ellipse(1138, 581, 54, 18, 0xffffff, .22).setRotation(-.35);
    this.reelTitle = this.add.text(1160, 607, "เหวี่ยงเบ็ด", { fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#4d3218" }).setOrigin(.5);
    this.reelSubtitle = this.add.text(1160, 638, "กดค้าง", { fontFamily: THAI_FONT, fontSize: "17px", color: "#4d3218" }).setOrigin(.5);

    const bindHold = (button: Phaser.GameObjects.Arc, value: number) => {
      button.on("pointerdown", () => { this.rodInput = value; button.setScale(.92); });
      button.on("pointerup", () => { this.rodInput = 0; button.setScale(1); });
      button.on("pointerout", () => { this.rodInput = 0; button.setScale(1); });
    };
    bindHold(this.leftButton, -1);
    bindHold(this.rightButton, 1);
    this.reelButton.on("pointerdown", () => { this.actionDown(); this.reelButton.setScale(.94); });
    this.reelButton.on("pointerup", () => { this.actionUp(); this.reelButton.setScale(1); });
    this.reelButton.on("pointerout", () => { this.actionUp(); this.reelButton.setScale(1); });
  }

  private toggleBaitPicker(open: boolean): void {
    if (!open) {
      this.baitPicker?.destroy(true);
      this.baitPicker = undefined;
      return;
    }
    if (this.state !== "ready" || this.resultPanel.visible) {
      this.hintText.setText("เปลี่ยนเหยื่อไม่ได้ระหว่างตก • เปลี่ยนได้เมื่อกลับสู่ช่วงเตรียมตัว");
      return;
    }
    if (this.baitPicker) return;
    this.togglePotionPicker(false);

    const save = readSaveData();
    const baitStock = readBaitStock(save);
    const available = SHOP_ITEMS.filter(item => item.category === "bait" && baitStock[item.id] > 0);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x0b3039, .58).setInteractive();
    shade.on("pointerdown", () => this.toggleBaitPicker(false));
    objects.push(shade);
    objects.push(addRoundedPanel(this, 350, 135, 580, 470, GAME_THEME.cream, GAME_THEME.orange, 28, 1, 3));
    objects.push(this.add.text(395, 174, "🪱  เลือกเหยื่อ", {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(0, .5));
    objects.push(this.add.text(395, 208, "เลือกได้ก่อนเหวี่ยงเบ็ดเท่านั้น", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(0, .5));

    const close = this.add.circle(890, 174, 22, 0xfff5df)
      .setStrokeStyle(1.5, 0xd2a75e)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.toggleBaitPicker(false));
    objects.push(close, this.add.text(890, 172, "×", {
      fontFamily: THAI_FONT, fontSize: "27px", color: GAME_THEME.ink
    }).setOrigin(.5));

    const choices = [
      ...available.map(item => ({ id: item.id as string | undefined, icon: item.icon, name: item.name,
        detail: `เหลือ ${baitStock[item.id]} ชิ้น • ${item.description}` })),
      { id: "none", icon: "○", name: "ไม่ใช้เหยื่อ", detail: "ผลในเกม: รอนานขึ้น • มีโอกาสติดขยะสูง" }
    ];
    choices.forEach((choice, index) => {
      const y = 238 + index * 100;
      const selected = choice.id === this.selectedBaitId;
      objects.push(addRoundedPanel(this, 385, y, 510, 82,
        selected ? GAME_THEME.paleGreen : 0xfffdf7,
        selected ? GAME_THEME.teal : GAME_THEME.line, 20, 1, selected ? 2 : 1.2));
      objects.push(this.add.circle(430, y + 41, 27, selected ? 0xd7ebd9 : 0xffefd2));
      objects.push(this.add.text(430, y + 41, choice.icon, { fontSize: "26px" }).setOrigin(.5));
      objects.push(this.add.text(474, y + 22, choice.name, {
        fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.ink
      }));
      objects.push(this.add.text(474, y + 49, choice.detail, {
        fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted,
        wordWrap: { width: 365 }, maxLines: 2
      }));
      if (selected) {
        objects.push(this.add.text(855, y + 20, "เลือกอยู่ ✓", {
          fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: GAME_THEME.greenText
        }).setOrigin(1, 0));
      }
      const hit = this.add.zone(385, y, 510, 82).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.selectedBaitId = choice.id;
        setSelectedBait(choice.id ?? "none");
        this.updateBaitHud();
        this.toggleBaitPicker(false);
      });
      objects.push(hit);
    });

    if (available.length === 0) {
      objects.push(this.add.text(640, 520, "ยังไม่มีเหยื่อ • ซื้อได้จากร้านลุงมนัส", {
        fontFamily: THAI_FONT, fontSize: "14px", color: "#a0663b"
      }).setOrigin(.5));
    }
    this.baitPicker = this.add.container(0, 0, objects).setDepth(40);
  }

  private updateBaitHud(): void {
    if (!this.baitBack) return;
    const selected = readSelectedBait();
    const bait = selected.item;
    const count = selected.count;
    const editable = this.state === "ready" && !this.resultPanel?.visible;
    this.baitBack
      .setFillStyle(editable ? GAME_THEME.cream : 0xb6c3bf, editable ? .96 : .72)
      .setStrokeStyle(3, editable ? GAME_THEME.orange : 0x71847e, .98);
    this.baitNameText.setText(bait && count > 0 ? bait.icon : "○");
    this.baitHintText.setText(bait && count > 0 ? `×${count}` : "ไม่ใช้");
    this.baitNameText.setAlpha(editable ? 1 : .72);
    this.baitHintText.setAlpha(editable ? 1 : .72);
  }

  private togglePotionPicker(open: boolean): void {
    if (!open) {
      this.potionPicker?.destroy(true);
      this.potionPicker = undefined;
      return;
    }
    if (this.state !== "ready" || this.resultPanel.visible) {
      this.hintText.setText("ใช้หรือเปลี่ยนยาไม่ได้ระหว่างตก • เตรียมยาให้พร้อมก่อนเหวี่ยงเบ็ด");
      return;
    }
    if (this.potionPicker) return;
    this.toggleBaitPicker(false);

    const save = readSaveData();
    const stock = readPotionStock(save);
    const active = readActivePotion(save);
    const choices = SHOP_ITEMS.filter(item => item.category === "potion"
      && ((stock[item.id] ?? 0) > 0 || active.item?.id === item.id));
    const objects: Phaser.GameObjects.GameObject[] = [];
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x0b3039, .58).setInteractive();
    shade.on("pointerdown", () => this.togglePotionPicker(false));
    objects.push(shade, addRoundedPanel(this, 350, 145, 580, 430, GAME_THEME.cream, 0x7eb5a6, 28, 1, 3));
    objects.push(this.add.text(395, 184, "🧪  ยาช่วยตกปลา", {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(0, .5));
    objects.push(this.add.text(395, 218, active.item
      ? "ยากำลังออกฤทธิ์จนกว่าจะครบจำนวนรอบ"
      : "เลือกใช้หนึ่งขวด • ออกฤทธิ์ต่อเนื่อง 5 รอบ", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(0, .5));

    const close = this.add.circle(890, 184, 22, 0xfff5df)
      .setStrokeStyle(1.5, 0x7eb5a6)
      .setInteractive({ useHandCursor: true });
    close.on("pointerdown", () => this.togglePotionPicker(false));
    objects.push(close, this.add.text(890, 182, "×", {
      fontFamily: THAI_FONT, fontSize: "27px", color: GAME_THEME.ink
    }).setOrigin(.5));

    choices.forEach((item, index) => {
      const y = 248 + index * 112;
      const selected = active.item?.id === item.id;
      const blocked = Boolean(active.item && !selected);
      objects.push(addRoundedPanel(this, 385, y, 510, 92,
        selected ? GAME_THEME.paleGreen : blocked ? 0xe7e4dc : 0xfffdf7,
        selected ? GAME_THEME.teal : GAME_THEME.line, 20, 1, selected ? 2 : 1.2));
      objects.push(this.add.circle(430, y + 46, 29, selected ? 0xd7ebd9 : 0xffefd2));
      objects.push(this.add.text(430, y + 46, item.icon, { fontSize: "28px" }).setOrigin(.5));
      objects.push(this.add.text(474, y + 18, item.name, {
        fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: blocked ? "#9a958b" : GAME_THEME.ink
      }));
      const availability = selected
        ? `กำลังออกฤทธิ์ • เหลือ ${active.usesRemaining} รอบ`
        : blocked
          ? "รอให้ยาปัจจุบันหมดฤทธิ์ก่อน"
          : `มี ${stock[item.id] ?? 0} ขวด • ${item.description}`;
      objects.push(this.add.text(474, y + 48, availability, {
        fontFamily: THAI_FONT, fontSize: "12px", color: blocked ? "#9a958b" : GAME_THEME.muted,
        wordWrap: { width: 365 }, maxLines: 2
      }));
      if (!blocked) {
        const hit = this.add.zone(385, y, 510, 92).setOrigin(0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => {
          activatePotion(item.id);
          this.updatePotionHud();
          this.togglePotionPicker(false);
        });
        objects.push(hit);
      }
    });

    if (choices.length === 0) {
      objects.push(this.add.text(640, 375, "ยังไม่มียาช่วยตกปลา\nซื้อได้จากร้านลุงมนัสหรือรับจากรางวัลเลเวล", {
        fontFamily: THAI_FONT, fontSize: "19px", color: "#8a7867", align: "center", lineSpacing: 8
      }).setOrigin(.5));
    }
    this.potionPicker = this.add.container(0, 0, objects).setDepth(40);
  }

  private updatePotionHud(): void {
    if (!this.potionBack) return;
    const active = readActivePotion();
    const editable = this.state === "ready" && !this.resultPanel?.visible;
    this.potionBack
      .setFillStyle(editable ? GAME_THEME.cream : 0xb6c3bf, editable ? .96 : .72)
      .setStrokeStyle(3, active.item ? GAME_THEME.orange : 0x7eb5a6, .98);
    this.potionNameText.setText(active.item?.icon ?? "🧪");
    this.potionHintText.setText(active.item ? `${active.usesRemaining} รอบ` : "ไม่มี");
    this.potionNameText.setAlpha(editable ? 1 : .72);
    this.potionHintText.setAlpha(editable ? 1 : .72);
  }

  private actionDown(): void {
    if (this.dexPanel.visible) return;
    if (this.baitPicker) return;
    if (this.potionPicker) return;
    if (this.state === "caught" && this.resultPanel.visible) return;
    if (this.state === "caught" || this.state === "escaped") this.resetBattle();
    if (this.state === "hooking") {
      this.commitHook();
      return;
    }
    if (this.state === "ready") {
      this.state = "casting";
      this.updateBaitHud();
      this.castPower = 0;
      this.castDirection = 1;
      this.statusText.setText("เล็งจังหวะเหวี่ยง");
      this.hintText.setText("เหลือง: ของดีมาก • เขียว: ของดี • ดำ: ธรรมดาหรือขยะ");
      this.reelTitle.setText("ปล่อยเพื่อเหวี่ยง");
      this.reelSubtitle.setText(`10–${this.maxCastDistance} เมตร`);
    } else if (this.state === "fighting") this.reeling = true;
  }

  private actionUp(): void {
    if (this.state === "casting") this.commitCast();
    this.reeling = false;
  }

  private commitCast(): void {
    this.castReleasedAt = this.time.now;
    this.roundPotionId = readActivePotion().item?.id;
    consumeActivePotionRound();
    this.updatePotionHud();
    const baitUse = consumeSelectedBait();
    this.roundBaitId = baitUse.baitId ?? "none";
    this.selectedBaitId = baitUse.selectedBaitId;
    this.updateBaitHud();
    this.castDistance = 10 + this.castPower * (this.maxCastDistance - 10);
    this.fishDistance = this.castDistance;
    const targetOffset = Math.abs(this.castPower - this.castTarget);
    const focusActive = this.roundPotionId === "focus-tonic";
    const excellentWindow = focusActive ? .105 : .065;
    const goodWindow = focusActive ? .27 : .19;
    this.castGrade = targetOffset <= excellentWindow ? "excellent" : targetOffset <= goodWindow ? "good" : "poor";
    this.hookedTrash = Math.random() < getTrashHookChance(
      this.castGrade, this.roundBaitId, this.worldState.weather
    );
    if (this.hookedTrash) this.caughtTrashName = Phaser.Utils.Array.GetRandom(TRASH_LOOT_BY_BIOME[this.biome]);
    const biteWaitMs = getBiteWaitMs(this.roundBaitId, this.worldState.weather, this.worldState.minutes);
    this.selectFishProfile();
    this.worldState = advanceWorldTime(10);
    this.environmentText.setText(formatFishingEnvironment(this.worldState, this.biome));
    this.refreshWeatherVisuals();
    this.state = "waiting";
    const gradeText = this.castGrade === "excellent" ? "ยอดเยี่ยม!" : this.castGrade === "good" ? "จังหวะดี!" : "พลาดโซนสี";
    this.statusText.setText(`${gradeText}  ${this.castDistance.toFixed(1)} เมตร`);
    this.hintText.setText("กำลังรอสิ่งที่ติดเบ็ด...");
    this.reelTitle.setText("รอเบ็ด");
    this.reelSubtitle.setText("...");
    this.castGauge.setVisible(false);
    this.biteTimer = this.time.delayedCall(biteWaitMs, () => {
      if (this.state !== "waiting") return;
      this.beginHookWindow();
    });
  }

  private beginHookWindow(): void {
    this.state = "hooking";
    this.hookDeadline = this.time.now + 1900;
    this.statusText.setText("ปลากินเหยื่อ!");
    this.hintText.setText("ทุ่นจมแล้ว — แตะฮุกให้ทันก่อนหลุด");
    this.reelTitle.setText("ฮุก!");
    this.reelSubtitle.setText("แตะให้ทัน");
    this.cameras.main.shake(130, .004);
    this.hookTimer = this.time.delayedCall(1900, () => {
      if (this.state !== "hooking") return;
      this.finishBattle(false, this.hookedTrash ? "ของที่ติดเบ็ดหลุดไป!" : "ฮุกไม่ทัน ปลาหลุด!");
    });
  }

  private commitHook(): void {
    if (this.state !== "hooking") return;
    this.hookTimer?.remove(false);
    this.hookTimer = undefined;
    this.cameras.main.shake(100, .003);
    if (this.hookedTrash) {
      this.state = "caught";
      this.statusText.setText(`เกี่ยวได้${this.caughtTrashName}!`);
      this.hintText.setText("ขยะนำไปแลกคะแนนอนุรักษ์ได้ • แตะเพื่อลองอีกครั้ง");
      this.reelTitle.setText("ลองอีกครั้ง");
      this.reelSubtitle.setText("แตะเพื่อเริ่ม");
      this.showTrashResult();
      return;
    }
    this.state = "fighting";
    this.fishHud.setVisible(!this.isLegendary);
    this.fish.setVisible(false);
    this.statusText.setText("ฮุกติด! มีบางอย่างกินเหยื่อ");
    this.fishNameText.setText("แรงตึงสาย 30%");
    this.hintText.setText(this.isLegendary ? "" : "กดหมุนรอกเมื่อเกจยังไม่สูงเกินไป");
    this.reelTitle.setText("หมุนรอก");
    this.reelSubtitle.setText("กดค้าง");
    this.startFishPhase("burst", Phaser.Math.FloatBetween(...this.fishProfile.burstRange));
  }

  private clearFishingTimers(): void {
    this.biteTimer?.remove(false);
    this.hookTimer?.remove(false);
    this.biteTimer = undefined;
    this.hookTimer = undefined;
  }

  private resetBattle(): void {
    this.clearFishingTimers();
    this.toggleBaitPicker(false);
    this.togglePotionPicker(false);
    this.state = "ready";
    this.fishStamina = 100;
    this.fishMaxStamina = 100;
    this.fishProfile = FISH_PROFILES[0];
    this.isLegendary = false;
    this.tension = 30;
    this.fishDistance = 28;
    this.castPower = 0;
    this.castDistance = 10;
    this.castTarget = Phaser.Math.FloatBetween(.24, .76);
    this.castReleasedAt = -1000;
    this.hookDeadline = 0;
    this.castGrade = "poor";
    this.hookedTrash = false;
    this.caughtTrashName = "กระป๋องเก่า";
    this.catchName = "ปลากะพง";
    this.fishDirection = -1;
    this.fishBurst = .65;
    this.fishPhase = "burst";
    this.fishPhaseTimer = .65;
    this.battleTime = 0;
    this.nextFightShakeAt = 0;
    this.reeling = false;
    this.pendingXp = 0;
    this.roundPotionId = undefined;
    this.roundBaitId = undefined;
    this.fish.setPosition(545, 420).setVisible(false).setAlpha(1);
    this.fishHud.setVisible(false);
    this.fishNameText.setText("แรงตึงสาย 30%");
    this.distanceBadgeBack.setVisible(false);
    this.distanceText.setVisible(false);
    this.waterContact.clear();
    this.phaseText.setVisible(false);
    this.phaseBack.setVisible(false);
    this.resultPanel.setVisible(false);
    this.castGauge.setVisible(true);
    this.reelTitle.setText("เหวี่ยงเบ็ด");
    this.reelSubtitle.setText("กดค้าง");
    this.statusText.setText("กดค้างเพื่อชาร์จแรงเหวี่ยง");
    this.hintText.setText("ปล่อยนิ้วเมื่อได้ระยะที่ต้องการ");
    this.updateBaitHud();
    this.updatePotionHud();
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, .04);
    if (this.state === "casting") {
      this.castPower += this.castDirection * dt * .82;
      if (this.castPower >= 1) { this.castPower = 1; this.castDirection = -1; }
      if (this.castPower <= 0) { this.castPower = 0; this.castDirection = 1; }
      this.castDistance = 10 + this.castPower * (this.maxCastDistance - 10);
      this.hintText.setText(`ระยะประมาณ ${this.castDistance.toFixed(1)} ม. • ปล่อยเข็มในแถบเหลืองหรือเขียว`);
    }
    if (this.state === "hooking") {
      const seconds = Math.max(0, (this.hookDeadline - this.time.now) / 1000);
      this.reelSubtitle.setText(`เหลือ ${seconds.toFixed(1)} วิ`);
    }
    if (this.state === "fighting") this.updateBattle(dt);
    this.drawRodAndLine();
    this.drawWaterContact();
    this.drawCastGauge();
    this.drawLineGauge();
    this.fishNameText.setText(`แรงตึงสาย ${Math.round(Phaser.Math.Clamp(this.tension, 0, 100))}%`);
    this.distanceText.setText(`${Math.round(this.fishDistance)} ม.`);
    const badgeX = Phaser.Math.Clamp(this.fish.x, 110, 1080);
    const badgeY = this.fish.y - 69;
    this.distanceBadgeBack.setPosition(badgeX, badgeY);
    this.distanceText.setPosition(badgeX, badgeY);
  }

  private updateBattle(dt: number): void {
    this.battleTime += dt;
    this.updateFishPhase(dt);

    const countering = this.rodInput === -this.fishDirection;
    const pullingWrongWay = this.rodInput === this.fishDirection;
    const coatingMultiplier = this.roundPotionId === "line-coating" ? .8 : 1;
    const tensionMultiplier = coatingMultiplier * this.lineResistance;
    const burstForce = (this.fishBurst > 0 ? 8 : 2) * this.fishProfile.tensionFactor * tensionMultiplier;
    this.tension += burstForce * dt;
    if (countering) { this.tension -= 18 * this.rodControl * dt; this.fishStamina -= 6 * this.reelPower * dt; }
    if (pullingWrongWay) this.tension += 7 * this.fishProfile.tensionFactor * tensionMultiplier * dt;
    if (this.reeling) {
      this.fishStamina -= (this.fishBurst > 0 ? 3.5 : 10) * this.reelPower * dt;
      this.tension += (this.fishBurst > 0 ? 13 : 6) * this.fishProfile.tensionFactor * tensionMultiplier * dt;
      this.fishDistance -= (this.fishBurst > 0 ? 1.3 : 3.8) * this.reelPower * dt;
    } else this.tension -= 10 * dt;
    if (this.fishBurst > 0 && this.fishStamina > 1) {
      this.fishDistance += (countering ? .45 : 1.25) * this.fishProfile.runFactor * dt;
    }
    if (this.tension < 8) this.tension += 2 * dt;
    this.tension = Phaser.Math.Clamp(this.tension, 0, 105);
    this.fishStamina = Phaser.Math.Clamp(this.fishStamina, 0, this.fishMaxStamina);
    this.fishDistance = Phaser.Math.Clamp(this.fishDistance, 0, this.maxCastDistance + 10);

    const shakingFromFight = this.fishPhase === "burst" && this.fishBurst > 0;
    const dangerTension = this.tension >= 82;
    if ((shakingFromFight || dangerTension) && this.time.now >= this.nextFightShakeAt) {
      this.cameras.main.shake(dangerTension ? 150 : 90, dangerTension ? .0042 : .0017);
      this.nextFightShakeAt = this.time.now + (dangerTension ? 260 : Phaser.Math.Between(620, 940));
    }

    const swimSpeed = (this.fishPhase === "burst" ? 18 + this.fishBurst * 9 : this.fishPhase === "rest" ? 3 : 0) * this.fishProfile.swimFactor;
    const swimX = this.fishDirection * swimSpeed * dt;
    this.fish.x = Phaser.Math.Clamp(this.fish.x + swimX, 185, 1095);
    this.fish.y = 420 + Math.sin(this.battleTime * 4) * 12;
    this.fish.scaleX = this.fishDirection;
    if (this.fishPhase === "burst" && !this.isLegendary) {
      this.hintText.setText(this.fishDirection < 0 ? "มันหนีซ้าย — ดึงคันไปทางขวา" : "มันหนีขวา — ดึงคันไปทางซ้าย");
    }

    if (this.tension >= 100) this.finishBattle(false, "สายขาด!");
    else if (this.tension <= 1) this.finishBattle(false, "สายหย่อน หลุดเบ็ด!");
    else if (this.fishDistance >= this.maxCastDistance + 5) this.finishBattle(false, "มันพาสายออกจนสุด!");
    else if (this.fishStamina <= 0 && this.fishDistance <= 2.5) this.finishBattle(true, `จับ${this.catchName}ได้แล้ว!`);
    else if (this.fishStamina <= 0 && !this.isLegendary) this.hintText.setText("แรงดิ้นหมดแล้ว — หมุนรอกดึงเข้ามาใกล้ฝั่ง");
  }

  private startFishPhase(phase: FishPhase, duration: number): void {
    this.fishPhase = phase;
    this.fishPhaseTimer = duration;
    this.fishBurst = phase === "burst" ? duration : 0;
    this.phaseText.setVisible(!this.isLegendary);
    this.phaseBack.setVisible(false).clear();
    if (phase === "burst") {
      const arrow = this.fishDirection < 0 ? "←←" : "→→";
      this.phaseText.setText(`${arrow} กำลังพุ่ง • ปล่อยรอก`).setColor("#ffe0a3");
    } else if (phase === "rest") {
      this.phaseText.setText("แรงดิ้นลดลง — เก็บสายได้").setColor("#eaffd9");
      if (!this.isLegendary) this.hintText.setText("จังหวะนี้หมุนรอกเพื่อลดระยะ");
    } else {
      this.phaseText.setText("เปลี่ยนทิศ — เตรียมดึงสวน").setColor("#fff1b0");
      if (!this.isLegendary) this.hintText.setText("รอดูทิศทางใหม่ก่อนหมุนรอก");
    }
  }

  private updateFishPhase(dt: number): void {
    if (this.fishStamina <= 1) {
      if (this.fishPhase !== "rest") this.startFishPhase("rest", 999);
      return;
    }
    this.fishPhaseTimer -= dt;
    this.fishBurst = this.fishPhase === "burst" ? Math.max(this.fishPhaseTimer, .05) : 0;
    if (this.fishPhaseTimer > 0) return;
    if (this.fishPhase === "burst") {
      this.startFishPhase("rest", Phaser.Math.FloatBetween(...this.fishProfile.restRange));
    } else if (this.fishPhase === "rest") {
      if (Math.random() < this.fishProfile.turnChance) this.startFishPhase("turn", .5);
      else this.startFishPhase("burst", Phaser.Math.FloatBetween(...this.fishProfile.burstRange));
    } else {
      this.fishDirection *= -1;
      this.startFishPhase("burst", Phaser.Math.FloatBetween(...this.fishProfile.burstRange));
    }
  }

  private selectFishProfile(): void {
    const result = rollCatch(
      this.rodIndex, this.biome, this.castGrade, this.roundBaitId, this.luckBonus,
      this.worldState.minutes, this.worldState.weather
    );
    this.isLegendary = result.isLegendary;
    if (this.isLegendary) {
      this.fishProfile = LEGENDARY_FISH;
      this.fishMaxStamina = this.fishProfile.stamina;
      this.fishStamina = this.fishMaxStamina;
      this.catchName = `${this.fishProfile.name} ระดับตำนาน`;
      return;
    }
    this.fishProfile = result.fish;
    this.fishMaxStamina = this.fishProfile.stamina;
    this.fishStamina = this.fishMaxStamina;
    const quality = this.castGrade === "excellent" ? "ไซซ์พิเศษ" : this.castGrade === "good" ? "ขนาดดี" : "ทั่วไป";
    this.catchName = `${this.fishProfile.name} ${quality}`;
  }

  private cycleRod(): void {
    if (this.state !== "ready" && this.state !== "caught" && this.state !== "escaped") return;
    const save = readSaveData();
    for (let offset = 1; offset <= RODS.length; offset += 1) {
      const candidate = (this.rodIndex + offset) % RODS.length;
      if (isRodUnlocked(candidate, save)) {
        this.rodIndex = candidate;
        break;
      }
    }
    this.updateRodLabel();
    this.saveProgress();
  }

  private updateRodLabel(): void {
    const rod = RODS[this.rodIndex];
    this.rodText.setText(`🎣 ${rod.name}  Lv.${rod.level}`);
    if (this.rodSprite) this.rodSprite.setTexture(ROD_FIRST_PERSON_ART[rod.id].textureKey);
  }

  private finishBattle(caught: boolean, message: string): void {
    this.clearFishingTimers();
    this.state = caught ? "caught" : "escaped";
    this.reeling = false;
    this.fish.setVisible(false);
    this.fishHud.setVisible(false);
    this.distanceBadgeBack.setVisible(false);
    this.distanceText.setVisible(false);
    this.statusText.setText(message);
    this.hintText.setText("แตะปุ่มหมุนรอกเพื่อทดลองอีกครั้ง");
    this.reelTitle.setText("ลองอีกครั้ง");
    this.reelSubtitle.setText("แตะเพื่อเริ่ม");
    this.phaseText.setVisible(false);
    if (caught) {
      this.time.delayedCall(620, () => this.showCatchResult());
    }
  }

  private showCatchResult(): void {
    const info = SPECIES_INFO[this.fishProfile.name];
    const qualityMultiplier = this.castGrade === "excellent" ? 1 : this.castGrade === "good" ? .82 : .68;
    const weight = Phaser.Math.FloatBetween(info.weight[0], info.weight[1] * qualityMultiplier);
    const length = Phaser.Math.FloatBetween(info.length[0], info.length[1] * qualityMultiplier);
    const previousRecord = this.records.get(this.fishProfile.name) ?? 0;
    const isRecord = weight > previousRecord;
    if (isRecord) this.records.set(this.fishProfile.name, weight);
    const rarity = this.isLegendary
      ? "👑 LEGENDARY"
      : this.castGrade === "excellent"
        ? "⭐ RARE"
        : this.castGrade === "good"
          ? "ดี"
          : "ทั่วไป";
    const creatureIcon = this.fishProfile.kind === "crustacean"
      ? (this.fishProfile.name === "ปูม้า" ? "🦀" : "🦐")
      : this.fishProfile.kind === "mollusk" ? "🐚" : "🐟";
    this.pendingXp = this.isLegendary ? 60 : this.castGrade === "excellent" ? 25 : this.castGrade === "good" ? 16 : 10;
    const rarityMultiplier = this.isLegendary ? 8 : this.castGrade === "excellent" ? 3 : this.castGrade === "good" ? 1.6 : 1;
    const saleValue = Math.max(1, Math.round(weight * 25 * rarityMultiplier));
    const releasePoints = this.isLegendary ? 5 : this.castGrade === "excellent" ? 3 : 1;
    this.pendingSex = rollAquaticSex();
    const sexLabel = this.pendingSex === "male" ? "♂ ตัวผู้" : "♀ ตัวเมีย";
    this.resultTitle.setText(this.fishProfile.name);
    this.resultRarity.setText(`${creatureIcon} ${rarity}${isRecord ? "  •  สถิติใหม่!" : ""}`);
    this.resultDetails.setText(`⚖ ${weight.toFixed(2)} กก.   ↔ ${Math.round(length)} ซม.   •   ${sexLabel}   •   EXP +${this.pendingXp}`);
    this.resultFact.setText(`เรื่องน่ารู้: ${info.fact}`);
    this.discoveredSpecies.add(this.fishProfile.name);
    this.pendingWeight = weight;
    this.setResultActions(false);
    this.keepButtonText.setText("เก็บไว้");
    this.sellButtonText.setText(`ขาย +${saleValue}`);
    this.releaseButtonText.setText(`คืนแหล่งน้ำ ♻ +${releasePoints}`);
    this.updateResultFishArt();
    this.resultFishPreview.setVisible(true);
    this.resultPanel.setVisible(true);
  }

  private showTrashResult(): void {
    this.pendingXp = 6;
    this.resultTitle.setText(this.caughtTrashName);
    this.resultRarity.setText("♻ วัสดุเก็บกู้จากแหล่งน้ำ");
    this.resultDetails.setText("คะแนนอนุรักษ์ +1   •   EXP +6");
    this.resultFact.setText("นำไปคัดแยกและสร้างของใหม่ได้ที่โต๊ะช่างชุมชน");
    this.resultFishPreview.setVisible(false);
    this.setResultActions(true);
    this.resultPanel.setVisible(true);
  }

  private setResultActions(isTrash: boolean): void {
    this.keepButton.setVisible(true);
    this.keepButtonBack.setVisible(true);
    this.keepButtonText.setVisible(true).setText(isTrash ? "เก็บขยะ +1" : "เก็บไว้");
    this.sellButton.setVisible(!isTrash);
    this.sellButtonBack.setVisible(!isTrash);
    this.sellButtonText.setVisible(!isTrash);
    this.releaseButton.setVisible(!isTrash);
    this.releaseButtonBack.setVisible(!isTrash);
    this.releaseButtonText.setVisible(!isTrash);
  }

  private resolveCatch(action: "keep" | "sell" | "release"): void {
    if (!this.resultPanel.visible) return;
    const previousLevel = getAnglerLevel(this.anglerXp, this.collectionCount);
    const rarityMultiplier = this.isLegendary ? 8 : this.castGrade === "excellent" ? 3 : this.castGrade === "good" ? 1.6 : 1;
    const saleValue = Math.max(1, Math.round(this.pendingWeight * 25 * rarityMultiplier));
    if (this.hookedTrash) {
      this.conservationPoints += 1;
      addTrashToInventory(this.caughtTrashName);
    } else {
      this.collectionCount += 1;
      // จดลงสมุดภาคสนามทุกครั้งที่จับได้ ไม่ว่าจะเก็บ ขาย หรือปล่อย เพราะถือว่าผู้เล่นได้เห็นแล้ว
      recordCatch(this.fishProfile.name, {
        biome: this.biome,
        period: getTimePeriod(this.worldState.minutes),
        weather: this.worldState.weather
      });
      if (action === "keep") {
        addFishToInventory(this.fishProfile.name, this.pendingWeight, saleValue, this.pendingSex);
      } else if (action === "sell") {
        this.coins += saleValue;
      } else {
        this.conservationPoints += this.isLegendary ? 5 : this.castGrade === "excellent" ? 3 : 1;
      }
    }
    this.anglerXp += this.pendingXp;
    this.updateResourceLabel();
    this.saveProgress();
    recordStarterQuestCatch(this.hookedTrash ? "trash" : "fish");
    recordDailyQuestProgress(this.hookedTrash ? "trash_collected" : "fish_caught");
    const currentLevel = getAnglerLevel(this.anglerXp, this.collectionCount);
    this.resetBattle();
    if (currentLevel > previousLevel) {
      this.statusText.setText(`เลเวลนักตกปลาเพิ่มเป็น Lv.${currentLevel}!`);
      this.hintText.setText("มีรางวัลเลเวลใหม่รอรับในหน้าตัวละคร");
      this.cameras.main.flash(320, 255, 223, 135, false);
    }
  }

  private updateResourceLabel(): void {
    this.resourceText.setText(`🪙 ${this.coins}   🐟 ${this.collectionCount}   ♻ ${this.conservationPoints}`);
  }

  private toggleDex(open: boolean): void {
    if (open && this.state !== "ready") return;
    if (open) {
      const entries = Object.keys(SPECIES_INFO).map((name, index) => {
        const discovered = this.discoveredSpecies.has(name);
        const displayName = discovered ? name : index === Object.keys(SPECIES_INFO).length - 1 ? "??? ปลาตำนาน" : "???";
        const record = discovered ? this.records.get(name) : undefined;
        return `${discovered ? "✓" : "○"}  ${displayName}${record ? `    สถิติ ${record.toFixed(2)} กก.` : ""}`;
      });
      this.dexListText.setText(entries.join("\n\n"));
    }
    this.dexPanel.setVisible(open);
  }

  private loadProgress(): void {
    const save = readSaveData();
    this.coins = Math.max(0, save.coins ?? 0);
    this.conservationPoints = Math.max(0, save.conservationPoints ?? 0);
    this.collectionCount = Math.max(0, save.collectionCount ?? 0);
    this.anglerXp = Math.max(0, save.anglerXp ?? 0);
    const equipment = getFishingEquipment(save);
    this.rodIndex = equipment.rodIndex;
    this.lineResistance = equipment.lineResistance;
    this.reelPower = equipment.reelPower;
    this.rodControl = equipment.control;
    this.maxCastDistance = equipment.maxCastDistance;
    this.luckBonus = equipment.luckBonus;
    this.worldState = readWorldState(save);
    this.selectedBaitId = readSelectedBait(save).item?.id ?? "none";
    this.records = new Map(save.records ?? []);
    this.discoveredSpecies = new Set(save.discoveredSpecies ?? []);
  }

  private saveProgress(): void {
    const save = {
      coins: this.coins,
      conservationPoints: this.conservationPoints,
      collectionCount: this.collectionCount,
      anglerXp: this.anglerXp,
      rodIndex: this.rodIndex,
      selectedBaitId: this.selectedBaitId,
      records: [...this.records.entries()],
      discoveredSpecies: [...this.discoveredSpecies]
    };
    writeSaveData(save);
  }

  private updateResultFishArt(): void {
    const isFish = this.fishProfile.kind === "fish";
    const fishArt = getFishArt(this.fishProfile.name);
    const useSprite = Boolean(fishArt && this.textures.exists(fishArt.textureKey));
    this.resultCreatureArt.clear();
    [this.resultFishBody, this.resultFishTail, this.resultFishFin, this.resultFishEye, this.resultFishPupil]
      .forEach(part => part.setVisible(isFish && !useSprite));
    this.resultFishBeak.setVisible(isFish && !useSprite && this.fishProfile === LEGENDARY_FISH);
    this.resultFishSprite.setVisible(useSprite);

    if (useSprite && fishArt) {
      const width = fishArt.resultWidth;
      this.resultFishSprite.setTexture(fishArt.textureKey)
        .setDisplaySize(width, width * fishArt.aspectRatio);
      this.resultFishPreview.setScale(1);
      return;
    }

    if (this.fishProfile.kind === "crustacean" && this.fishProfile.name === "ปูม้า") {
      this.resultFishSprite.setVisible(false);
      const g = this.resultCreatureArt;
      g.lineStyle(7, 0x407f9a, 1);
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * 54, -8).lineTo(side * 104, -42).lineTo(side * 130, -27);
        g.moveTo(side * 61, 3).lineTo(side * 117, 33);
        g.moveTo(side * 48, 20).lineTo(side * 92, 62);
        g.strokePath();
      }
      g.fillStyle(0x4e91b1).fillEllipse(0, 2, 158, 92);
      g.lineStyle(5, 0x315b67, 1).strokeEllipse(0, 2, 158, 92);
      g.fillStyle(0x315b67).fillCircle(-32, -49, 10).fillCircle(32, -49, 10);
      g.fillStyle(0xffffff).fillCircle(-32, -49, 4).fillCircle(32, -49, 4);
      this.resultFishPreview.setScale(.92);
      return;
    }

    if (this.fishProfile.kind === "crustacean") {
      this.resultFishSprite.setVisible(false);
      const g = this.resultCreatureArt;
      g.lineStyle(4, 0x3d7580, 1);
      g.beginPath().moveTo(55, -22).lineTo(126, -65).moveTo(58, -11).lineTo(138, -37).strokePath();
      g.fillStyle(0x62aeb5);
      for (let i = 0; i < 6; i += 1) g.fillEllipse(36 - i * 26, i * 5, 64 - i * 5, 53);
      g.fillTriangle(-114, 22, -165, -10, -153, 54);
      g.lineStyle(4, 0x315b67, 1).strokeCircle(51, -15, 8);
      g.fillStyle(0x263e48).fillCircle(52, -15, 4);
      this.resultFishPreview.setScale(.82);
      return;
    }

    if (this.fishProfile.kind === "mollusk") {
      this.resultFishSprite.setVisible(false);
      const g = this.resultCreatureArt;
      const shellColor = this.fishProfile.name === "หอยแครง" ? 0xb76d4c : 0xcba675;
      g.fillStyle(shellColor).fillEllipse(0, 6, 190, 138);
      g.lineStyle(5, 0x765443, .9).strokeEllipse(0, 6, 190, 138);
      for (const offset of [-68, -34, 0, 34, 68]) {
        g.beginPath().moveTo(0, -61).lineTo(offset, 68).strokePath();
      }
      this.resultFishPreview.setScale(.8);
      return;
    }

    const style = this.fishProfile.name === "ปลากระบอก"
      ? { body: 0xa9c9bc, fin: 0x70968c, scaleX: .92, scaleY: .78 }
      : this.fishProfile.name === "ปลากะพงขาว"
        ? { body: 0xc7d9d2, fin: 0x739c96, scaleX: 1.06, scaleY: 1 }
        : this.fishProfile.name === "ปลาทู"
          ? { body: 0x71a8b7, fin: 0x315f73, scaleX: .82, scaleY: .68 }
          : { body: 0x4c84ad, fin: 0x244e72, scaleX: 1.15, scaleY: .9 };
    this.resultFishBody.setFillStyle(style.body);
    this.resultFishTail.setFillStyle(style.fin);
    this.resultFishFin.setFillStyle(style.fin);
    this.resultFishPreview.setScale(style.scaleX, style.scaleY);
  }

  private drawRodAndLine(): void {
    const bend = (this.tension / 100) * 65;
    const inputLean = this.rodInput * 135;
    const castFlight = this.state === "waiting" || this.state === "hooking"
      ? Phaser.Math.Clamp((this.time.now - this.castReleasedAt) / 560, 0, 1)
      : 1;
    let castLean = 0;
    if (this.state === "casting") {
      castLean = -48 - this.castPower * 42;
    } else if (this.state === "waiting" && castFlight < 1) {
      if (castFlight < .58) {
        const swing = castFlight / .58;
        const eased = 1 - (1 - swing) * (1 - swing);
        castLean = Phaser.Math.Linear(-90, 48, eased);
      } else {
        const settle = (castFlight - .58) / .42;
        castLean = Phaser.Math.Linear(48, 0, Math.sin(settle * Math.PI / 2));
      }
    }
    const lean = inputLean + castLean;
    const tipX = 640 + lean - this.fishDirection * bend * .2;
    const tipY = 230 + bend;
    this.rod.clear();
    const baseX = 640;
    const baseY = 722;
    const rodLength = Phaser.Math.Distance.Between(baseX, baseY, tipX, tipY);
    const rodAngle = Phaser.Math.Angle.Between(baseX, baseY, tipX, tipY) + Math.PI / 2;
    const shakeStrength = this.state === "fighting" ? Math.max(0, this.tension - 62) * .075 : 0;
    const shake = Math.sin(this.time.now * .085) * shakeStrength;
    this.rodSprite
      .setPosition(baseX + shake, baseY)
      .setRotation(rodAngle)
      // มุมมองบุคคลที่หนึ่งใช้ perspective squeeze: ด้ามและรอกด้านหน้าใหญ่
      // ขณะที่ช่วงปลายทั้งคันยังอยู่ในเฟรมและต่อสายได้ตรงห่วงสุดท้าย
      .setDisplaySize(430, rodLength);
    this.line.clear();
    if (this.state === "waiting" || this.state === "hooking") {
      const bobberX = Phaser.Math.Linear(tipX, 640, castFlight);
      const biteDip = this.state === "hooking" ? 13 + Math.sin(this.time.now * .045) * 5 : 0;
      const bobberY = Phaser.Math.Linear(tipY + 18, 405, castFlight)
        - Math.sin(castFlight * Math.PI) * 145 + biteDip;
      this.line.lineStyle(2, 0xf7ffff, .9).beginPath().moveTo(tipX, tipY).lineTo(bobberX, bobberY).strokePath();
      this.line.fillStyle(0xf05e45, 1).fillCircle(bobberX, bobberY, 7);
      if (castFlight < 1) {
        this.line.lineStyle(2, 0xffffff, .55).strokeCircle(bobberX, bobberY, 11);
      }
    } else if (this.state === "fighting" || this.state === "caught" || this.state === "escaped") {
      this.line.lineStyle(2, 0xf7ffff, .9).beginPath().moveTo(tipX, tipY).lineTo(this.fish.x, this.fish.y).strokePath();
    }
  }

  private refreshWeatherVisuals(): void {
    const hour = Math.floor(this.worldState.minutes / 60);
    const periodKey = hour >= 5 && hour < 11 ? "morning" : hour < 17 ? "day" : hour < 20 ? "evening" : "night";
    const key = `${this.worldState.weather}:${periodKey}`;
    if (key === this.environmentVisualKey) return;
    if (this.weatherOverlay) {
      this.weatherOverlay.iterate((child: Phaser.GameObjects.GameObject) => this.tweens.killTweensOf(child));
      this.weatherOverlay.destroy(true);
    }
    this.environmentVisualKey = key;
    this.weatherOverlay = createWeatherOverlay(this, this.worldState, -3);
  }

  private drawWaterContact(): void {
    this.waterContact.clear();
    if (this.state !== "waiting" && this.state !== "hooking" && this.state !== "fighting") return;

    const surface = this.state === "waiting" || this.state === "hooking";
    const hooking = this.state === "hooking";
    const x = surface ? 640 : this.fish.x;
    const y = surface ? 405 : this.fish.y;
    const clock = this.time.now / 1000;
    const pulse = (Math.sin(clock * 3.4) + 1) * .5;
    const activity = hooking ? 1.2 : surface ? .3 : this.fishPhase === "burst" ? 1 : this.fishPhase === "turn" ? .72 : .45;

    [0, 1, 2].forEach((ring) => {
      const phase = (pulse + ring * .34) % 1;
      const width = 48 + phase * 105 * activity;
      const height = 13 + phase * 25 * activity;
      this.waterContact.lineStyle(2.6 - ring * .45, 0xe6fffb, (.58 - phase * .46) * activity);
      this.waterContact.strokeEllipse(x, y + 7, width, height);
    });

    if (surface) {
      const dip = hooking ? 9 + Math.sin(this.time.now * .045) * 4 : 0;
      this.waterContact.fillStyle(0xfff0d0, 1).fillCircle(x, y - 4 + dip, 5);
      this.waterContact.fillStyle(0xed6350, 1).fillRoundedRect(x - 3, y - 17 + dip, 6, 13, 3);
      if (hooking) {
        const splash = .8 + pulse * .35;
        this.waterContact.lineStyle(4, 0xe9fffb, .8).beginPath()
          .moveTo(x - 22, y + 2).lineTo(x - 34, y - 24 * splash)
          .moveTo(x + 20, y + 2).lineTo(x + 32, y - 30 * splash)
          .moveTo(x, y).lineTo(x + 3, y - 38 * splash).strokePath();
      }
      return;
    }

    const splash = Math.max(.35, activity) * (.65 + pulse * .35);
    this.waterContact.lineStyle(4, 0xe9fffb, .72 * splash).beginPath()
      .moveTo(x - 27, y).lineTo(x - 37, y - 25 * splash)
      .moveTo(x + 21, y).lineTo(x + 34, y - 34 * splash)
      .moveTo(x - 5, y - 2).lineTo(x + 2, y - 42 * splash).strokePath();
    this.waterContact.fillStyle(0xe9fffb, .78 * splash);
    this.waterContact.fillCircle(x - 43, y - 18 * splash, 3.5 * splash);
    this.waterContact.fillCircle(x + 43, y - 25 * splash, 4 * splash);
    this.waterContact.fillCircle(x + 7, y - 48 * splash, 3 * splash);
  }

  private drawLineGauge(): void {
    this.lineGauge.clear();
    const fighting = this.state === "fighting";
    this.distanceText.setVisible(fighting);
    this.distanceBadgeBack.setVisible(fighting);
    if (!fighting || this.isLegendary) {
      this.fishHud.setVisible(false);
      return;
    }

    this.fishHud.setVisible(true);
    const tensionRatio = Phaser.Math.Clamp(this.tension / 100, 0, 1);
    const burstPulse = this.fishPhase === "burst" && Math.sin(this.time.now * .018) > .18;
    const shakeStrength = tensionRatio >= .82 ? 7 : burstPulse ? 2.5 : 0;
    const shakeX = Math.sin(this.time.now * .095) * shakeStrength;
    const shakeY = Math.cos(this.time.now * .12) * shakeStrength * .5;
    this.fishHud.setPosition(shakeX, shakeY);

    const x = 1200 + shakeX;
    const top = 205 + shakeY;
    const bottom = 493 + shakeY;
    const trackTop = top + 25;
    const trackBottom = bottom - 30;
    const trackHeight = trackBottom - trackTop;
    const gaugeColor = tensionRatio >= .82 ? 0xf05a4f : tensionRatio >= .58 ? 0xf2a33b : 0x62c96b;

    this.lineGauge.fillStyle(0x102d37, .62).fillRoundedRect(x - 43, top - 8, 86, bottom - top + 24, 38);
    this.lineGauge.lineStyle(tensionRatio >= .82 ? 7 : 5, tensionRatio >= .82 ? gaugeColor : 0xf5dfae, .98)
      .strokeRoundedRect(x - 38, top - 3, 76, bottom - top + 14, 33);
    this.lineGauge.lineStyle(2, 0x76959b, .9).strokeRoundedRect(x - 31, top + 4, 62, bottom - top, 27);
    this.lineGauge.fillStyle(0x112f38, .96).fillRoundedRect(x - 19, trackTop, 38, trackHeight, 15);

    const segmentCount = 12;
    const litSegments = Math.ceil(tensionRatio * segmentCount);
    const segmentGap = 4;
    const segmentHeight = (trackHeight - segmentGap * (segmentCount - 1)) / segmentCount;
    for (let index = 0; index < segmentCount; index += 1) {
      const segmentY = trackBottom - (index + 1) * segmentHeight - index * segmentGap;
      const lit = index < litSegments;
      this.lineGauge.fillStyle(lit ? gaugeColor : 0x244953, lit ? 1 : .5)
        .fillRoundedRect(x - 14, segmentY, 28, segmentHeight, 6);
    }

    const markerY = trackBottom - trackHeight * tensionRatio;
    this.lineGauge.lineStyle(8, gaugeColor, 1).beginPath()
      .moveTo(x - 34, markerY).lineTo(x + 34, markerY).strokePath();
    this.lineGauge.lineStyle(3, 0xffffff, .9).beginPath()
      .moveTo(x - 29, markerY).lineTo(x + 29, markerY).strokePath();
    this.lineGauge.fillStyle(gaugeColor, 1).fillTriangle(x - 38, markerY, x - 53, markerY - 11, x - 53, markerY + 11);

    this.lineGauge.fillStyle(0xe6b857, 1).fillCircle(x, bottom + 10, 18);
    this.lineGauge.lineStyle(4, 0xffedb7, 1).strokeCircle(x, bottom + 10, 18);
    this.lineGauge.lineStyle(4, 0x614521, 1).beginPath()
      .moveTo(x, bottom + 1).lineTo(x, bottom + 12).strokePath();
    this.lineGauge.beginPath().arc(x, bottom - 2, 8, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(225), false).strokePath();
  }

  private drawCastGauge(): void {
    this.castGauge.clear();
    if (this.state !== "ready" && this.state !== "casting") return;
    const cx = 640;
    const cy = 610;
    const radius = 106;
    const start = Phaser.Math.DegToRad(204);
    const end = Phaser.Math.DegToRad(336);
    const focusActive = readActivePotion().item?.id === "focus-tonic";
    const goodWindow = focusActive ? .27 : .19;
    const excellentWindow = focusActive ? .105 : .065;
    const greenFrom = Phaser.Math.Clamp(this.castTarget - goodWindow, 0, 1);
    const greenTo = Phaser.Math.Clamp(this.castTarget + goodWindow, 0, 1);
    const yellowFrom = Phaser.Math.Clamp(this.castTarget - excellentWindow, 0, 1);
    const yellowTo = Phaser.Math.Clamp(this.castTarget + excellentWindow, 0, 1);
    this.castGauge.lineStyle(46, 0x0b2028, .45).beginPath().arc(cx, cy + 5, radius, start, end, false).strokePath();
    this.castGauge.lineStyle(40, 0xe8dfc5, 1).beginPath().arc(cx, cy, radius, start, end, false).strokePath();
    this.castGauge.lineStyle(34, 0x557078, 1).beginPath().arc(cx, cy, radius, start, end, false).strokePath();
    this.castGauge.lineStyle(26, 0x142f38, 1).beginPath().arc(cx, cy, radius, start, end, false).strokePath();
    this.castGauge.lineStyle(4, 0xa9c7c5, .7).beginPath().arc(cx, cy, radius + 13, start, end, false).strokePath();

    for (let tick = 0; tick <= 10; tick += 1) {
      const tickAngle = start + (end - start) * (tick / 10);
      const tickInner = radius - 20;
      const tickOuter = radius - 12;
      this.castGauge.lineStyle(2, 0xdcebe5, .55).beginPath()
        .moveTo(cx + Math.cos(tickAngle) * tickInner, cy + Math.sin(tickAngle) * tickInner)
        .lineTo(cx + Math.cos(tickAngle) * tickOuter, cy + Math.sin(tickAngle) * tickOuter).strokePath();
    }

    this.castGauge.lineStyle(20, 0x5cc96a, 1).beginPath()
      .arc(cx, cy, radius, start + (end - start) * greenFrom, start + (end - start) * greenTo, false).strokePath();
    this.castGauge.lineStyle(20, 0xffd454, 1).beginPath()
      .arc(cx, cy, radius, start + (end - start) * yellowFrom, start + (end - start) * yellowTo, false).strokePath();
    const angle = start + (end - start) * this.castPower;
    const inner = radius - 29;
    const outer = radius + 28;
    this.castGauge.lineStyle(10, 0x102b34, .65).beginPath()
      .moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
      .lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer).strokePath();
    this.castGauge.lineStyle(6, 0xfff6d9, 1).beginPath()
      .moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
      .lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer).strokePath();
    this.castGauge.fillStyle(0xf2b044, 1).fillCircle(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      7
    );
  }
}

adoptPlayerSaveForDevTest();
seedPrototypeTestData();
migrateSpeciesLog();

await Promise.all([
  document.fonts.load('400 16px "Mitr"'),
  document.fonts.load('500 16px "Mitr"'),
  document.fonts.load('600 16px "Mitr"')
]);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#8bdff3",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  dom: { createContainer: true },
  scene: [CharacterSetupScene, WorldScene, RiverScene, FishingScene, PlayerMenuScene, WardrobeScene, AquariumScene, BreedingScene, BattleScene, DailyQuestScene, MarketScene, LevelRewardScene, ShopScene, QuestScene, CraftScene, HubScene, DexScene, EquipmentScene]
});
