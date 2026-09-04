import { getBaitEffect } from "../data/baitData";
import { FISH_ENVIRONMENT_WEIGHTS, type WeatherId } from "../data/environmentData";
import { FISH_PROFILES, LEGENDARY_FISH, RODS, type FishProfile } from "../data/gameData";
import { getTimePeriod } from "./worldTime";

export type CastGrade = "excellent" | "good" | "poor";
export type FishingBiome = "coast" | "river";

type CatchRoll = {
  fish: FishProfile;
  isLegendary: boolean;
};

export function getTrashHookChance(grade: CastGrade, baitId?: string, weather: WeatherId = "clear"): number {
  if (grade !== "poor") return 0;
  const weatherMultiplier = weather === "rain" ? 1.15 : 1;
  return Math.min(.7, .38 * getBaitEffect(baitId).trashChanceMultiplier * weatherMultiplier);
}

export function getBiteWaitMs(baitId?: string, weather: WeatherId = "clear", worldMinutes = 480): number {
  const weatherMultiplier = weather === "rain" ? .86 : weather === "cloudy" ? .94 : 1;
  const nightMultiplier = getTimePeriod(worldMinutes) === "night" ? 1.12 : 1;
  return Math.round(900 * getBaitEffect(baitId).waitTimeMultiplier * weatherMultiplier * nightMultiplier);
}

export function rollCatch(
  rodIndex: number,
  biome: FishingBiome,
  grade: CastGrade,
  baitId: string | undefined,
  luckBonus: number,
  worldMinutes = 480,
  weather: WeatherId = "clear"
): CatchRoll {
  const rod = RODS[Math.max(0, Math.min(rodIndex, RODS.length - 1))];
  const bait = getBaitEffect(baitId);
  // จำกัดชนิดจากระดับคันเบ็ดก่อน แล้วจึงคำนวณแผนที่ คุณภาพ และเหยื่อ
  const candidates = rod.allowedFish.filter(index =>
    FISH_ENVIRONMENT_WEIGHTS[FISH_PROFILES[index].name]?.biomes.includes(biome)
  );
  const safeCandidates = candidates.length > 0 ? candidates : [rod.allowedFish[0] ?? 0];
  const period = getTimePeriod(worldMinutes);
  const legendaryTimeBonus = period === "evening" || period === "night" ? .04 : 0;
  const legendaryWeatherBonus = weather === "cloudy" ? .02 : 0;
  const legendaryChance = Math.min(.4,
    .18 + luckBonus + bait.legendaryChanceBonus + legendaryTimeBonus + legendaryWeatherBonus);
  if (rod.allowsLegendary && grade === "excellent" && Math.random() < legendaryChance) {
    return { fish: LEGENDARY_FISH, isLegendary: true };
  }

  const weighted = safeCandidates.map(index => {
    const fish = FISH_PROFILES[index];
    const commonCatch = fish === FISH_PROFILES[0] || fish.kind === "mollusk";
    const gradeWeight = grade === "excellent" ? (commonCatch ? .65 : 2.25)
      : grade === "good" ? (commonCatch ? 1 : 1.5)
        : commonCatch ? 2.4 : .45;
    const rareBoost = commonCatch ? 1 : 1 + bait.rareWeightBonus + luckBonus * 3;
    const environment = FISH_ENVIRONMENT_WEIGHTS[fish.name];
    const environmentWeight = (environment?.time[period] ?? 1) * (environment?.weather[weather] ?? 1);
    return {
      index,
      weight: Math.max(.01,
        gradeWeight * (bait.speciesWeights[fish.name] ?? 1) * rareBoost * environmentWeight)
    };
  });
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  const selected = weighted.find(entry => {
    roll -= entry.weight;
    return roll <= 0;
  }) ?? weighted[weighted.length - 1];
  return { fish: FISH_PROFILES[selected.index], isLegendary: false };
}
