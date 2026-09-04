import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // เคารพพอร์ตที่ตัวรันภายนอกกำหนดมา ไม่งั้นใช้ 5173 ตามเดิม
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    strictPort: false
  },
  build: {
    rollupOptions: {
      output: {
        // แยก Phaser ที่แทบไม่เปลี่ยนออกจากโค้ดเกม เพื่อให้ผู้เล่นโหลดซ้ำเฉพาะส่วนที่แก้
        manualChunks: { phaser: ["phaser"] }
      }
    },
    chunkSizeWarningLimit: 1600
  }
});
