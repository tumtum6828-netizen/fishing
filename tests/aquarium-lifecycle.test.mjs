import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/services/aquarium.ts";
      export * from "./src/services/inventory.ts";
      export * from "./src/services/save.ts";
      export * from "./src/data/aquariumData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

const SAVE_KEY = "aquatic-adventure-save-v1";
const MACKEREL = "ปลาทู";
const MULLET = "ปลากระบอก";
const BARRAMUNDI = "ปลากะพงขาว";
const LEGENDARY = "ปลากระโทงดาบ";
const WEIGHT_TOLERANCE = 1e-9;

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
const rawSave = () => storage.get(SAVE_KEY) ?? "{}";

/** ทรัพยากรและบันทึกที่การย้ายปลาเข้าออกตู้ต้องไม่แตะเลย */
function untouchedFields(save = api.readSaveData()) {
  return {
    coins: save.coins,
    conservationPoints: save.conservationPoints,
    anglerXp: save.anglerXp,
    collectionCount: save.collectionCount,
    discoveredSpecies: save.discoveredSpecies,
    speciesLog: save.speciesLog,
    claimedHabitatRewards: save.claimedHabitatRewards,
    dailyQuests: save.dailyQuests
  };
}

const stackOf = name => api.readInventory().fish[name];

/** จำนวนตัวทั้งหมดในกระเป๋ารวมกับในตู้ ค่านี้ต้องไม่เปลี่ยนเมื่อแค่ย้ายที่อยู่ */
function totalCreatures() {
  const inBag = Object.values(api.readInventory().fish)
    .reduce((sum, stack) => sum + stack.count, 0);
  return inBag + api.readAquarium().residents.length;
}

/** เลเวลสูงพอให้ตู้มีหกช่อง จึงทดสอบเรื่องอื่นได้โดยไม่ติดความจุ */
const BIG_TANK_SAVE = {
  coins: 500,
  conservationPoints: 20,
  anglerXp: 1000,
  collectionCount: 30,
  discoveredSpecies: [MACKEREL, MULLET],
  speciesLog: { [MACKEREL]: { cells: ["coast:day:clear"], catchCount: 4 } },
  claimedHabitatRewards: [],
  worldDay: 3,
  worldMinutes: 600,
  inventory: {
    fish: {
      [MACKEREL]: {
        count: 3, totalWeight: 3.6, bestWeight: 1.5, totalValue: 90,
        sexCounts: { male: 1, female: 2 }
      },
      [MULLET]: {
        count: 1, totalWeight: .8, bestWeight: .8, totalValue: 25,
        sexCounts: { male: 1, female: 0 }
      }
    },
    trash: { "กระป๋องเก่า": 2 }
  }
};

test("putting one fish in the tank moves it, and moves nothing else", () => {
  seed(BIG_TANK_SAVE);
  const before = untouchedFields();
  const beforeTrash = api.readInventory().trash;
  assert.equal(totalCreatures(), 4);

  const outcome = api.placeFishInAquarium(MACKEREL);
  assert.equal(outcome.ok, true, outcome.message);

  const stack = stackOf(MACKEREL);
  assert.equal(stack.count, 2, "กระเป๋าต้องลดลงหนึ่งตัว");
  assert.equal(stack.totalValue, 60, "มูลค่าต้องลดเท่ากับราคาเฉลี่ยหนึ่งตัว");
  assert.ok(Math.abs(stack.totalWeight - 2.4) < WEIGHT_TOLERANCE, "น้ำหนักต้องลดเท่ากับค่าเฉลี่ยหนึ่งตัว");
  assert.equal(stack.bestWeight, 1.5, "สถิติตัวที่หนักที่สุดไม่เกี่ยวกับการย้ายตู้");
  assert.deepEqual(stack.sexCounts, { male: 1, female: 1 }, "ต้องหักเพศที่ถูกย้ายจริง");

  const residents = api.readAquarium().residents;
  assert.equal(residents.length, 1);
  assert.equal(residents[0].name, MACKEREL);
  assert.equal(residents[0].sex, "female", "ตัวที่ย้ายคือเพศที่หักออกจากกระเป๋า");
  assert.ok(Math.abs(residents[0].weight - 1.2) < WEIGHT_TOLERANCE);
  assert.equal(residents[0].saleValue, 30);

  assert.equal(totalCreatures(), 4, "ย้ายที่อยู่แล้วจำนวนตัวรวมต้องเท่าเดิม");
  assert.deepEqual(untouchedFields(), before, "เหรียญ แต้มอนุรักษ์ XP และสมุดบันทึกต้องไม่ขยับ");
  assert.deepEqual(api.readInventory().trash, beforeTrash, "ขยะในกระเป๋าไม่เกี่ยวกับตู้ปลา");
});

