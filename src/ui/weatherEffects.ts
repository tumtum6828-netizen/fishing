import Phaser from "phaser";
import { getTimePeriod, type WorldState } from "../services/worldTime";

export function createWeatherOverlay(
  scene: Phaser.Scene,
  state: WorldState,
  depth = 2
): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const period = getTimePeriod(state.minutes);
  if (period === "evening" || period === "night") {
    objects.push(scene.add.rectangle(640, 360, 1280, 720, 0x17304d, period === "night" ? .24 : .1));
  }
  if (state.weather === "cloudy") {
    objects.push(scene.add.rectangle(640, 360, 1280, 720, 0x526c72, .09));
  } else if (state.weather === "rain") {
    objects.push(scene.add.rectangle(640, 360, 1280, 720, 0x315d70, .13));
    for (let index = 0; index < 34; index += 1) {
      const drop = scene.add.line(
        Phaser.Math.Between(0, 1360), Phaser.Math.Between(-80, 720),
        0, 0, -11, 26, 0xd9f5ff, Phaser.Math.FloatBetween(.2, .48)
      ).setLineWidth(1.4);
      scene.tweens.add({
        targets: drop,
        x: drop.x - 80,
        y: drop.y + 800,
        duration: Phaser.Math.Between(900, 1300),
        delay: Phaser.Math.Between(0, 700),
        repeat: -1
      });
      objects.push(drop);
    }
  }
  return scene.add.container(0, 0, objects).setDepth(depth).setScrollFactor(0);
}
