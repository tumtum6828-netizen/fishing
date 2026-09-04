import Phaser from "phaser";
import { SHOP_ITEMS } from "../data/shopData";
import { readBaitStock, readSelectedBait, setSelectedBait } from "../services/bait";
import { readSaveData } from "../services/save";
import { addRoundedPanel, GAME_THEME } from "./gameTheme";
import { THAI_FONT } from "./worldHud";

function selectedBait() {
  const save = readSaveData();
  return { save, ...readSelectedBait(save) };
}

export function createMapBaitSelector(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const outer = scene.add.circle(0, 0, 30, GAME_THEME.cream, .94)
    .setStrokeStyle(2, GAME_THEME.orange, .98)
    .setInteractive({ useHandCursor: true });
  const icon = scene.add.text(0, -6, "", { fontSize: "21px" }).setOrigin(.5);
  const count = scene.add.text(0, 14, "", {
    fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: GAME_THEME.ink
  }).setOrigin(.5);
  const label = scene.add.text(0, 41, "เหยื่อ", {
    fontFamily: THAI_FONT, fontSize: "10px", fontStyle: "bold", color: "#fff5d8",
    stroke: "#173f4c", strokeThickness: 4
  }).setOrigin(.5);
  const container = scene.add.container(1070, 615, [outer, icon, count, label]).setDepth(12);
  let picker: Phaser.GameObjects.Container | undefined;

  const refresh = () => {
    const bait = selectedBait();
    icon.setText(bait.item?.icon ?? "○");
    count.setText(bait.item ? `×${bait.count}` : "ไม่ใช้");
  };
  const closePicker = () => {
    picker?.destroy(true);
    picker = undefined;
  };
  const openPicker = () => {
    if (picker) return;
    const { save, item: current } = selectedBait();
    const baitStock = readBaitStock(save);
    const available = SHOP_ITEMS.filter(item => item.category === "bait" && baitStock[item.id] > 0);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const shade = scene.add.rectangle(640, 360, 1280, 720, 0x0b3039, .58).setInteractive();
    shade.on("pointerdown", closePicker);
    objects.push(shade, addRoundedPanel(scene, 350, 135, 580, 470, GAME_THEME.cream, GAME_THEME.orange, 28, 1, 3));
    objects.push(scene.add.text(395, 174, "🪱  เลือกเหยื่อ", {
      fontFamily: THAI_FONT, fontSize: "29px", fontStyle: "bold", color: GAME_THEME.ink
    }).setOrigin(0, .5));
    objects.push(scene.add.text(395, 208, "เลือกไว้ล่วงหน้าก่อนออกตกปลา", {
      fontFamily: THAI_FONT, fontSize: "14px", color: GAME_THEME.muted
    }).setOrigin(0, .5));
    const close = scene.add.circle(890, 174, 22, 0xfff5df)
      .setStrokeStyle(1.5, 0xd2a75e).setInteractive({ useHandCursor: true });
    close.on("pointerdown", closePicker);
    objects.push(close, scene.add.text(890, 172, "×", {
      fontFamily: THAI_FONT, fontSize: "27px", color: GAME_THEME.ink
    }).setOrigin(.5));

    const choices = [
      ...available.map(item => ({ id: item.id as string | undefined, icon: item.icon, name: item.name,
        detail: `เหลือ ${baitStock[item.id]} ชิ้น • ${item.description}` })),
      { id: "none", icon: "○", name: "ไม่ใช้เหยื่อ", detail: "ผลในเกม: รอนานขึ้น • มีโอกาสติดขยะสูง" }
    ];
    choices.forEach((choice, index) => {
      const y = 238 + index * 100;
      const isSelected = choice.id === (current?.id ?? (save.selectedBaitId === "none" ? "none" : undefined));
      objects.push(addRoundedPanel(scene, 385, y, 510, 82,
        isSelected ? GAME_THEME.paleGreen : 0xfffdf7,
        isSelected ? GAME_THEME.teal : GAME_THEME.line, 20, 1, isSelected ? 2 : 1.2));
      objects.push(scene.add.circle(430, y + 41, 27, isSelected ? 0xd7ebd9 : 0xffefd2));
      objects.push(scene.add.text(430, y + 41, choice.icon, { fontSize: "26px" }).setOrigin(.5));
      objects.push(scene.add.text(474, y + 22, choice.name, {
        fontFamily: THAI_FONT, fontSize: "18px", fontStyle: "bold", color: GAME_THEME.ink
      }));
      objects.push(scene.add.text(474, y + 49, choice.detail, {
        fontFamily: THAI_FONT, fontSize: "12px", color: GAME_THEME.muted,
        wordWrap: { width: 365 }, maxLines: 2
      }));
      if (isSelected) {
        objects.push(scene.add.text(855, y + 20, "เลือกอยู่ ✓", {
          fontFamily: THAI_FONT, fontSize: "12px", fontStyle: "bold", color: GAME_THEME.greenText
        }).setOrigin(1, 0));
      }
      const hit = scene.add.zone(385, y, 510, 82).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        setSelectedBait(choice.id ?? "none");
        refresh();
        closePicker();
      });
      objects.push(hit);
    });
    if (available.length === 0) {
      objects.push(scene.add.text(640, 520, "ยังไม่มีเหยื่อ • ซื้อได้จากร้านลุงมนัส", {
        fontFamily: THAI_FONT, fontSize: "14px", color: "#a0663b"
      }).setOrigin(.5));
    }
    picker = scene.add.container(0, 0, objects).setDepth(40);
  };

  outer.on("pointerdown", () => {
    scene.tweens.add({ targets: container, scale: .92, duration: 70, yoyo: true });
    openPicker();
  });
  refresh();
  return container;
}
