import Phaser from "phaser";
import { CRAFT_RECIPES, type CraftRecipe } from "../data/craftingData";
import { checkRecipe, craftRecipe } from "../services/crafting";
import { readInventory } from "../services/inventory";
import { readSaveData } from "../services/save";
import { addPillHitArea, addRoundedPanel, drawSoftBackdrop, GAME_THEME } from "../ui/gameTheme";
import { THAI_FONT } from "../ui/worldHud";

export class CraftScene extends Phaser.Scene {
  private selectedRecipe: CraftRecipe = CRAFT_RECIPES[0];
  private catalog!: Phaser.GameObjects.Container;
  private detail!: Phaser.GameObjects.Container;
  private resourceText!: Phaser.GameObjects.Text;
  private noticeText!: Phaser.GameObjects.Text;

  constructor() { super("CraftScene"); }

  create(): void {
    drawSoftBackdrop(this);
    addRoundedPanel(this, 48, 38, 1184, 644, GAME_THEME.cream, 0xe7c98d, 28, 1, 3);
    const header = this.add.graphics();
    header.fillStyle(0x82c9a2, 1).fillRoundedRect(51, 41, 1178, 88, 25);
    header.fillRect(51, 88, 1178, 41);
    this.add.circle(91, 82, 23, 0xdff1d5, .95);
    this.add.text(91, 82, "🛠️", { fontSize: "22px" }).setOrigin(.5);
    this.add.text(126, 66, "โต๊ะช่างชุมชน", {
      fontFamily: THAI_FONT, fontSize: "27px", fontStyle: "bold", color: GAME_THEME.ink
    });
    this.add.text(127, 99, "นำวัสดุที่เก็บจากแหล่งน้ำกลับมาใช้ให้เกิดประโยชน์", {
      fontFamily: THAI_FONT, fontSize: "13px", color: "#416550"
    });
    addRoundedPanel(this, 905, 58, 220, 48, 0xf7f8e8, 0xb7d2a6, 22, .96, 1.5);
    this.resourceText = this.add.text(1015, 82, "", {
      fontFamily: THAI_FONT, fontSize: "16px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    const close = this.add.circle(1182, 82, 24, 0xfff9ea).setStrokeStyle(1.5, 0x7cad86).setInteractive({ useHandCursor: true });
    this.add.text(1182, 80, "×", { fontFamily: THAI_FONT, fontSize: "31px", color: GAME_THEME.ink }).setOrigin(.5);
    close.on("pointerdown", () => this.scene.start("WorldScene", { spawn: "shop" }));

    this.catalog = this.add.container();
    this.detail = this.add.container();
    this.noticeText = this.add.text(640, 649, "เลือกสูตรเพื่อดูวัตถุดิบ", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(.5);
    this.render();
  }

  private render(): void {
    this.catalog.removeAll(true);
    this.detail.removeAll(true);
    const save = readSaveData();
    const inventory = readInventory();
    const materialCount = Object.values(inventory.trash).reduce((sum, count) => sum + count, 0);
    this.resourceText.setText(`🪙 ${save.coins ?? 0}   •   ♻ วัสดุ ${materialCount}`);

    CRAFT_RECIPES.forEach((recipe, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 76 + col * 380;
      const y = 154 + row * 218;
      const selected = recipe.id === this.selectedRecipe.id;
      const check = checkRecipe(recipe, save);
      const card = addRoundedPanel(this, x, y, 356, 194,
        selected ? 0xfff1d4 : 0xffffff, selected ? GAME_THEME.orangeDark : GAME_THEME.line,
        22, 1, selected ? 2.5 : 1.25);
      const iconBack = this.add.circle(x + 56, y + 58, 34, check.canCraft ? 0xe4f2db : 0xf2eee5);
      const icon = this.add.text(x + 56, y + 58, recipe.icon, { fontSize: "36px" }).setOrigin(.5);
      const name = this.add.text(x + 105, y + 24, recipe.name, {
        fontFamily: THAI_FONT, fontSize: "19px", fontStyle: "bold", color: GAME_THEME.ink
      });
      const output = this.add.text(x + 105, y + 58, `ได้: ${recipe.outputLabel}`, {
        fontFamily: THAI_FONT, fontSize: "13px", color: "#4f7961"
      });
      const requirements = recipe.materials.map(item => `${item.name} ×${item.amount}`).join("  •  ");
      const needs = this.add.text(x + 24, y + 112, requirements, {
        fontFamily: THAI_FONT, fontSize: "13px", color: GAME_THEME.muted, wordWrap: { width: 310 }
      });
      const status = this.add.text(x + 24, y + 157,
        `${check.canCraft ? "✓" : "○"} ${check.reason}${recipe.coinCost ? `  •  🪙 ${recipe.coinCost}` : ""}`, {
        fontFamily: THAI_FONT, fontSize: "14px", fontStyle: "bold",
        color: check.canCraft ? "#398263" : "#9a7761"
      });
      const hit = this.add.zone(x, y, 356, 194).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.selectedRecipe = recipe;
        this.noticeText.setText("ตรวจวัตถุดิบแล้ว").setColor(GAME_THEME.muted);
        this.render();
      });
      this.catalog.add([card, iconBack, icon, name, output, needs, status, hit]);
    });
    this.renderDetail();
  }

  private renderDetail(): void {
    const save = readSaveData();
    const inventory = readInventory();
    const recipe = this.selectedRecipe;
    const check = checkRecipe(recipe, save);
    const panel = addRoundedPanel(this, 852, 154, 350, 412, 0xfffdf7, GAME_THEME.line, 22, 1, 1.5);
    const title = this.add.text(1027, 190, recipe.icon, { fontSize: "54px" }).setOrigin(.5);
    const name = this.add.text(1027, 242, recipe.name, {
      fontFamily: THAI_FONT, fontSize: "23px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(.5);
    const description = this.add.text(1027, 292, recipe.description, {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted, align: "center",
      wordWrap: { width: 296 }, lineSpacing: 5
    }).setOrigin(.5);
    const divider = this.add.graphics().lineStyle(1, GAME_THEME.line, .9)
      .beginPath().moveTo(882, 344).lineTo(1172, 344).strokePath();
    const materialObjects: Phaser.GameObjects.GameObject[] = [];
    recipe.materials.forEach((material, index) => {
      const owned = inventory.trash[material.name] ?? 0;
      const enough = owned >= material.amount;
      materialObjects.push(this.add.text(888, 368 + index * 34,
        `${enough ? "✓" : "○"} ${material.name}`, {
        fontFamily: THAI_FONT, fontSize: "15px", color: enough ? "#398263" : "#8d7565"
      }));
      materialObjects.push(this.add.text(1164, 368 + index * 34, `${owned}/${material.amount}`, {
        fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: enough ? "#398263" : "#8d7565"
      }).setOrigin(1, 0));
    });
    const coin = this.add.text(888, 443, `🪙 ค่าดำเนินการ`, {
      fontFamily: THAI_FONT, fontSize: "15px", color: (save.coins ?? 0) >= recipe.coinCost ? "#8a651d" : "#9b665c"
    });
    const coinValue = this.add.text(1164, 443, `${save.coins ?? 0}/${recipe.coinCost}`, {
      fontFamily: THAI_FONT, fontSize: "15px", fontStyle: "bold", color: "#8a651d"
    }).setOrigin(1, 0);
    const button = addRoundedPanel(this, 894, 487, 266, 58,
      check.canCraft ? GAME_THEME.orange : GAME_THEME.mutedFill,
      check.canCraft ? GAME_THEME.orangeDark : 0xbdb5a9, 20, 1, 1.5);
    const buttonText = this.add.text(1027, 516, check.canCraft ? "สร้างของ" : check.reason, {
      fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: check.canCraft ? GAME_THEME.ink : "#817a70"
    }).setOrigin(.5);
    const hit = this.add.zone(894, 487, 266, 58).setOrigin(0).setInteractive({ useHandCursor: check.canCraft });
    if (check.canCraft) hit.on("pointerdown", () => {
      const result = craftRecipe(recipe.id);
      this.noticeText.setText(result.reason).setColor(result.canCraft ? "#2f8b62" : "#a2604a");
      this.render();
    });
    this.detail.add([panel, title, name, description, divider, ...materialObjects, coin, coinValue, button, buttonText, hit]);
  }
}
