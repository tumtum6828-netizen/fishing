export type PageView<T> = {
  /** หน้าที่ใช้ได้จริงหลังบีบให้อยู่ในช่วง */
  page: number;
  pageCount: number;
  items: T[];
};

/**
 * แบ่งรายการเป็นหน้าสำหรับหน้าจอที่มีพื้นที่จำกัด
 * มีไว้เพื่อกันบั๊กที่เคยเกิดจริงทั้งในร้านค้าและตู้เสื้อผ้า:
 * วาดทุกชิ้นเรียงลงไปเรื่อยๆ ชิ้นที่เกินขอบแผงจะมองไม่เห็นและกดไม่ได้
 * `page` ที่เกินช่วงจะถูกบีบกลับ ไม่คืนหน้าว่างให้ผู้เล่นเจอทางตัน
 */
export function pageSlice<T>(items: readonly T[], page: number, perPage: number): PageView<T> {
  const size = Math.max(1, Math.floor(perPage));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(Math.floor(page) || 0, 0), pageCount - 1);
  return {
    page: safePage,
    pageCount,
    items: items.slice(safePage * size, safePage * size + size)
  };
}
