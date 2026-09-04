import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Use Vite's existing compiler, with isolated in-memory storage (never the player's browser save).
const result = await build({
  stdin: {
    contents: `export * from "./src/services/character.ts";
      export * from "./src/services/save.ts";
      export * from "./src/data/characterData.ts";
      export * from "./src/data/avatarData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
    loader: "ts"
  },
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

function seed(save) { storage.set(SAVE_KEY, JSON.stringify(save)); }

test("all 20 stable preset IDs have valid idle/walk assets and keep the A–D mapping", () => {
  assert.equal(api.CHARACTER_PRESETS.length, 20);
  assert.equal(new Set(api.CHARACTER_PRESETS.map(p => p.id)).size, 20);
  const suffixes = ["a", "b", "c", "d", "a", "b", "c", "d", "a", "b"];
  for (const gender of ["male", "female"]) {
    suffixes.forEach((suffix, index) => {
      const preset = api.CHARACTER_PRESETS.find(p => p.id === `${gender}-${index + 1}`);
      assert.equal(preset.baseVariant, `${gender === "male" ? "boy" : "girl"}-${suffix}`);
      for (const pose of ["idle", "walk"]) assert.ok(api.AVATAR_BASE_TEXTURES[preset.baseVariant][pose].path);
    });
  }
});

test("new game stays unconfirmed and a read does not create a save", () => {
  assert.deepEqual(api.readCharacterSelection(), {
    presetId: "male-1", baseVariant: "boy-a", playerName: "", finalized: false
  });
  api.migrateCharacterAppearance();
  assert.equal(writes, 0);
  assert.equal(api.isCharacterFinalized(), false);
});

test("old saves migrate once for every preset and preserve unrelated progress", () => {
  for (const preset of api.CHARACTER_PRESETS) {
    const original = {
      character: { presetId: preset.id, playerName: "นักตกปลา", finalized: true },
      coins: 1167, records: [["ปลากระบอก", 2.19]],
      equippedFashion: { hat: "straw-hat", outfit: "rain-coat" },
      inventory: { fish: { sample: { count: 3 } }, trash: { can: 2 } },
      quests: { sample: { claimed: true } }, anglerXp: 900
    };
    seed(original);
    const before = writes;
    api.migrateCharacterAppearance();
    // กองปลาที่บันทึกไม่ครบถูกเติมศูนย์ตอนอ่าน (ดู tests/save.test.mjs) จำนวนที่มีอยู่จริงต้องไม่เปลี่ยน
    assert.deepEqual(api.readSaveData(), {
      ...original,
      character: { ...original.character, baseVariant: preset.baseVariant },
      inventory: {
        fish: { sample: { count: 3, totalWeight: 0, bestWeight: 0, totalValue: 0, sexCounts: { male: 0, female: 0 } } },
        trash: { can: 2 }
      }
    });
    api.migrateCharacterAppearance();
    assert.equal(writes, before + 1);
    assert.equal(api.isCharacterFinalized(), true);
    assert.equal(api.getSelectedCharacter().baseVariant, preset.baseVariant);
  }
});

test("saved appearance wins even if the catalog changes later", () => {
  api.finalizeCharacterPreset("female-3", "ใบเฟิร์น");
  const preset = api.CHARACTER_PRESETS.find(p => p.id === "female-3");
  const originalVariant = preset.baseVariant;
  try {
    preset.baseVariant = "girl-d";
    assert.equal(api.getSelectedCharacter().baseVariant, "girl-c");
    api.migrateCharacterAppearance();
    assert.equal(api.readSaveData().character.baseVariant, "girl-c");
    assert.equal(writes, 1);
  } finally { preset.baseVariant = originalVariant; }
});

test("draft selection is allowed, but selection and finalization cannot unlock a confirmed character", () => {
  seed({ coins: 500, character: { presetId: "male-1", playerName: "ทดสอบ", finalized: false } });
  assert.equal(api.selectCharacterPreset("female-4").baseVariant, "girl-d");
  assert.equal(api.readSaveData().character.playerName, "ทดสอบ");
  assert.ok(api.finalizeCharacterPreset("female-4", "  มุก   ทะเล  "));
  const confirmed = storage.get(SAVE_KEY);
  const before = writes;
  assert.equal(api.selectCharacterPreset("male-1"), undefined);
  assert.equal(api.finalizeCharacterPreset("male-1", "ชื่อใหม่"), undefined);
  assert.equal(api.finalizeCharacterPreset("female-4", "มุก ทะเล"), undefined);
  assert.equal(storage.get(SAVE_KEY), confirmed);
  assert.equal(writes, before);
  assert.equal(api.readCharacterSelection().playerName, "มุก ทะเล");
});

test("invalid IDs and blank names never confirm or overwrite a save", () => {
  seed({ coins: 500 });
  assert.equal(api.selectCharacterPreset("unknown"), undefined);
  assert.equal(api.finalizeCharacterPreset("unknown", "ชื่อ"), undefined);
  assert.equal(api.finalizeCharacterPreset("male-1", "   "), undefined);
  assert.equal(writes, 0);
  assert.deepEqual(api.readSaveData(), { coins: 500 });
});

test("invalid, inherited and wrong-gender variants recover without losing valid fields", () => {
  for (const invalid of ["missing", "toString", "__proto__", "boy-a", 123, null, {}]) {
    seed({ coins: 77, character: {
      presetId: "female-4", playerName: "มุก", finalized: true, baseVariant: invalid
    } });
    api.migrateCharacterAppearance();
    assert.equal(api.getSelectedCharacter().baseVariant, "girl-d");
    assert.equal(api.readSaveData().coins, 77);
    assert.equal(api.readCharacterSelection().playerName, "มุก");
    assert.equal(api.isCharacterFinalized(), true);
  }
});

test("unknown preset does not lock the player into an arbitrary fallback identity", () => {
  seed({ coins: 77, character: { presetId: "removed", playerName: "ชื่อเดิม", finalized: true } });
  assert.equal(api.isCharacterFinalized(), false);
  api.migrateCharacterAppearance();
  assert.equal(writes, 0);
  assert.equal(api.readCharacterSelection().playerName, "ชื่อเดิม");
});

test("selected appearance is a copy, not mutable shared catalog data", () => {
  const selected = api.getSelectedCharacter();
  selected.baseVariant = "boy-d";
  assert.equal(api.getSelectedCharacter().baseVariant, "boy-a");
});
