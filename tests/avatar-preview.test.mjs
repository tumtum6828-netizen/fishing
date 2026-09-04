import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: `export * from "./src/ui/avatarPreview.ts";
      export * from "./src/ui/avatarRenderer.ts";
      export * from "./src/data/avatarData.ts";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts"
  },
  bundle: true, platform: "node", format: "esm", write: false
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);

function mockAvatar() {
  return { pose: null, y: null, setPose(pose) { this.pose = pose; }, setOffsetY(y) { this.y = y; } };
}

test("standing remains still and walking starts on the walking frame", () => {
  const avatar = mockAvatar();
  const preview = api.createAvatarPreview(avatar, 374);
  assert.equal(avatar.pose, "idle");
  assert.equal(avatar.y, 374);
  preview.update(1000);
  assert.equal(avatar.y, 374);
  preview.setWalking(true);
  assert.equal(avatar.pose, "walk");
  preview.update(api.AVATAR_PREVIEW_MOTION.frameMs);
  assert.equal(avatar.pose, "idle");
  preview.update(api.AVATAR_PREVIEW_MOTION.frameMs);
  assert.equal(avatar.pose, "walk");
});

test("stopping immediately resets pose and position without needing another frame", () => {
  const avatar = mockAvatar();
  const preview = api.createAvatarPreview(avatar, 374, true);
  preview.update(250);
  preview.setWalking(false);
  assert.equal(avatar.pose, "idle");
  assert.equal(avatar.y, 374);
  preview.update(5000);
  assert.equal(avatar.y, 374);
});

test("motion uses elapsed time, not frame count, and remains within its bob range", () => {
  const slow = mockAvatar();
  const fast = mockAvatar();
  const a = api.createAvatarPreview(slow, 374, true);
  const b = api.createAvatarPreview(fast, 374, true);
  a.update(660);
  for (let i = 0; i < 60; i++) b.update(11);
  assert.equal(slow.pose, fast.pose);
  assert.equal(slow.y, fast.y);
  for (let i = 0; i < 1000; i++) {
    b.update(16);
    assert.ok(fast.y >= 374 - api.AVATAR_PREVIEW_MOTION.bobHeight && fast.y <= 374);
  }
});

test("invalid time inputs do not corrupt the preview", () => {
  const avatar = mockAvatar();
  const preview = api.createAvatarPreview(avatar, 374, true);
  const original = { pose: avatar.pose, y: avatar.y };
  for (const delta of [0, -5, NaN, Infinity]) preview.update(delta);
  assert.deepEqual({ pose: avatar.pose, y: avatar.y }, original);
});

test("all eight bases and outfit combinations keep their layers aligned while walking", () => {
  for (const variant of Object.keys(api.AVATAR_BASE_TEXTURES)) {
    for (const equipped of [{}, { hat: "straw-hat" }, { outfit: "rain-coat" }, { hat: "straw-hat", outfit: "rain-coat" }]) {
      const images = [];
      // ไฟล์จริง: ตัวละครและเสื้อกันฝนเป็นผืน 1024x1536 ส่วนหมวกเป็นภาพเดี่ยว 1536x1024
      const sourceSize = key => key === "avatar-straw-hat"
        ? { width: 1536, height: 1024 }
        : { width: 1024, height: 1536 };
      const scene = {
        textures: { get: key => ({ getSourceImage: () => sourceSize(key) }) },
        add: { image(x, y, key) {
        const image = {
          x, y, key, visible: true,
          setOrigin() { return this; }, setDisplaySize() { return this; }, setTint() { return this; },
          setVisible(visible) { this.visible = visible; return this; },
          setTexture(key) { this.key = key; return this; }
        };
        images.push(image);
        return image;
      } }
      };
      const avatar = api.createAvatarLayerSet(scene, {
        x: 302, y: 374, width: 200, height: 300, originY: .54,
        gender: variant.startsWith("boy-") ? "male" : "female", baseVariant: variant, equipped
      });
      const preview = api.createAvatarPreview(avatar, 374, true);
      assert.equal(images.length, 1 + Object.keys(equipped).length);
      // ชิ้นที่เกาะจุดยึดย้ายที่ได้เมื่อ "เปลี่ยนท่า" เพราะหัวอยู่คนละตำแหน่ง
      // แต่ภายในท่าเดียวกันต้องล็อกกับตัวละครเสมอ ไม่งั้นจะเห็นเป็นชิ้นลอยไถลระหว่างเด้ง
      const baselines = new Map();
      for (const delta of [16, 165, 165, 400]) {
        preview.update(delta);
        const poseKey = images[0].key;
        if (!baselines.has(poseKey)) {
          baselines.set(poseKey, images.map(image => ({ dy: image.y - images[0].y, x: image.x })));
        }
        const baseline = baselines.get(poseKey);
        images.forEach((image, index) => {
          assert.ok(Math.abs(image.y - images[0].y - baseline[index].dy) < 1e-9,
            `layer ${index} drifted vertically within pose ${poseKey}`);
          assert.equal(image.x, baseline[index].x, `layer ${index} drifted horizontally within pose ${poseKey}`);
          assert.equal(image.visible, true);
        });
      }
      preview.setWalking(false);
      assert.equal(images[0].key, api.AVATAR_BASE_TEXTURES[variant].idle.key);
      assert.equal(images[0].y, 374);
    }
  }
});

test("cosmetic layers keep the real aspect of their source art and are never stretched", () => {
  const sourceSize = key => key === "avatar-straw-hat"
    ? { width: 1536, height: 1024 }
    : { width: 1024, height: 1536 };
  const capture = (baseVariant, gender) => {
    const drawn = [];
    const scene = {
      textures: { get: key => ({ getSourceImage: () => sourceSize(key) }) },
      add: { image(x, y, key) {
        const image = {
          x, y, key,
          setOrigin() { return this; },
          setDisplaySize(w, h) { this.w = w; this.h = h; return this; },
          setTint() { return this; },
          setVisible() { return this; },
          setTexture(next) { this.key = next; return this; }
        };
        drawn.push(image);
        return image;
      } }
    };
    const avatar = api.createAvatarLayerSet(scene, {
      x: 0, y: 0, width: 200, height: 300, originY: 1, gender, baseVariant,
      equipped: { hat: "straw-hat", outfit: "rain-coat" }
    });
    return { drawn, avatar };
  };

  const { drawn } = capture("boy-a", "male");
  for (const key of ["avatar-straw-hat", "avatar-rain-coat"]) {
    const image = drawn.find(item => item.key === key);
    const source = sourceSize(key);
    assert.ok(Math.abs(image.h - image.w * (source.height / source.width)) < 1e-9,
      `${key} stretched: ${image.w}x${image.h}`);
  }

  // หมวกเกาะจุดยึดหัว จึงต้องกว้างและอยู่สูงต่างกันตามฐาน ไม่ใช่ค่าคงที่ค่าเดียวทั้งเกม
  const hatOf = variant => {
    const { drawn: images } = capture(variant, variant.startsWith("boy-") ? "male" : "female");
    return images.find(item => item.key === "avatar-straw-hat");
  };
  const wide = hatOf("girl-a");
  const narrow = hatOf("boy-d");
  assert.ok(wide.w > narrow.w + 10,
    `หมวกควรกว้างตามหัว: girl-a ${wide.w} ควรมากกว่า boy-d ${narrow.w}`);
  assert.ok(narrow.y > wide.y,
    `หมวกควรต่ำลงตามหัวที่เริ่มต่ำกว่า: boy-d ${narrow.y} ควรมากกว่า girl-a ${wide.y}`);

  // girl-c หัวเยื้องซ้ายจากกึ่งกลาง หมวกต้องเยื้องตาม
  const offCentre = hatOf("girl-c");
  const centred = hatOf("girl-d");
  assert.ok(offCentre.x < centred.x, `หมวกต้องเยื้องตามหัว: girl-c ${offCentre.x} ควรน้อยกว่า girl-d ${centred.x}`);
});

test("switching pose re-places anchored layers, because the head moves between poses", () => {
  const drawn = [];
  const scene = {
    textures: { get: () => ({ getSourceImage: () => ({ width: 1536, height: 1024 }) }) },
    add: { image(x, y, key) {
      const image = {
        x, y, key,
        setOrigin() { return this; },
        setDisplaySize(w, h) { this.w = w; this.h = h; return this; },
        setTint() { return this; },
        setVisible() { return this; },
        setTexture(next) { this.key = next; return this; }
      };
      drawn.push(image);
      return image;
    } }
  };
  const avatar = api.createAvatarLayerSet(scene, {
    x: 0, y: 0, width: 200, height: 300, originY: 1,
    gender: "female", baseVariant: "girl-c", equipped: { hat: "straw-hat" }
  });
  const hat = drawn.find(item => item.key === "avatar-straw-hat");
  const idle = { x: hat.x, y: hat.y };
  avatar.setPose("walk");
  const head = api.AVATAR_BASE_TEXTURES["girl-c"];
  assert.notEqual(head.idle.head.cx, head.walk.head.cx);
  assert.notEqual(hat.x, idle.x, "หมวกต้องขยับตามหัวเมื่อเปลี่ยนท่า ไม่ใช่ค้างที่เดิม");
  assert.notEqual(hat.y, idle.y, "หมวกต้องขยับตามหัวเมื่อเปลี่ยนท่า ไม่ใช่ค้างที่เดิม");
});