test("the sex taken from the bag is always one the bag actually had", () => {
  seed({
    ...BIG_TANK_SAVE,
    inventory: {
      fish: {
        [MACKEREL]: {
          count: 2, totalWeight: 2, bestWeight: 1.2, totalValue: 40,
          sexCounts: { male: 2, female: 0 }
        }
      },
      trash: {}
    }
  });
  assert.equal(api.placeFishInAquarium(MACKEREL).ok, true);
  assert.deepEqual(stackOf(MACKEREL).sexCounts, { male: 1, female: 0 });
  assert.equal(api.readAquarium().residents[0].sex, "male", "ไม่มีตัวเมียในกระเป๋า จึงหักตัวเมียไม่ได้");
});

test("a species already in the tank is refused, and the save does not change at all", () => {
  seed(BIG_TANK_SAVE);
  api.placeFishInAquarium(MACKEREL);
  const snapshot = rawSave();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal(api.placeFishInAquarium(MACKEREL).ok, false, "ชนิดที่อยู่ในตู้แล้วต้องใส่ซ้ำไม่ได้");
  }
  assert.equal(rawSave(), snapshot, "การกดซ้ำต้องไม่กินปลาในกระเป๋าเพิ่ม");
  assert.equal(stackOf(MACKEREL).count, 2);
  assert.equal(api.readAquarium().residents.length, 1);
});

test("a full tank refuses another fish and leaves the bag alone", () => {
  // เลเวลหนึ่งได้ตู้ช่องเดียว จึงเต็มทันทีหลังใส่ตัวแรก
  seed({ ...BIG_TANK_SAVE, anglerXp: 0, collectionCount: 0 });
  assert.equal(api.getAquariumCapacityForSave(), 1);
  assert.equal(api.placeFishInAquarium(MACKEREL).ok, true);
  const snapshot = rawSave();

  const outcome = api.placeFishInAquarium(MULLET);
  assert.equal(outcome.ok, false, "ตู้เต็มแล้วต้องใส่ไม่ได้");
  assert.match(outcome.message, /เต็ม/);
  assert.equal(rawSave(), snapshot, "คำขอที่ถูกปฏิเสธต้องไม่เขียนเซฟ");
  assert.equal(stackOf(MULLET).count, 1, "ปลาที่ใส่ไม่สำเร็จต้องยังอยู่ในกระเป๋า");
});

test("a legendary fish and an unknown name can never enter the tank", () => {
  seed({
    ...BIG_TANK_SAVE,
    inventory: {
      fish: {
        [LEGENDARY]: {
          count: 1, totalWeight: 40, bestWeight: 40, totalValue: 900,
          sexCounts: { male: 1, female: 0 }
        }
      },
      trash: {}
    }
  });
  const snapshot = rawSave();
  assert.equal(api.placeFishInAquarium(LEGENDARY).ok, false);
  assert.equal(api.placeFishInAquarium("ปลาที่ไม่มีจริง").ok, false);
  assert.equal(rawSave(), snapshot);
});

test("a fish that is not in the bag cannot be conjured into the tank", () => {
  seed({ ...BIG_TANK_SAVE, inventory: { fish: {}, trash: {} } });
  const snapshot = rawSave();
  assert.equal(api.placeFishInAquarium(MACKEREL).ok, false);
  assert.equal(rawSave(), snapshot);
  assert.equal(api.readAquarium().residents.length, 0);
});

test("put then remove returns the bag to exactly where it started", () => {
  seed(BIG_TANK_SAVE);
  const before = api.readInventory();
  const beforeUntouched = untouchedFields();

  assert.equal(api.placeFishInAquarium(MACKEREL).ok, true);
  assert.equal(api.removeFishFromAquarium(MACKEREL).ok, true);

  const after = api.readInventory();
  const restored = after.fish[MACKEREL];
  const original = before.fish[MACKEREL];
  assert.equal(restored.count, original.count, "จำนวนต้องคืนเป๊ะ");
  assert.equal(restored.totalValue, original.totalValue, "มูลค่าต้องคืนเป๊ะ");
  assert.deepEqual(restored.sexCounts, original.sexCounts, "จำนวนแยกเพศต้องคืนเป๊ะ");
  assert.equal(restored.bestWeight, original.bestWeight, "สถิติน้ำหนักสูงสุดต้องไม่หาย");
  assert.ok(Math.abs(restored.totalWeight - original.totalWeight) < WEIGHT_TOLERANCE,
    "น้ำหนักรวมต้องคืนภายในค่าคลาดเคลื่อนทศนิยม");
  assert.deepEqual(after.trash, before.trash);
  assert.equal(api.readAquarium().residents.length, 0);
  assert.deepEqual(untouchedFields(), beforeUntouched);
});

