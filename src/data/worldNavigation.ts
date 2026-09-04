export type NavPoint = readonly [number, number];

type NavRectangle = Readonly<{ x: number; y: number; width: number; height: number }>;
type NavCircle = Readonly<{ x: number; y: number; radius: number }>;

export type NavigationMap = Readonly<{
  walkable: readonly (readonly NavPoint[])[];
  blockedPolygons?: readonly (readonly NavPoint[])[];
  blockedRectangles?: readonly NavRectangle[];
  blockedCircles?: readonly NavCircle[];
}>;

export const COAST_NAVIGATION: NavigationMap = {
  walkable: [
    [
      [175, 105], [745, 92], [815, 60], [860, 0], [970, 0],
      [900, 120], [820, 210], [745, 285], [700, 350], [718, 430],
      [752, 510], [812, 575], [925, 645], [1050, 700], [175, 700]
    ],
    // สะพานท่าเรือเป็นพื้นเดินได้ แม้อยู่เหนือพื้นที่น้ำ
    [[690, 337], [1148, 266], [1212, 326], [1180, 397], [730, 452], [683, 410]]
  ],
  blockedPolygons: [
    // ตัวบ้านด้านบนและกระท่อมด้านซ้ายล่าง
    [[118, 0], [480, 0], [470, 175], [405, 215], [135, 205]],
    [[45, 305], [340, 305], [365, 480], [285, 535], [52, 505]],
    // แนวรั้วกลางฉาก แบ่งเป็นช่วงเพื่อเว้นช่องทางเดิน
    [[205, 326], [368, 273], [380, 299], [218, 354]],
    [[486, 234], [610, 190], [620, 218], [478, 266]],
    // แนวรั้วและพุ่มไม้ขอบล่าง
    [[335, 650], [720, 632], [790, 720], [300, 720]]
  ],
  blockedRectangles: [
    { x: 505, y: 125, width: 110, height: 98 }
  ],
  blockedCircles: [
    { x: 112, y: 260, radius: 65 },
    { x: 328, y: 302, radius: 34 },
    { x: 615, y: 226, radius: 34 },
    { x: 305, y: 568, radius: 50 },
    { x: 390, y: 625, radius: 42 },
    { x: 500, y: 650, radius: 48 },
    { x: 615, y: 660, radius: 52 }
  ]
};

export const RIVER_NAVIGATION: NavigationMap = {
  walkable: [
    // ลานกลางและทางลงหมู่บ้าน
    [
      [438, 342], [520, 292], [690, 230], [835, 255], [945, 315],
      [972, 375], [925, 455], [925, 535], [850, 645], [735, 705],
      [300, 705], [160, 625], [112, 530], [160, 442], [285, 380], [365, 365]
    ],
    // ทางซ้ายขึ้นน้ำตก
    [[72, 0], [260, 0], [285, 145], [250, 245], [305, 315], [215, 350], [92, 285], [70, 150]],
    // สะพานไม้เชื่อมทางซ้ายกับลานกลาง
    [[132, 190], [495, 278], [474, 365], [116, 284]],
    // ทางลาดปลายสะพาน เชื่อมสะพานกับลานโดยไม่เหลือรอยต่อ
    [[418, 294], [535, 277], [548, 378], [414, 390]],
    // ท่าน้ำด้านขวา
    [[858, 330], [1028, 342], [1038, 416], [870, 444]]
  ],
  blockedPolygons: [
    // แนวรั้วบนทางฝั่งซ้าย
    [[70, 85], [178, 55], [185, 78], [78, 111]],
    [[72, 205], [178, 170], [185, 194], [79, 232]],
    // แนวก้อนหินริมลานซึ่งยังอยู่ภายในเส้นพื้นที่กว้าง
    [[235, 370], [355, 322], [380, 352], [265, 405]]
  ],
  blockedCircles: [
    { x: 145, y: 325, radius: 45 },
    { x: 335, y: 340, radius: 36 },
    { x: 770, y: 290, radius: 40 },
    { x: 170, y: 505, radius: 55 },
    { x: 825, y: 625, radius: 48 }
  ]
};

function pointInPolygon(x: number, y: number, polygon: readonly NavPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[previous];
    const crosses = (y1 > y) !== (y2 > y)
      && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1;
    if (crosses) inside = !inside;
  }
  return inside;
}

function isWalkablePoint(x: number, y: number, map: NavigationMap): boolean {
  if (!map.walkable.some(zone => pointInPolygon(x, y, zone))) return false;
  if (map.blockedPolygons?.some(polygon => pointInPolygon(x, y, polygon))) return false;
  if (map.blockedRectangles?.some(rectangle =>
    x >= rectangle.x && x <= rectangle.x + rectangle.width
    && y >= rectangle.y && y <= rectangle.y + rectangle.height
  )) return false;
  return !map.blockedCircles?.some(circle =>
    (x - circle.x) ** 2 + (y - circle.y) ** 2 <= circle.radius ** 2
  );
}

function canStand(x: number, y: number, map: NavigationMap): boolean {
  const footSamples: readonly NavPoint[] = [[0, 0], [-15, 0], [15, 0], [0, -7], [0, 7]];
  return footSamples.every(([offsetX, offsetY]) => isWalkablePoint(x + offsetX, y + offsetY, map));
}

export function moveOnNavigationMap(
  x: number,
  y: number,
  deltaX: number,
  deltaY: number,
  map: NavigationMap
): { x: number; y: number; moved: boolean } {
  let nextX = x;
  let nextY = y;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 5));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;

  for (let index = 0; index < steps; index += 1) {
    if (canStand(nextX + stepX, nextY + stepY, map)) {
      nextX += stepX;
      nextY += stepY;
      continue;
    }
    // ทดสอบแยกแกนเพื่อให้ตัวละครไถลไปตามขอบสิ่งกีดขวางอย่างเป็นธรรมชาติ
    if (canStand(nextX + stepX, nextY, map)) nextX += stepX;
    if (canStand(nextX, nextY + stepY, map)) nextY += stepY;
  }

  return { x: nextX, y: nextY, moved: nextX !== x || nextY !== y };
}
