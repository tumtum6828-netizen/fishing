import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/services/journal.ts";
      export * from "./src/services/save.ts";
      export * from "./src/data/journalData.ts";
      export * from "./src/data/environmentData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
const BOTH = "ปลากะพงขาว";   // ชายฝั่ง + แม่น้ำ = 24 ช่อง
const COAST = "ปลาทู";        // ชายฝั่งอย่างเดียว = 12 ช่อง
const LEGEND = "ปลากระโทงดาบ"; // ไม่มีข้อมูลนิเวศ
let storage;
let writes;

beforeEach(() => {
  storage = new Map();
  writes = 0;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); writes += 1; }
    }
  });
});

const seed = save => storage.set(SAVE_KEY, JSON.stringify(save));
const read = () => JSON.parse(storage.get(SAVE_KEY));
const cell = (biome, period, weather) => ({ biome, period, weather });

test("the number of cells comes from the species' real habitats, not a fixed number", () => {
  assert.equal(api.habitatTotal(BOTH), 24, "อยู่ได้สองแหล่งน้ำ = 2 x 4 ช่วงเวลา x 3 อากาศ");
  assert.equal(api.habitatTotal(COAST), 12);
  // ปลาตำนานไม่มีข้อมูลนิเวศ และ rollCatch ไม่กรองแหล่งน้ำให้ จึงถือว่าพบได้ทุกแหล่ง
  assert.equal(api.habitatTotal(LEGEND), 24);
});

test("the whole game's discovery surface is 108 cells from the species that already exist", () => {
  const named = Object.keys(api.FISH_ENVIRONMENT_WEIGHTS);
  const total = named.reduce((sum, name) => sum + api.habitatTotal(name), 0);
  assert.equal(named.length, 7);
  assert.equal(total, 108);
});

test("catching the same species in the same conditions twice adds one cell, not two", () => {
  seed({});
  const first = api.recordCatch(BOTH, cell("coast", "morning", "clear"));
  const second = api.recordCatch(BOTH, cell("coast", "morning", "clear"));
  assert.equal(first.newCell, true);
  assert.equal(second.newCell, false);
  assert.equal(second.progress.found, 1);
  assert.equal(read().speciesLog[BOTH].catchCount, 2, "จำนวนครั้งที่จับต้องนับทุกครั้ง");
});

test("different conditions fill different cells, and progress counts up to completion", () => {
  seed({});
  api.recordCatch(COAST, cell("coast", "morning", "clear"));
  api.recordCatch(COAST, cell("coast", "morning", "rain"));
  api.recordCatch(COAST, cell("coast", "night", "cloudy"));
  const progress = api.getHabitatProgress(COAST);
  assert.deepEqual(progress, { found: 3, total: 12, complete: false });

  for (const period of api.HABITAT_PERIODS) {
    for (const weather of api.HABITAT_WEATHERS) api.recordCatch(COAST, cell("coast", period, weather));
  }
  assert.deepEqual(api.getHabitatProgress(COAST), { found: 12, total: 12, complete: true });
  assert.equal(api.isHabitatComplete(COAST), true);
});

test("a cell in a biome the species cannot live in is not counted", () => {
  // ปลาทูอยู่เฉพาะชายฝั่ง ถ้ามีบันทึกแม่น้ำค้างอยู่ในเซฟ ต้องไม่ถูกนับเป็นความคืบหน้า
  seed({ speciesLog: { [COAST]: { cells: ["coast:morning:clear", "river:morning:clear"], catchCount: 2 } } });
  assert.equal(api.getHabitatProgress(COAST).found, 1);
});

test("insights stay locked until the player has seen enough, then unlock in order", () => {
  seed({});
  assert.deepEqual(api.getUnlockedInsights(COAST), []);

  const insights = api.getSpeciesInsights(COAST);
  assert.deepEqual(insights.map(item => item.kind), ["time", "weather", "biome"]);
  // 12 ช่อง: เวลา 25% = 4 (ขั้นต่ำ), อากาศ 50% = 6, แหล่งน้ำ 75% = 9
  assert.deepEqual(insights.map(item => item.requiredCells), [4, 6, 9]);

  const fill = count => {
    const cells = [];
    for (const period of api.HABITAT_PERIODS) {
      for (const weather of api.HABITAT_WEATHERS) cells.push(`coast:${period}:${weather}`);
    }
    seed({ speciesLog: { [COAST]: { cells: cells.slice(0, count), catchCount: count } } });
  };

  fill(3);
  assert.equal(api.getUnlockedInsights(COAST).length, 0);
  fill(4);
  assert.deepEqual(api.getUnlockedInsights(COAST).map(item => item.kind), ["time"]);
  fill(6);
  assert.deepEqual(api.getUnlockedInsights(COAST).map(item => item.kind), ["time", "weather"]);
  fill(9);
  assert.deepEqual(api.getUnlockedInsights(COAST).map(item => item.kind), ["time", "weather", "biome"]);
});

