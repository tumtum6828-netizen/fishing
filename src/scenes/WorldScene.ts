import Phaser from "phaser";
import { COAST_NAVIGATION, moveOnNavigationMap } from "../data/worldNavigation";
import { readSaveData } from "../services/save";
import { getStarterQuestSummary, readStarterQuest } from "../services/quests";
import { createDailyQuestButton, createEnergyPanel, createFishingActionButton, createHudDiscButton, createWorldMenu, createWorldTopBar, preloadWorldHudAssets, THAI_FONT } from "../ui/worldHud";
import { createWaterEffects } from "../ui/waterEffects";
import { createMapBaitSelector } from "../ui/baitSelector";
import { advanceWorldTime, formatWorldClock, getTimePeriod, readWorldState } from "../services/worldTime";
import { createWeatherOverlay } from "../ui/weatherEffects";
import { getSelectedCharacter } from "../services/character";
import { readEquippedFashion } from "../services/fashion";
import { createAvatarLayerSet, preloadAvatarAssets, type AvatarLayerSet } from "../ui/avatarRenderer";
import type { AvatarPose } from "../types/avatar";
import { RODS } from "../data/gameData";
import { getEquippedRodIndex } from "../services/equipment";
import { preloadRodArt } from "../data/rodArt";

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerAvatar!: AvatarLayerSet;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveX = 0;
  private moveY = 0;
  private walkElapsed = 0;
  private playerFrame: AvatarPose = "idle";
  private transitioning = false;
  private contextAction!: Phaser.GameObjects.Container;
  private contextActionText!: Phaser.GameObjects.Text;
  private miniMapDot!: Phaser.GameObjects.Arc;
  private locationText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private weatherOverlay?: Phaser.GameObjects.Container;
  private environmentVisualKey = "";
  private activeInteraction: "fish" | null = null;
  private spawnPoint: "center" | "dock" | "shop" | "river" = "center";
  private readonly shopSpot = new Phaser.Math.Vector2(335, 225);
  private readonly riverSpot = new Phaser.Math.Vector2(690, 155);
  private readonly spriteFootY = 4;

  constructor() { super("WorldScene"); }

  init(data?: { spawn?: "center" | "dock" | "shop" | "river" }): void {
    this.spawnPoint = data?.spawn ?? "center";
    this.activeInteraction = null;
    this.moveX = 0;
    this.moveY = 0;
    this.walkElapsed = 0;
    this.playerFrame = "idle";
    this.transitioning = false;
  }

  preload(): void {
    this.load.image("coastal-village-bg", "/assets/world/coastal-village-v2.png");
    preloadAvatarAssets(this);
    this.load.image("shopkeeper", "/assets/characters/shopkeeper-v1.png");
    preloadRodArt(this);
    preloadWorldHudAssets(this);
  }

  create(): void {
    this.drawMap();
    this.createShopkeeper();
    this.createPlayer();
    this.createHud();
    this.refreshEnvironment(false);
    this.createTouchControls();
    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.refreshEnvironment(true) });
    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    const useContextAction = () => this.performContextAction();
    this.input.keyboard?.on("keydown-E", useContextAction);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-E", useContextAction);
    });
  }

  update(_time: number, deltaMs: number): void {
    const keyboardX = (this.cursors.left?.isDown ? -1 : 0) + (this.cursors.right?.isDown ? 1 : 0);
    const keyboardY = (this.cursors.up?.isDown ? -1 : 0) + (this.cursors.down?.isDown ? 1 : 0);
    const direction = new Phaser.Math.Vector2(keyboardX || this.moveX, keyboardY || this.moveY);
    const isMoving = direction.lengthSq() > 0;
    let didMove = false;
    if (isMoving) {
      direction.normalize().scale(175 * Math.min(deltaMs / 1000, .04));
      const movement = moveOnNavigationMap(
        this.player.x, this.player.y, direction.x, direction.y, COAST_NAVIGATION
      );
      this.player.setPosition(movement.x, movement.y);
      didMove = movement.moved;
      this.player.scaleX = direction.x < 0 ? -1 : direction.x > 0 ? 1 : this.player.scaleX;
    }
    this.updateWalkAnimation(didMove, deltaMs);

    const riverDistance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.riverSpot.x, this.riverSpot.y
    );
    if (!this.transitioning && riverDistance < 55) {
      this.transitioning = true;
      this.scene.start("RiverScene", { spawn: "village" });
      return;
    }

    const nearWater = this.isNearCoastWater(this.player.x, this.player.y);
    const nearShop = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.shopSpot.x, this.shopSpot.y
    ) < 135;
    const nextInteraction = nearWater ? "fish" : null;
    if (nextInteraction !== this.activeInteraction) {
      this.activeInteraction = nextInteraction;
      this.contextAction.setVisible(nextInteraction !== null);
      this.contextActionText.setText("ตกปลา");
    }
    this.locationText.setText(
      nearWater ? "แนวชายฝั่งอ่าวปะการัง"
        : nearShop ? "ร้านอุปกรณ์ลุงมนัส"
          : riverDistance < 125 ? "ทางไปลำธารน้ำใส"
            : "หมู่บ้านริมอ่าว"
    );
    this.miniMapDot.setPosition(1160 + this.player.x / 1280 * 96, 58 + this.player.y / 720 * 50);
  }

  private createShopkeeper(): void {
    this.add.ellipse(this.shopSpot.x, this.shopSpot.y + 30, 76, 25, 0x273b30, .28).setDepth(3);
    const shopkeeper = this.add.image(this.shopSpot.x, this.shopSpot.y + 32, "shopkeeper")
      .setOrigin(.5, 1).setDisplaySize(86, 129).setDepth(4).setInteractive({ useHandCursor: true });
    shopkeeper.on("pointerdown", () => {
      const closeEnough = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.shopSpot.x, this.shopSpot.y
      ) < 145;
      if (closeEnough) this.scene.start("QuestScene");
      else this.locationText.setText("เข้าไปใกล้ลุงมนัสอีกนิด");
    });
    const quest = readStarterQuest();
    const marker = quest.status === "active" ? "?" : quest.status === "completed" ? "" : "!";
    if (marker) {
      this.add.text(this.shopSpot.x - 48, this.shopSpot.y - 110, marker, {
        fontFamily: THAI_FONT, fontSize: "22px", fontStyle: "bold", color: "#ffd466",
        stroke: "#173c43", strokeThickness: 5
      }).setOrigin(.5).setDepth(6);
    }
    this.add.text(this.shopSpot.x, this.shopSpot.y - 111, "ลุงมนัส  •  ร้านอุปกรณ์", {
      fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: "#fff3d3",
      stroke: "#173c43", strokeThickness: 4
    }).setOrigin(.5).setDepth(5);
  }

  private drawMap(): void {
    this.add.image(640, 360, "coastal-village-bg").setDisplaySize(1280, 720);
    createWaterEffects(this, "coast");

    const riverGate = this.add.circle(this.riverSpot.x, this.riverSpot.y, 32, 0x78d887, .2)
      .setStrokeStyle(4, 0xfff0b8, .95);
    this.tweens.add({
      targets: riverGate,
      scale: { from: .86, to: 1.12 },
      alpha: { from: .92, to: .42 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });
    this.add.text(this.riverSpot.x, this.riverSpot.y - 2, "↑", {
      fontFamily: THAI_FONT, fontSize: "33px", fontStyle: "bold", color: "#fff8d8",
      stroke: "#315c45", strokeThickness: 5
    }).setOrigin(.5);
    this.add.text(this.riverSpot.x, this.riverSpot.y + 48, "ลำธารน้ำใส", {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: "#fff5d8",
      stroke: "#315c45", strokeThickness: 5
    }).setOrigin(.5);
  }

  private createPlayer(): void {
    // ตำแหน่ง container คือจุดที่ฝ่าเท้าสัมผัสพื้น เพื่อให้ภาพและขอบชนตรงกัน
    const shadow = this.add.ellipse(0, 2, 62, 20, 0x273b30, .28);
    const character = getSelectedCharacter();
    const equipped = readEquippedFashion();
    this.playerAvatar = createAvatarLayerSet(this, {
      y: this.spriteFootY, width: 72, height: 108, originY: 1,
      tint: character.tint, gender: character.gender, baseVariant: character.baseVariant, equipped, pose: "idle"
    });
    this.playerFrame = "idle";
    const fashion: Phaser.GameObjects.GameObject[] = [];
    if (equipped.shoes) fashion.push(this.add.text(0, -7, "👟", { fontSize: "16px" }).setOrigin(.5));
    const spawns = {
      center: new Phaser.Math.Vector2(590, 430),
      dock: new Phaser.Math.Vector2(965, 385),
      shop: new Phaser.Math.Vector2(430, 280),
      river: new Phaser.Math.Vector2(690, 250)
    };
    const spawn = spawns[this.spawnPoint];
    this.player = this.add.container(spawn.x, spawn.y, [shadow, ...this.playerAvatar.objects, ...fashion]).setDepth(6);
  }

  private createHud(): void {
    const save = readSaveData();
    createEnergyPanel(this);
    const topBar = createWorldTopBar(this, "หมู่บ้านริมอ่าว", 0x55b7c7);
    this.locationText = topBar.locationText;
    this.clockText = topBar.clockText;
    this.miniMapDot = topBar.miniMapDot;

    createWorldMenu(this, page => {
      if (page === "aquarium") this.scene.start("AquariumScene", { returnScene: "WorldScene" });
      else if (page === "battle") this.scene.start("BattleScene", { returnScene: "WorldScene" });
      else this.scene.start("PlayerMenuScene", { page });
    });
    this.createCraftButton();
    createMapBaitSelector(this);

    const equippedRod = RODS[getEquippedRodIndex(save)];
    const fishingAction = createFishingActionButton(this, () => this.performContextAction(), equippedRod.id);
    this.contextAction = fishingAction.container.setVisible(false);
    this.contextActionText = fishingAction.label;
    this.add.text(640, 646, getStarterQuestSummary(save), {
      fontFamily: THAI_FONT, fontSize: "12px", color: "#fff4d8",
      stroke: "#173c43", strokeThickness: 5
    }).setOrigin(.5).setDepth(10);
    createDailyQuestButton(this, "WorldScene");
  }

  private createCraftButton(): void {
    createHudDiscButton(this, 342, 121, "craft", "สร้างของ", () => this.scene.start("CraftScene"))
      .setDepth(10);
  }

  private refreshEnvironment(advance: boolean): void {
    const state = advance ? advanceWorldTime(5) : readWorldState();
    this.clockText?.setText(formatWorldClock(state));
    const key = `${state.weather}:${getTimePeriod(state.minutes)}`;
    if (key === this.environmentVisualKey) return;
    if (this.weatherOverlay) {
      this.weatherOverlay.iterate((child: Phaser.GameObjects.GameObject) => this.tweens.killTweensOf(child));
      this.weatherOverlay.destroy(true);
    }
    this.environmentVisualKey = key;
    this.weatherOverlay = createWeatherOverlay(this, state);
  }

  private createTouchControls(): void {
    const center = new Phaser.Math.Vector2(105, 610);
    const base = this.add.circle(center.x, center.y, 58, 0x173c4a, .3)
      .setStrokeStyle(1.5, 0xe8fff7, .72).setInteractive().setDepth(10);
    const knob = this.add.circle(center.x, center.y, 23, 0xffffff, .62)
      .setStrokeStyle(2, 0x86bfc5, .8).setInteractive().setDepth(11);
    let active = false;
    const moveStick = (pointer: Phaser.Input.Pointer) => {
      if (!active) return;
      const direction = new Phaser.Math.Vector2(pointer.worldX - center.x, pointer.worldY - center.y);
      if (direction.lengthSq() > 0) direction.normalize();
      this.moveX = direction.x;
      this.moveY = direction.y;
      knob.setPosition(center.x + direction.x * 36, center.y + direction.y * 36);
    };
    const start = (pointer: Phaser.Input.Pointer) => { active = true; moveStick(pointer); };
    const release = () => {
      active = false;
      this.moveX = 0;
      this.moveY = 0;
      knob.setPosition(center.x, center.y);
    };
    base.on("pointerdown", start);
    knob.on("pointerdown", start);
    this.input.on("pointermove", moveStick);
    this.input.on("pointerup", release);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", moveStick);
      this.input.off("pointerup", release);
    });
  }

  private performContextAction(): void {
    if (this.activeInteraction === "fish") {
      this.scene.start("FishingScene", { returnScene: "WorldScene", returnSpawn: "dock", biome: "coast" });
    }
  }

  private isNearCoastWater(x: number, y: number): boolean {
    const shorelineX = 790 - y * .14;
    const besideShore = x > shorelineX - 85;
    const onPier = x > 790 && y > 285 && y < 500;
    return besideShore || onPier;
  }

  private updateWalkAnimation(isMoving: boolean, deltaMs: number): void {
    if (!isMoving) {
      this.walkElapsed = 0;
      if (this.playerFrame !== "idle") {
        this.playerFrame = "idle";
        this.playerAvatar.setPose(this.playerFrame);
      }
      this.playerAvatar.setOffsetY(this.spriteFootY);
      return;
    }
    this.walkElapsed += deltaMs;
    const frame: AvatarPose = Math.floor(this.walkElapsed / 165) % 2 === 0 ? "idle" : "walk";
    if (frame !== this.playerFrame) {
      this.playerFrame = frame;
      this.playerAvatar.setPose(frame);
    }
    this.playerAvatar.setOffsetY(this.spriteFootY - Math.abs(Math.sin(this.walkElapsed / 105)) * 2);
  }
}
