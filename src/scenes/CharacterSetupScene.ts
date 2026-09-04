import Phaser from "phaser";
import { CHARACTER_PRESETS } from "../data/characterData";
import {
  finalizeCharacterPreset, isCharacterFinalized, migrateCharacterAppearance, readCharacterSelection, sanitizePlayerName
} from "../services/character";
import type { CharacterGender } from "../types/character";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";
import { createAvatarLayerSet, preloadAvatarAssets } from "../ui/avatarRenderer";

export class CharacterSetupScene extends Phaser.Scene {
  private selectedId = "male-1";
  private gender: CharacterGender = "male";
  private playerName = "";
  private nameInput?: Phaser.GameObjects.DOMElement;
  private noticeText?: Phaser.GameObjects.Text;
  private isStarting = false;

  constructor() { super("CharacterSetupScene"); }

  preload(): void {
    preloadAvatarAssets(this);
  }

  init(data?: { selectedId?: string; gender?: CharacterGender; playerName?: string }): void {
    this.isStarting = false;
    migrateCharacterAppearance();
    const stored = readCharacterSelection();
    this.selectedId = data?.selectedId ?? stored.presetId;
    this.playerName = data?.playerName ?? stored.playerName ?? "";
    const selected = CHARACTER_PRESETS.find(preset => preset.id === this.selectedId);
    this.gender = data?.gender ?? selected?.gender ?? "male";
  }

  create(): void {
    if (isCharacterFinalized()) {
      this.scene.start("WorldScene");
      return;
    }
    const presets = CHARACTER_PRESETS.filter(preset => preset.gender === this.gender);
    let selected = CHARACTER_PRESETS.find(preset => preset.id === this.selectedId);
    if (!selected || selected.gender !== this.gender) {
      selected = presets[0];
      this.selectedId = selected.id;
    }

    drawSoftBackdrop(this);
    addRoundedPanel(this, 36, 25, 1208, 670, GAME_THEME.cream, 0xe7c98d, 30, 1, 3);
    this.add.text(70, 48, "สร้างนักผจญภัยของคุณ", {
      fontFamily: THAI_FONT, fontSize: "31px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(71, 91, "เลือกได้เพียงครั้งเดียวก่อนเริ่มเกม • ตัวเลือกไม่มีผลต่อความเก่ง", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });

    (["male", "female"] as CharacterGender[]).forEach((gender, index) => {
      const active = gender === this.gender;
      const x = 70 + index * 150;
      addRoundedPanel(this, x, 127, 136, 48, active ? GAME_THEME.orange : 0xffffff,
        active ? GAME_THEME.orangeDark : GAME_THEME.line, 18, 1, active ? 2 : 1.2);
      this.add.text(x + 68, 151, gender === "male" ? "👦 ชาย" : "👧 หญิง", {
        fontFamily: THAI_FONT, fontSize: "17px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5);
      addPillHitArea(this, x, 127, 136, 48, () => {
        const first = CHARACTER_PRESETS.find(preset => preset.gender === gender)!;
        this.scene.restart({ selectedId: first.id, gender, playerName: this.getTypedName() });
      });
    });

    presets.forEach((preset, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = 70 + col * 135;
      const y = 205 + row * 165;
      const active = preset.id === this.selectedId;
      addRoundedPanel(this, x, y, 120, 144, active ? 0xfff0cf : 0xffffff,
        active ? preset.accent : GAME_THEME.line, 20, 1, active ? 2.6 : 1.2);
      this.add.circle(x + 60, y + 48, 34, preset.accent, .22).setStrokeStyle(2, preset.accent, .85);
      createAvatarLayerSet(this, {
        x: x + 60, y: y + 82, width: 52, height: 78, originY: 1,
        tint: preset.tint, gender: preset.gender, baseVariant: preset.baseVariant, equipped: {}, pose: "idle"
      });
      this.add.text(x + 60, y + 96, preset.name, {
        fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
      }).setOrigin(.5);
      this.add.text(x + 60, y + 121, preset.theme, {
        fontFamily: THAI_FONT, fontSize: "10px", color: GAME_THEME.muted
      }).setOrigin(.5);
      addPillHitArea(this, x, y, 120, 144, () => {
        this.scene.restart({ selectedId: preset.id, gender: this.gender, playerName: this.getTypedName() });
      });
    });

    addRoundedPanel(this, 785, 48, 414, 622, 0xfffdf7, GAME_THEME.line, 25, 1, 1.6);
    this.add.text(815, 84, "ตัวละครที่เลือก", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    });
    this.add.ellipse(992, 421, 230, 34, 0xded4c4, .7);
    createAvatarLayerSet(this, {
      x: 992, y: 426, width: 205, height: 308, originY: 1,
      tint: selected.tint, gender: selected.gender, baseVariant: selected.baseVariant, equipped: {}, pose: "idle"
    });
    this.add.text(992, 455, `${selected.gender === "male" ? "👦" : "👧"} ${selected.name}`, {
      fontFamily: THAI_FONT, fontSize: "25px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    this.add.text(992, 487, `ธีม ${selected.theme}`, {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.add.text(862, 512, "ชื่อผู้เล่น", {
      fontFamily: THAI_FONT, fontSize: "13px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.nameInput = this.add.dom(992, 552).createFromHTML(
      `<input name="playerName" type="text" maxlength="16" autocomplete="off" inputmode="text" `+
      `placeholder="พิมพ์ชื่อของคุณ" style="width:260px;height:42px;border:2px solid #d9bd82;`+
      `border-radius:16px;background:#fffdf7;color:#3f3a32;font:600 16px Mitr,Tahoma,sans-serif;`+
      `text-align:center;outline:none;padding:0 12px;box-sizing:border-box;" />`
    ).setDepth(5);
    const input = this.nameInput.getChildByName("playerName") as HTMLInputElement | null;
    if (input) input.value = this.playerName;

    addRoundedPanel(this, 852, 586, 280, 58, GAME_THEME.orange, GAME_THEME.orangeDark, 21, 1, 1.8);
    this.add.text(992, 615, "ยืนยันและเริ่มผจญภัย", {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    addPillHitArea(this, 852, 586, 280, 58, () => {
      if (this.isStarting) return;
      const playerName = this.getTypedName();
      if (!playerName) {
        this.noticeText?.setText("กรุณาตั้งชื่อก่อนเริ่มเกม").setColor("#b55b48");
        input?.focus();
        return;
      }
      if (!finalizeCharacterPreset(selected!.id, playerName)) return;
      this.isStarting = true;
      this.cameras.main.flash(250, 255, 233, 176, false);
      this.time.delayedCall(180, () => this.scene.start("WorldScene"));
    });
    this.noticeText = this.add.text(992, 656, "หลังยืนยันจะเปลี่ยนชื่อ เพศ และตัวละครหลักไม่ได้", {
      fontFamily: THAI_FONT, fontSize: "11px", color: "#9b7760"
    }).setOrigin(.5);
  }

  private getTypedName(): string {
    const input = this.nameInput?.getChildByName("playerName") as HTMLInputElement | null;
    return sanitizePlayerName(input?.value ?? this.playerName);
  }
}