test("insight wording is derived from the balance data, so it cannot drift out of sync", () => {
  const weights = api.FISH_ENVIRONMENT_WEIGHTS[COAST];
  const bestPeriod = api.HABITAT_PERIODS.reduce((a, b) => weights.time[b] > weights.time[a] ? b : a);
  const bestWeather = api.HABITAT_WEATHERS.reduce((a, b) => weights.weather[b] > weights.weather[a] ? b : a);
  const insights = api.getSpeciesInsights(COAST);
  assert.equal(insights[0].text, api.PERIOD_INSIGHT[bestPeriod]);
  assert.equal(insights[1].text, api.WEATHER_INSIGHT[bestWeather]);
  assert.equal(insights[2].text, "พบเฉพาะชายฝั่ง");
  assert.equal(api.getSpeciesInsights(BOTH)[2].text, "พบได้ทั้งชายฝั่งและแม่น้ำ");
});

test("a species with no ecology data still gets the habitat insight, and no invented ones", () => {
  const kinds = api.getSpeciesInsights(LEGEND).map(item => item.kind);
  assert.deepEqual(kinds, ["biome"], "ไม่มีข้อมูลเวลา/อากาศ ก็ต้องไม่แต่งขึ้นมาเอง");
});

test("old saves keep their discoveries but start with empty cells, never guessed ones", () => {
  seed({ discoveredSpecies: [COAST, BOTH], coins: 900 });
  api.migrateSpeciesLog();
  const log = read().speciesLog;
  assert.deepEqual(log[COAST], { cells: [], catchCount: 1 });
  assert.deepEqual(log[BOTH], { cells: [], catchCount: 1 });
  assert.equal(api.getHabitatProgress(COAST).found, 0, "ห้ามเดาช่องย้อนหลัง สมุดต้องไม่โกหก");
  assert.equal(read().coins, 900);
});

test("migration runs once and never overwrites a log the player has already filled", () => {
  seed({
    discoveredSpecies: [COAST, BOTH],
    speciesLog: { [COAST]: { cells: ["coast:day:rain"], catchCount: 5 } }
  });
  api.migrateSpeciesLog();
  const after = read().speciesLog;
  assert.deepEqual(after[COAST], { cells: ["coast:day:rain"], catchCount: 5 });
  const before = writes;
  api.migrateSpeciesLog();
  assert.equal(writes, before, "รอบสองต้องไม่เขียนซ้ำ");
});

test("a corrupt log is repaired field by field instead of wiping the journal", () => {
  seed({
    coins: 40,
    speciesLog: {
      [COAST]: { cells: ["coast:day:clear", "coast:day:clear", 7, null], catchCount: "สาม" },
      [BOTH]: "เสีย"
    }
  });
  const save = api.readSaveData();
  assert.deepEqual(save.speciesLog[COAST], { cells: ["coast:day:clear"], catchCount: 0 },
    "ช่องซ้ำและช่องที่ไม่ใช่สตริงถูกตัด จำนวนที่อ่านไม่ได้กลายเป็น 0");
  assert.equal(save.speciesLog[BOTH], undefined);
  assert.equal(save.coins, 40);
});

test("recording a catch stamps the day it was first seen, and never moves it later", () => {
  seed({ worldDay: 3 });
  api.recordCatch(COAST, cell("coast", "day", "clear"));
  assert.equal(read().speciesLog[COAST].firstSeenDay, 3);
  seed({ ...read(), worldDay: 9 });
  api.recordCatch(COAST, cell("coast", "night", "rain"));
  assert.equal(read().speciesLog[COAST].firstSeenDay, 3, "วันที่พบครั้งแรกต้องไม่ถูกเขียนทับ");
});

test("recording one species never disturbs another species' log", () => {
  seed({});
  api.recordCatch(COAST, cell("coast", "day", "clear"));
  api.recordCatch(BOTH, cell("river", "night", "rain"));
  const log = read().speciesLog;
  assert.deepEqual(log[COAST].cells, ["coast:day:clear"]);
  assert.deepEqual(log[BOTH].cells, ["river:night:rain"]);
});