test("the last fish of a stack survives a round trip through the tank", () => {
  seed(BIG_TANK_SAVE);
  assert.equal(api.placeFishInAquarium(MULLET).ok, true);
  assert.equal(stackOf(MULLET), undefined, "กองที่หมดต้องหายไปจากกระเป๋า ไม่ใช่ค้างเป็นศูนย์");
  assert.equal(api.removeFishFromAquarium(MULLET).ok, true);
  const stack = stackOf(MULLET);
  assert.equal(stack.count, 1);
  assert.equal(stack.totalValue, 25);
  assert.equal(stack.bestWeight, .8, "ตัวสุดท้ายกลับมาพร้อมสถิติน้ำหนักเดิม");
  assert.ok(Math.abs(stack.totalWeight - .8) < WEIGHT_TOLERANCE);
  assert.deepEqual(stack.sexCounts, { male: 1, female: 0 });
});

test("many put and remove cycles neither breed nor lose a single fish", () => {
  seed(BIG_TANK_SAVE);
  const before = api.readInventory().fish[MACKEREL];
  for (let cycle = 0; cycle < 12; cycle += 1) {
    assert.equal(api.placeFishInAquarium(MACKEREL).ok, true, `รอบที่ ${cycle} ต้องใส่ได้`);
    assert.equal(api.removeFishFromAquarium(MACKEREL).ok, true, `รอบที่ ${cycle} ต้องนำออกได้`);
  }
  const after = api.readInventory().fish[MACKEREL];
  assert.equal(after.count, before.count, "วนสิบสองรอบแล้วจำนวนต้องเท่าเดิม");
  assert.equal(after.totalValue, before.totalValue);
  assert.deepEqual(after.sexCounts, before.sexCounts);
  assert.ok(Math.abs(after.totalWeight - before.totalWeight) < 1e-6, "น้ำหนักสะสมต้องไม่ไหลออกทีละนิด");
  assert.equal(totalCreatures(), 4);
});

test("pressing remove again after the fish is already out creates nothing", () => {
  seed(BIG_TANK_SAVE);
  api.placeFishInAquarium(MACKEREL);
  assert.equal(api.removeFishFromAquarium(MACKEREL).ok, true);
  const snapshot = rawSave();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(api.removeFishFromAquarium(MACKEREL).ok, false, "ตู้ไม่มีตัวนี้แล้ว ต้องปฏิเสธ");
  }
  assert.equal(rawSave(), snapshot, "การกดนำออกซ้ำต้องไม่เพิ่มปลาในกระเป๋า");
  assert.equal(stackOf(MACKEREL).count, 3);
});

test("a reload sees the fish in the tank and missing from the bag", () => {
  seed(BIG_TANK_SAVE);
  api.placeFishInAquarium(MACKEREL);
  const stored = JSON.parse(rawSave());
  assert.equal(stored.aquarium.residents.length, 1,
    "ตัวปลาต้องถูกเขียนลงเซฟจริง ไม่ใช่อยู่แค่ในหน่วยความจำ");
  assert.equal(stored.inventory.fish[MACKEREL].count, 2);

  // อ่านใหม่จากสตริงเดิมใน localStorage เหมือนเปิดเกมรอบใหม่
  assert.equal(api.readAquarium().residents[0].name, MACKEREL);
  assert.equal(stackOf(MACKEREL).count, 2);

  api.removeFishFromAquarium(MACKEREL);
  const afterRemove = JSON.parse(rawSave());
  assert.deepEqual(afterRemove.aquarium.residents, [], "หลังนำออกแล้วเซฟต้องไม่เหลือตัวในตู้");
  assert.equal(afterRemove.inventory.fish[MACKEREL].count, 3);
});

test("a save with no aquarium at all still works and keeps everything else", () => {
  seed({ coins: 42, anglerXp: 1000, inventory: BIG_TANK_SAVE.inventory, speciesLog: BIG_TANK_SAVE.speciesLog });
  const aquarium = api.readAquarium();
  assert.deepEqual(aquarium.residents, []);
  assert.deepEqual(aquarium.decorationIds, []);
  assert.equal(api.placeFishInAquarium(MACKEREL).ok, true);
  const save = api.readSaveData();
  assert.equal(save.coins, 42, "เซฟรุ่นเก่าที่ไม่มีตู้ปลาต้องไม่สูญเสียข้อมูลอื่น");
  assert.deepEqual(save.speciesLog, BIG_TANK_SAVE.speciesLog);
});

