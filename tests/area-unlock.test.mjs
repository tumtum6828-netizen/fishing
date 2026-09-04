import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/services/journal.ts";
      export * from "./src/services/save.ts";
      export * from "./src/data/journalData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
const COAST = "ปลาทู";
const BOTH = "ปลากะพงขาว";
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

const seed = save => storage.set(SAVE_KEY, JSON.stringify(save));

function everyCell(species) {
  const cells = [];
  for (const biome of api.habitatBiomes(species)) {
    for (const period of api.HABITAT_PERIODS) {
      for (const weather of api.HABITAT_WEATHERS) cells.push(`${biome}:${period}:${weather}`);
    }
  }
  return cells;
}

test("no area in the shipped game is locked, so nobody loses a route they already walked", () => {
  assert.deepEqual(api.AREA_REQUIREMENTS, {},
    "ตั้งใจให้ว่างจนกว่าจะมีแผนที่ใหม่ ถ้าเพิ่มเงื่อนไขต้องแก้เทสต์นี้พร้อมคิดเรื่องเซฟเดิม");
  seed({});
  for (const areaId of ["river", "village", "coast", "ไม่มีพื้นที่นี้"]) {
    assert.equal(api.getAreaLockState(areaId).locked, false, `${areaId} ต้องเข้าได้`);
  }
});

test("an empty save reports nothing logged and nothing complete, without throwing", () => {
  seed({});
  const state = api.getAreaLockState("river");
  assert.deepEqual(state, { locked: false, speciesLogged: 0, cardsComplete: 0 });
});

test("only species with a recorded cell count as logged, not ones merely discovered", () => {
  seed({
    discoveredSpecies: [COAST, BOTH, "ปูม้า"],
    speciesLog: {
      [COAST]: { cells: ["coast:day:clear"], catchCount: 1 },
      [BOTH]: { cells: [], catchCount: 1 },
      "ปูม้า": { cells: [], catchCount: 1 }
    }
  });
  assert.equal(api.countLoggedSpecies(), 1, "ชนิดที่ migrate มาแบบช่องว่างต้องไม่ถูกนับ");
  assert.equal(api.countCompleteCards(), 0);
});

test("a full card counts towards both totals", () => {
  seed({
    speciesLog: {
      [COAST]: { cells: everyCell(COAST), catchCount: 30 },
      [BOTH]: { cells: ["coast:day:clear"], catchCount: 1 }
    }
  });
  assert.equal(api.countLoggedSpecies(), 2);
  assert.equal(api.countCompleteCards(), 1);
});

test("a requirement holds the area shut until it is met, then opens it", () => {
  const requirements = {
    mangrove: { speciesLogged: 2, hint: "บันทึกนิเวศให้ครบ 2 ชนิดก่อน" }
  };
  seed({ speciesLog: { [COAST]: { cells: ["coast:day:clear"], catchCount: 1 } } });
  const shut = api.getAreaLockState("mangrove", api.readSaveData(), requirements);
  assert.equal(shut.locked, true);
  assert.equal(shut.hint, "บันทึกนิเวศให้ครบ 2 ชนิดก่อน");
  assert.equal(shut.speciesLogged, 1);

  seed({
    speciesLog: {
      [COAST]: { cells: ["coast:day:clear"], catchCount: 1 },
      [BOTH]: { cells: ["river:night:rain"], catchCount: 1 }
    }
  });
  const open = api.getAreaLockState("mangrove", api.readSaveData(), requirements);
  assert.equal(open.locked, false);
  assert.equal(open.hint, undefined, "เปิดแล้วต้องไม่มีข้อความเตือนค้าง");
});

test("both kinds of requirement must be satisfied, not just one", () => {
  const requirements = {
    reef: { speciesLogged: 1, cardsComplete: 1, hint: "ต้องเก็บการ์ดให้เต็มหนึ่งใบก่อน" }
  };
  seed({ speciesLog: { [COAST]: { cells: ["coast:day:clear"], catchCount: 1 } } });
  assert.equal(api.getAreaLockState("reef", api.readSaveData(), requirements).locked, true,
    "ครบชนิดแต่ยังไม่มีการ์ดเต็ม ต้องยังล็อกอยู่");

  seed({ speciesLog: { [COAST]: { cells: everyCell(COAST), catchCount: 30 } } });
  assert.equal(api.getAreaLockState("reef", api.readSaveData(), requirements).locked, false);
});

test("an area with no requirement listed is always open", () => {
  const requirements = { mangrove: { speciesLogged: 99, hint: "ยากมาก" } };
  seed({});
  assert.equal(api.getAreaLockState("river", api.readSaveData(), requirements).locked, false);
  assert.equal(api.getAreaLockState("mangrove", api.readSaveData(), requirements).locked, true);
});

test("a corrupt journal cannot wedge an area shut by making the counts throw", () => {
  seed({ speciesLog: { [COAST]: "เสีย", [BOTH]: { cells: "ไม่ใช่อาร์เรย์", catchCount: "x" } } });
  assert.equal(api.countLoggedSpecies(), 0);
  assert.equal(api.getAreaLockState("river").locked, false);
});
