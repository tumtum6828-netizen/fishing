import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// ตรวจผลข้างเคียงของการจับหนึ่งครั้งที่ระดับข้อมูล: กระเป๋า สถิติ สารานุกรม และสมุดภาคสนาม
// จุดสำคัญคือ "หนึ่ง catch ต้องให้ผลไม่เกินหนึ่งครั้ง" และข้อมูลต้องอยู่ครบหลังอ่านเซฟใหม่
const result = await build({
  stdin: {
    contents: `export * from "./src/services/inventory.ts";
      export * from "./src/services/journal.ts";
      export * from "./src/services/save.ts";
      export * from "./src/services/fishSelection.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
const SPECIES = "ปลากะพงขาว";
let storage;

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); }
    }
  });
});

const read = () => JSON.parse(storage.get(SAVE_KEY) ?? "{}");
const cell = { biome: "coast", period: "morning", weather: "clear" };

/** ผลข้างเคียงของการจับหนึ่งครั้งแบบเดียวกับที่ FishingScene ทำตอนกด "เก็บ" */
function resolveOneCatch(weight = 1.4, saleValue = 52) {
  api.addFishToInventory(SPECIES, weight, saleValue, "male");
  api.recordCatch(SPECIES, cell);
}

test("one catch adds exactly one fish, one journal cell, and one discovery", () => {
  resolveOneCatch();
  const save = read();
  assert.equal(save.inventory.fish[SPECIES].count, 1);
  assert.equal(save.speciesLog[SPECIES].catchCount, 1);
  assert.deepEqual(save.speciesLog[SPECIES].cells, ["coast:morning:clear"]);
  assert.equal(api.getHabitatProgress(SPECIES).found, 1);
});

test("catching the same species again in the same conditions never double-counts the cell", () => {
  resolveOneCatch();
  resolveOneCatch();
  resolveOneCatch();
  const save = read();
  assert.equal(save.inventory.fish[SPECIES].count, 3, "กระเป๋าต้องนับทุกตัว");
  assert.equal(save.speciesLog[SPECIES].catchCount, 3, "จำนวนครั้งที่จับต้องนับทุกครั้ง");
  assert.deepEqual(save.speciesLog[SPECIES].cells, ["coast:morning:clear"],
    "ช่องนิเวศต้องไม่ซ้ำ แม้จับซ้ำที่เดิมเวลาเดิมอากาศเดิม");
  assert.equal(api.getHabitatProgress(SPECIES).found, 1);
});

test("inventory totals accumulate without losing the best weight", () => {
  api.addFishToInventory(SPECIES, 2.5, 90, "male");
  api.addFishToInventory(SPECIES, 1.1, 40, "female");
  const stack = read().inventory.fish[SPECIES];
  assert.equal(stack.count, 2);
  assert.equal(stack.bestWeight, 2.5, "ตัวที่เบากว่าต้องไม่ลบสถิติตัวหนักออก");
  assert.equal(Math.round(stack.totalWeight * 100) / 100, 3.6);
  assert.equal(stack.totalValue, 130);
  assert.deepEqual(stack.sexCounts, { male: 1, female: 1 });
});

test("everything a catch wrote is still there after the save is read fresh, like a reload", () => {
  resolveOneCatch(1.4, 52);
  const reloaded = api.readSaveData();
  assert.equal(reloaded.inventory.fish[SPECIES].count, 1);
  assert.deepEqual(reloaded.speciesLog[SPECIES].cells, ["coast:morning:clear"]);
  assert.equal(api.readInventory().fish[SPECIES].count, 1);
});

test("a poor cast is the only grade that can hook trash, so a good cast always lands a creature", () => {
  for (const bait of ["worm-bundle", "fresh-shrimp", "none", undefined]) {
    for (const weather of ["clear", "cloudy", "rain"]) {
      assert.equal(api.getTrashHookChance("excellent", bait, weather), 0);
      assert.equal(api.getTrashHookChance("good", bait, weather), 0);
      assert.ok(api.getTrashHookChance("poor", bait, weather) > 0);
      assert.ok(api.getTrashHookChance("poor", bait, weather) <= .7);
    }
  }
});

test("a fish rolled for a biome always belongs to that biome, whatever the rod", () => {
  const original = Math.random;
  try {
    for (const seed of [.01, .25, .5, .75, .99]) {
      Math.random = () => seed;
      for (const biome of ["coast", "river"]) {
        for (let rodIndex = 0; rodIndex < 3; rodIndex += 1) {
          const roll = api.rollCatch(rodIndex, biome, "good", "fresh-shrimp", 0, 480, "clear");
          assert.ok(roll.fish?.name, `rod ${rodIndex} ${biome} seed ${seed} ต้องได้สัตว์น้ำเสมอ`);
        }
      }
    }
  } finally {
    Math.random = original;
  }
});

test("a good cast never rolls the legendary, so its identity cannot leak from a normal fight", () => {
  const original = Math.random;
  try {
    Math.random = () => 0;
    for (const grade of ["good", "poor"]) {
      const roll = api.rollCatch(2, "coast", grade, "fresh-shrimp", .4, 1200, "cloudy");
      assert.equal(roll.isLegendary, false, `เกรด ${grade} ต้องไม่ออกปลาตำนาน`);
    }
  } finally {
    Math.random = original;
  }
});
