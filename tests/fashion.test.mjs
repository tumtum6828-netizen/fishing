import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/services/fashion.ts";
      export * from "./src/data/fashionData.ts";
      export * from "./src/services/save.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
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
const read = () => JSON.parse(storage.get(SAVE_KEY));
const ownAll = () => Object.fromEntries(api.FASHION_DEFINITIONS.map(item => [item.itemId, 1]));

test("every slot in the wardrobe is a real slot, and gloves is wired end to end", () => {
  const slotIds = api.FASHION_SLOTS.map(slot => slot.id);
  assert.deepEqual(slotIds, ["hat", "outfit", "shoes", "gloves"]);
  assert.equal(new Set(slotIds).size, slotIds.length, "ห้ามมี slot ซ้ำ");
  for (const definition of api.FASHION_DEFINITIONS) {
    assert.ok(slotIds.includes(definition.slot), `${definition.itemId} อยู่ใน slot ที่ไม่มีจริง`);
  }
  // ช่องที่ยังไม่มีของต้องคืนอาร์เรย์ว่าง ไม่ใช่ undefined ไม่งั้นตู้เสื้อผ้าพังตอนเปิดแท็บ
  for (const id of slotIds) assert.ok(Array.isArray(api.fashionItemsInSlot(id)));
});

test("item ids are unique, so a slot never resolves to two different items", () => {
  const ids = api.FASHION_DEFINITIONS.map(item => item.itemId);
  assert.equal(new Set(ids).size, ids.length);
});

test("wearing an item in one slot does not disturb the other slots", () => {
  seed({ ownedShopItems: ownAll() });
  const hat = api.FASHION_DEFINITIONS.find(item => item.slot === "hat");
  const outfit = api.FASHION_DEFINITIONS.find(item => item.slot === "outfit");
  assert.ok(hat && outfit);

  assert.equal(api.toggleFashionItem(hat.itemId).ok, true);
  assert.equal(api.toggleFashionItem(outfit.itemId).ok, true);
  assert.deepEqual(read().equippedFashion, { hat: hat.itemId, outfit: outfit.itemId });

  assert.equal(api.toggleFashionItem(hat.itemId).ok, true);
  assert.deepEqual(read().equippedFashion, { outfit: outfit.itemId }, "ถอดหมวกต้องไม่ถอดชุดไปด้วย");
});

test("an item the player does not own can never be worn", () => {
  seed({ ownedShopItems: {} });
  const item = api.FASHION_DEFINITIONS[0];
  const outcome = api.toggleFashionItem(item.itemId);
  assert.equal(outcome.ok, false);
  assert.equal(read().equippedFashion, undefined);
});

test("an unknown item id is refused and never written to the save", () => {
  seed({ ownedShopItems: { "ghost-hat": 1 } });
  assert.equal(api.toggleFashionItem("ghost-hat").ok, false);
  assert.equal(read().equippedFashion, undefined);
});

test("a save wearing an item that left the catalog reads back clean, keeping the valid pieces", () => {
  const outfit = api.FASHION_DEFINITIONS.find(item => item.slot === "outfit");
  seed({
    ownedShopItems: { ...ownAll(), "retired-hat": 1 },
    equippedFashion: { hat: "retired-hat", outfit: outfit.itemId, gloves: "never-shipped" }
  });
  assert.deepEqual(api.readEquippedFashion(), { outfit: outfit.itemId },
    "ของที่ถูกถอดออกจากแค็ตตาล็อกต้องหายไปเงียบๆ ไม่พาของที่ยังใช้ได้หายตามและต้องไม่ throw");
});

test("selling an item stops it being worn without touching the rest of the save", () => {
  const hat = api.FASHION_DEFINITIONS.find(item => item.slot === "hat");
  seed({ coins: 120, ownedShopItems: { [hat.itemId]: 0 }, equippedFashion: { hat: hat.itemId } });
  assert.deepEqual(api.readEquippedFashion(), {});
  assert.equal(read().coins, 120);
});

test("clearing a slot leaves the other slots and the rest of the save alone", () => {
  const hat = api.FASHION_DEFINITIONS.find(item => item.slot === "hat");
  const outfit = api.FASHION_DEFINITIONS.find(item => item.slot === "outfit");
  seed({ coins: 77, ownedShopItems: ownAll(), equippedFashion: { hat: hat.itemId, outfit: outfit.itemId } });
  api.clearFashionSlot("hat");
  assert.deepEqual(read().equippedFashion, { outfit: outfit.itemId });
  assert.equal(read().coins, 77);
});
