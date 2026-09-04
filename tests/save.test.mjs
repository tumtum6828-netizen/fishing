import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: { contents: `export * from "./src/services/save.ts";`, resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
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

const seedRaw = text => storage.set(SAVE_KEY, text);
const seed = save => seedRaw(JSON.stringify(save));

test("a healthy save comes back byte-for-byte equal in meaning", () => {
  const save = {
    coins: 1250, anglerXp: 900, starterPackClaimed: true, selectedBaitId: "fresh-shrimp",
    baitStock: { "fresh-shrimp": 99 }, records: [["ปลาทู", 1.4]], discoveredSpecies: ["ปลาทู"],
    claimedLevelRewards: [1, 2], weather: "rain", worldDay: 3, worldMinutes: 620,
    inventory: { fish: { "ปลาทู": { count: 2, totalWeight: 2.4, bestWeight: 1.4, totalValue: 60, sexCounts: { male: 1, female: 1 } } }, trash: { "ขวดพลาสติก": 4 } },
    equippedFashion: { hat: "straw-hat" }
  };
  seed(save);
  assert.deepEqual(api.readSaveData(), save);
});

test("one corrupt field never costs the player the rest of their progress", () => {
  seed({
    coins: 4200,
    anglerXp: 780,
    discoveredSpecies: ["ปลาทู", "ปลากะพงขาว"],
    inventory: "ไฟล์เสีย",
    aquarium: 42,
    baitStock: null,
    records: "ไม่ใช่อาร์เรย์"
  });
  const save = api.readSaveData();
  assert.equal(save.coins, 4200);
  assert.equal(save.anglerXp, 780);
  assert.deepEqual(save.discoveredSpecies, ["ปลาทู", "ปลากะพงขาว"]);
  assert.equal(save.inventory, undefined);
  assert.equal(save.aquarium, undefined);
  assert.equal(save.baitStock, undefined);
  assert.equal(save.records, undefined);
});

test("numbers that are not really numbers are dropped, not passed on to break the game", () => {
  seed({ coins: "5000", anglerXp: Number.NaN, conservationPoints: null, collectionCount: 12 });
  const save = api.readSaveData();
  assert.equal(save.coins, undefined, "เหรียญที่เป็นสตริงต้องไม่หลุดเข้าไปให้เอาไปบวกลบ");
  assert.equal(save.anglerXp, undefined);
  assert.equal(save.conservationPoints, undefined);
  assert.equal(save.collectionCount, 12);
});

test("rotten entries inside a list are removed while the good ones survive", () => {
  seed({
    records: [["ปลาทู", 1.4], "ขยะ", ["ไม่มีน้ำหนัก"], ["ปลากด", 2.2], [null, 3]],
    discoveredSpecies: ["ปลาทู", 7, null, "ปลากด"],
    claimedLevelRewards: [1, "2", 3]
  });
  const save = api.readSaveData();
  assert.deepEqual(save.records, [["ปลาทู", 1.4], ["ปลากด", 2.2]]);
  assert.deepEqual(save.discoveredSpecies, ["ปลาทู", "ปลากด"]);
  assert.deepEqual(save.claimedLevelRewards, [1, 3]);
});

test("a half-written fish stack is repaired to zeroes instead of spreading NaN", () => {
  seed({ inventory: { fish: { "ปลาทู": { count: 3 }, "ปลากด": "เสีย" }, trash: { "กระป๋อง": "x", "ขวด": 2 } } });
  const save = api.readSaveData();
  assert.deepEqual(save.inventory.fish["ปลาทู"], {
    count: 3, totalWeight: 0, bestWeight: 0, totalValue: 0, sexCounts: { male: 0, female: 0 }
  });
  assert.equal(save.inventory.fish["ปลากด"], undefined);
  assert.deepEqual(save.inventory.trash, { "ขวด": 2 });
});

test("an unknown weather id falls away so the world does not ask for a missing overlay", () => {
  seed({ weather: "พายุหิมะ", worldDay: 2 });
  const save = api.readSaveData();
  assert.equal(save.weather, undefined);
  assert.equal(save.worldDay, 2);
  seed({ weather: "cloudy" });
  assert.equal(api.readSaveData().weather, "cloudy");
});

test("fields this version does not know about are carried through, not silently deleted", () => {
  seed({ coins: 10, futureFeature: { level: 3 }, anotherNewThing: [1, 2] });
  const save = api.readSaveData();
  assert.deepEqual(save.futureFeature, { level: 3 });
  assert.deepEqual(save.anotherNewThing, [1, 2]);

  // เขียนกลับแล้วของเวอร์ชันใหม่กว่าต้องยังอยู่ ไม่ถูกลบทิ้งเพราะเวอร์ชันนี้ไม่รู้จัก
  api.writeSaveData({ coins: 20 });
  const written = JSON.parse(storage.get(SAVE_KEY));
  assert.deepEqual(written.futureFeature, { level: 3 });
  assert.equal(written.coins, 20);
});

test("junk that is not JSON, or not an object, reads as an empty save without throwing", () => {
  for (const raw of ["{ไม่ใช่ json", "null", "[1,2,3]", '"สตริงเปล่า"', "42"]) {
    seedRaw(raw);
    assert.deepEqual(api.readSaveData(), {}, `ค่า ${raw} ต้องอ่านได้เป็นเซฟว่าง`);
  }
});

test("reading a broken save does not write anything back on its own", () => {
  seed({ coins: "เสีย", inventory: 5 });
  api.readSaveData();
  assert.equal(writes, 0, "การอ่านต้องไม่แก้ไขเซฟของผู้เล่นเอง");
});
