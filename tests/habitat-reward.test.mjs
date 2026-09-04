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
const COAST = "ปลาทู";          // ชายฝั่งอย่างเดียว 12 ช่อง
const BOTH = "ปลากะพงขาว";       // สองแหล่งน้ำ 24 ช่อง
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
const seed = save => storage.set(SAVE_KEY, JSON.stringify(save));

/** ทุกช่องของชนิดนั้น คำนวณจากแหล่งน้ำจริง ไม่เขียนจำนวนตายตัว */
function everyCell(species) {
  const cells = [];
  for (const biome of api.habitatBiomes(species)) {
    for (const period of api.HABITAT_PERIODS) {
      for (const weather of api.HABITAT_WEATHERS) cells.push(`${biome}:${period}:${weather}`);
    }
  }
  return cells;
}

const completed = (species, rest = {}) => seed({
  coins: 100, conservationPoints: 10, anglerXp: 200,
  speciesLog: { [species]: { cells: everyCell(species), catchCount: 30 } },
  ...rest
});

test("a card that is not full cannot be claimed, and nothing is written", () => {
  seed({ coins: 100, speciesLog: { [COAST]: { cells: ["coast:day:clear"], catchCount: 1 } } });
  assert.equal(api.canClaimHabitatReward(COAST), false);
  const outcome = api.claimHabitatReward(COAST);
  assert.equal(outcome.ok, false);
  assert.equal(read().coins, 100);
  assert.equal(read().claimedHabitatRewards, undefined);
});

test("a full card pays out exactly the defined reward, once", () => {
  completed(COAST);
  assert.equal(api.canClaimHabitatReward(COAST), true);
  const outcome = api.claimHabitatReward(COAST);
  assert.equal(outcome.ok, true);
  const save = read();
  assert.equal(save.coins, 100 + api.HABITAT_COMPLETE_REWARD.coins);
  assert.equal(save.conservationPoints, 10 + api.HABITAT_COMPLETE_REWARD.conservationPoints);
  assert.equal(save.anglerXp, 200 + api.HABITAT_COMPLETE_REWARD.xp);
  assert.deepEqual(save.claimedHabitatRewards, [COAST]);
});

test("claiming twice never pays twice, however many times it is called", () => {
  completed(COAST);
  api.claimHabitatReward(COAST);
  const afterFirst = read();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const outcome = api.claimHabitatReward(COAST);
    assert.equal(outcome.ok, false, "ครั้งที่สองเป็นต้นไปต้องถูกปฏิเสธ");
  }
  assert.deepEqual(read(), afterFirst, "เซฟต้องไม่เปลี่ยนเลยหลังการกดซ้ำ");
  assert.equal(api.canClaimHabitatReward(COAST), false);
  assert.equal(api.isHabitatRewardClaimed(COAST), true);
});

test("each species has its own reward, and claiming one does not consume another", () => {
  seed({
    coins: 0, conservationPoints: 0, anglerXp: 0,
    speciesLog: {
      [COAST]: { cells: everyCell(COAST), catchCount: 30 },
      [BOTH]: { cells: everyCell(BOTH), catchCount: 40 }
    }
  });
  assert.equal(api.claimHabitatReward(COAST).ok, true);
  assert.equal(api.canClaimHabitatReward(BOTH), true, "อีกชนิดต้องยังรับได้");
  assert.equal(api.claimHabitatReward(BOTH).ok, true);
  assert.deepEqual(read().claimedHabitatRewards, [COAST, BOTH]);
  assert.equal(read().coins, api.HABITAT_COMPLETE_REWARD.coins * 2);
});

test("a duplicated name in the save cannot be used to claim again", () => {
  completed(COAST, { claimedHabitatRewards: [COAST, COAST] });
  assert.equal(api.canClaimHabitatReward(COAST), false);
  assert.equal(api.claimHabitatReward(COAST).ok, false);
  assert.deepEqual(api.readClaimedHabitatRewards(), [COAST], "อ่านกลับมาต้องไม่มีชื่อซ้ำ");
});

test("a corrupt claim list is repaired on read without losing the rest of the save", () => {
  seed({ coins: 500, claimedHabitatRewards: [COAST, 7, null, BOTH] });
  const save = api.readSaveData();
  assert.deepEqual(save.claimedHabitatRewards, [COAST, BOTH]);
  assert.equal(save.coins, 500);
  seed({ coins: 500, claimedHabitatRewards: "เสีย" });
  assert.equal(api.readSaveData().claimedHabitatRewards, undefined);
  assert.equal(api.readSaveData().coins, 500);
});

test("an unknown species can never be claimed, so a bad name cannot mint rewards", () => {
  seed({ coins: 100 });
  assert.equal(api.canClaimHabitatReward("ปลาที่ไม่มีจริง"), false);
  assert.equal(api.claimHabitatReward("ปลาที่ไม่มีจริง").ok, false);
  assert.equal(read().coins, 100);
});

test("claiming leaves the journal itself untouched", () => {
  completed(COAST);
  const logBefore = JSON.stringify(read().speciesLog);
  api.claimHabitatReward(COAST);
  assert.equal(JSON.stringify(read().speciesLog), logBefore);
});
