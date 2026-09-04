import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/ui/paging.ts";
      export * from "./src/data/shopData.ts";
      export * from "./src/data/fashionData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

// ขนาดจริงที่หน้าจอรองรับ: ร้านค้า 2x2, ตู้เสื้อผ้า 3x3
const SHOP_PER_PAGE = 4;
const WARDROBE_PER_PAGE = 9;

test("every item is reachable on exactly one page, at any catalogue size", () => {
  for (const total of [0, 1, 4, 5, 9, 20, 21, 80]) {
    for (const perPage of [SHOP_PER_PAGE, WARDROBE_PER_PAGE]) {
      const items = Array.from({ length: total }, (_, index) => index);
      const seen = [];
      const { pageCount } = api.pageSlice(items, 0, perPage);
      for (let page = 0; page < pageCount; page += 1) {
        seen.push(...api.pageSlice(items, page, perPage).items);
      }
      assert.deepEqual(seen, items,
        `total ${total} ต่อหน้า ${perPage}: ของหายหรือซ้ำ เห็น ${seen.length} จาก ${total}`);
    }
  }
});

test("a page never overflows the space the screen actually has", () => {
  for (const total of [0, 7, 20, 80]) {
    const items = Array.from({ length: total }, (_, index) => index);
    const { pageCount } = api.pageSlice(items, 0, SHOP_PER_PAGE);
    for (let page = 0; page < pageCount; page += 1) {
      assert.ok(api.pageSlice(items, page, SHOP_PER_PAGE).items.length <= SHOP_PER_PAGE);
    }
  }
});

test("an out-of-range page is pulled back instead of showing an empty dead end", () => {
  const items = Array.from({ length: 20 }, (_, index) => index);
  assert.deepEqual(api.pageSlice(items, 99, SHOP_PER_PAGE), { page: 4, pageCount: 5, items: [16, 17, 18, 19] });
  assert.deepEqual(api.pageSlice(items, -3, SHOP_PER_PAGE).page, 0);
  assert.deepEqual(api.pageSlice(items, Number.NaN, SHOP_PER_PAGE).page, 0);
});

test("an empty list still reports one page, so the screen has something to draw", () => {
  assert.deepEqual(api.pageSlice([], 0, SHOP_PER_PAGE), { page: 0, pageCount: 1, items: [] });
});

test("today's real catalogues fit, and the maths still holds when they grow to 20 per slot", () => {
  for (const category of api.SHOP_CATEGORIES) {
    const items = api.SHOP_ITEMS.filter(item => item.category === category.id);
    const { pageCount } = api.pageSlice(items, 0, SHOP_PER_PAGE);
    assert.ok(pageCount >= 1, `หมวด ${category.id} ต้องมีอย่างน้อยหนึ่งหน้า`);
  }
  for (const slot of api.FASHION_SLOTS) {
    const items = api.fashionItemsInSlot(slot.id);
    assert.ok(api.pageSlice(items, 0, WARDROBE_PER_PAGE).items.length <= WARDROBE_PER_PAGE);
  }
  // 20 ชิ้นต่อช่องตามแผน: ร้านค้า 5 หน้า ตู้เสื้อผ้า 3 หน้า ไม่มีชิ้นไหนเข้าไม่ถึง
  const twenty = Array.from({ length: 20 }, (_, index) => index);
  assert.equal(api.pageSlice(twenty, 0, SHOP_PER_PAGE).pageCount, 5);
  assert.equal(api.pageSlice(twenty, 0, WARDROBE_PER_PAGE).pageCount, 3);
});
