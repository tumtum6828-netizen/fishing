import Phaser from "phaser";
import { moveOnNavigationMap, RIVER_NAVIGATION } from "../data/worldNavigation";
import { readSaveData } from "../services/save";
import { createDailyQuestButton, createEnergyPanel, createFishingActionButton, createWorldMenu, createWorldTopBar, preloadWorldHudAssets, showWorldNotice, THAI_FONT } from "../ui/worldHud";
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
import { getAreaLockState } from "../services/journal";

type RiverSpawn = "village" | "bank";
type RiverInteraction = "fish" | null;

export class RiverScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerAvatar!: AvatarLayerSet;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveX = 0;
  private moveY = 0;
  private walkElapsed = 0;
  private playerFrame: AvatarPose = "idle";
  private transitioning = false;
  private spawnPoint: RiverSpawn = "village";
  private activeInteraction: RiverInteraction = null;
  private contextAction!: Phaser.GameObjects.Container;
  private contextActionText!: Phaser.GameObjects.Text;
  private locationText!: Phaser.GameObjects.Text;
  private miniMapDot!: Phaser.GameObjects.Arc;
  private clockText!: Phaser.GameObjects.Text;
  private weatherOverlay?: Phaser.GameObjects.Container;
  private environmentVisualKey = "";
  private readonly villageExit = new Phaser.Math.Vector2(640, 605);
  private readonly spriteFootY = 4;

  constructor() { super("RiverScene"); }

  init(data?: { spawn?: RiverSpawn }): void {
    this.spawnPoint = data?.spawn ?? "village";
    this.activeInteraction = null;
    this.moveX = 0;
    this.moveY = 0;
    this.walkElapsed = 0;
    this.playerFrame = "idle";
    this.transitioning = false;
  }

  preload(): void {
    this.load.image("river-clearing-bg", "/assets/world/river-clearing-v2.png");
    preloadAvatarAssets(this);
    preloadRodArt(this);
    preloadWorldHudAssets(this);
  }

  create(): void {
    this.drawMap();
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
        this.player.x, this.player.y, direction.x, direction.y, RIVER_NAVIGATION
      );
      this.player.setPosition(movement.x, movement.y);
      didMove = movement.moved;
      this.player.scaleX = direction.x < 0 ? -1 : direction.x > 0 ? 1 : this.player.scaleX;
    }
    this.updateWalkAnimation(didMove, deltaMs);

    const villageDistance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.villageExit.x, this.villageExit.y
    );
    if (!this.transitioning && villageDistance < 42) {
      const lock = getAreaLockState("village");
      if (lock.locked) {
        this.transitioning = true;
        showWorldNotice(this, lock.hint ?? "ยังไปพื้นที่นี้ไม่ได้");
        this.time.delayedCall(900, () => { this.transitioning = false; });
        return;
      }
      this.transitioning = true;
      this.scene.start("WorldScene", { spawn: "river" });
      return;
    }

    const nearWater = this.isNearRiverWater(this.player.x, this.player.y);
    const nextInteraction: RiverInteraction = nearWater ? "fish" : null;
    if (nextInteraction !== this.activeInteraction) {
      this.activeInteraction = nextInteraction;
      this.contextAction.setVisible(nextInteraction !== null);
      this.contextActionText.setText("ตกปลา");
    }
    this.locationText.setText(
      nearWater ? "ริมลำธารน้ำใส" : villageDistance < 115 ? "ทางกลับหมู่บ้าน" : "ลำธารน้ำใส"
    );
    this.miniMapDot.setPosition(1160 + this.player.x / 1280 * 96, 58 + this.player.y / 720 * 50);
  }

  private drawMap(): void {
    this.add.image(640, 360, "river-clearing-bg").setDisplaySize(1280, 720);
    createWaterEffects(this, "river");

    const villageGlow = this.add.circle(this.villageExit.x, this.villageExit.y, 34, 0x79d58c, .18)
      .setStrokeStyle(4, 0xfff0b8, .95);
    this.tweens.add({
      targets: villageGlow,
      scale: { from: .84, to: 1.12 },
      alpha: { from: .9, to: .38 },
      duration: 1100,
      yoyo: true,
      repeat: -1
    });
    this.add.text(this.villageExit.x, this.villageExit.y - 2, "↓", {
      fontFamily: THAI_FONT, fontSize: "33px", fontStyle: "bold", color: "#fff8d8",
      stroke: "#315c45", strokeThickness: 5
    }).setOrigin(.5);
    this.add.text(this.villageExit.x, this.villageExit.y - 52, "กลับหมู่บ้าน", {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: "#fff5d8",
      stroke: "#315c45", strokeThickness: 5
    }).setOrigin(.5);

    this.add.text(170, 165, "↑  ทางสู่น้ำตก", {
      fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold", color: "#fff5d8",
      stroke: "#315c45", strokeThickness: 5
    }).setOrigin(.5);
    this.add.text(170, 193, "ปลดล็อกเมื่อถึง Lv.5", {
      fontFamily: THAI_FONT, fontSize: "11px", color: "#fff5d8",
      stroke: "#315c45", strokeThickness: 4
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
    const spawn = this.spawnPoint === "bank"
      ? new Phaser.Math.Vector2(900, 400)
      : new Phaser.Math.Vector2(640, 555);
    this.player = this.add.container(spawn.x, spawn.y, [shadow, ...this.playerAvatar.objects, ...fashion]).setDepth(6);
  }

  private createHud(): void {
    const save = readSaveData();
    createEnergyPanel(this);
    createWorldMenu(this, page => {
      if (page === "aquarium") this.scene.start("AquariumScene", { returnScene: "RiverScene" });
      else if (page === "battle") this.scene.start("BattleScene", { returnScene: "RiverScene" });
      else this.scene.start("PlayerMenuScene", { page });
    });
    createMapBaitSelector(this);
    const topBar = createWorldTopBar(this, "ลำธารน้ำใส", 0x5caf79);
    this.locationText = topBar.locationText;
    this.clockText = topBar.clockText;
    this.miniMapDot = topBar.miniMapDot;

    const equippedRod = RODS[getEquippedRodIndex(save)];
    const fishingAction = createFishingActionButton(this, () => this.performContextAction(), equippedRod.id);
    this.contextAction = fishingAction.container.setVisible(false);
    this.contextActionText = fishingAction.label;
    this.add.text(640, 646, "เส้นทาง  •  หมู่บ้านริมอ่าว  •  น้ำตก Lv.5", {
      fontFamily: THAI_FONT, fontSize: "12px", color: "#fff4d8",
      stroke: "#173c43", strokeThickness: 5
    }).setOrigin(.5).setDepth(10);
    createDailyQuestButton(this, "RiverScene");
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
      this.scene.start("FishingScene", { returnScene: "RiverScene", returnSpawn: "bank", biome: "river" });
    }
  }

  private isNearRiverWater(x: number, y: number): boolean {
    const besideRightChannel = x > 875 && y > 250 && y < 590;
    const besideUpperChannel = y < 335 && x > 245;
    const besideBridgeChannel = x < 390 && y > 205 && y < 390;
    return besideRightChannel || besideUpperChannel || besideBridgeChannel;
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