test("junk inside the resident list is dropped without touching the rest of the save", () => {
  seed({
    coins: 777,
    anglerXp: 1000,
    speciesLog: BIG_TANK_SAVE.speciesLog,
    inventory: BIG_TANK_SAVE.inventory,
    aquarium: {
      residents: [
        null,
        { name: 123 },
        { name: "ชนิดที่ไม่มีจริง", weight: 1, saleValue: 5, sex: "male" },
        { name: LEGENDARY, weight: 40, saleValue: 900, sex: "male" },
        { name: MACKEREL, weight: 1.1, saleValue: 30, sex: "female" },
        { name: MACKEREL, weight: 9, saleValue: 90, sex: "male" },
        { name: MULLET, weight: "หนักมาก", saleValue: null, sex: "ไม่ระบุ" }
      ],
      decorationIds: ["water-plants", "water-plants", "ของที่ไม่มีจริง"],
      cleanedAtWorldMinute: "เสีย",
      fedAtWorldMinute: -50
    }
  });
  const aquarium = api.readAquarium();
  assert.deepEqual(aquarium.residents.map(resident => resident.name), [MACKEREL, MULLET],
    "เหลือเฉพาะชนิดที่มีจริง ชนิดละหนึ่งตัว และไม่มีปลาตำนาน");
  assert.equal(aquarium.residents[0].weight, 1.1);
  assert.equal(aquarium.residents[1].weight, 0, "น้ำหนักที่อ่านไม่ออกกลายเป็นศูนย์ ไม่ใช่ NaN");
  assert.equal(aquarium.residents[1].saleValue, 0);
  assert.ok(["male", "female"].includes(aquarium.residents[1].sex),
    "เพศที่อ่านไม่ออกต้องถูกเดาให้เป็นค่าที่ใช้ได้");
  assert.deepEqual(aquarium.decorationIds, ["water-plants"]);
  assert.ok(Number.isFinite(aquarium.cleanedAtWorldMinute));
  assert.ok(Number.isFinite(aquarium.fedAtWorldMinute));

  const save = api.readSaveData();
  assert.equal(save.coins, 777, "เซฟที่ตู้ปลาเสียต้องไม่ทำให้ส่วนอื่นหาย");
  assert.deepEqual(save.speciesLog, BIG_TANK_SAVE.speciesLog);
  assert.equal(save.inventory.fish[MACKEREL].count, 3);
});

test("an aquarium field of the wrong shape entirely cannot crash the tank", () => {
  const wrongShapes = [
    "เสีย",
    42,
    null,
    [],
    { residents: 5 },
    { residents: "ไม่ใช่อาร์เรย์" },
    { residents: [], decorationIds: 7 },
    { residents: {}, decorationIds: "water-plants" }
  ];
  for (const aquarium of wrongShapes) {
    seed({ coins: 900, anglerXp: 1000, inventory: BIG_TANK_SAVE.inventory, aquarium });
    const label = JSON.stringify(aquarium) ?? String(aquarium);
    assert.doesNotThrow(() => api.readAquarium(), `readAquarium ต้องไม่พังกับ ${label}`);
    assert.doesNotThrow(() => api.getAquariumHappiness(), `ค่าความสุขต้องคำนวณได้กับ ${label}`);
    assert.deepEqual(api.readAquarium().residents, [], `${label} ต้องให้ตู้ว่าง`);
    assert.equal(api.readSaveData().coins, 900, `${label} ต้องไม่ทำให้เหรียญหาย`);
    assert.equal(api.placeFishInAquarium(MACKEREL).ok, true, `${label} ต้องยังใส่ปลาใหม่ได้`);
    assert.equal(api.readAquarium().residents.length, 1);
  }
});

test("a resident already in the tank is not replaced by a refused put", () => {
  seed({
    ...BIG_TANK_SAVE,
    anglerXp: 0,
    collectionCount: 0,
    aquarium: {
      residents: [{ name: BARRAMUNDI, weight: 2, saleValue: 60, sex: "male" }],
      decorationIds: [], cleanedAtWorldMinute: 0, fedAtWorldMinute: 0
    }
  });
  assert.equal(api.placeFishInAquarium(MACKEREL).ok, false);
  const residents = api.readAquarium().residents;
  assert.equal(residents.length, 1);
  assert.equal(residents[0].name, BARRAMUNDI, "ตัวที่อยู่ในตู้อยู่แล้วต้องไม่ถูกแทนที่");
});
