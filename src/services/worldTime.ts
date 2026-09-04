import { TIME_INFO, WEATHER_INFO, type TimePeriod, type WeatherId } from "../data/environmentData";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export type WorldState = {
  day: number;
  minutes: number;
  weather: WeatherId;
};

const WEATHER_CYCLE: WeatherId[] = ["clear", "cloudy", "clear", "rain", "cloudy", "clear"];

export function getTimePeriod(minutes: number): TimePeriod {
  const hour = Math.floor(((minutes % 1440) + 1440) % 1440 / 60);
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

export function readWorldState(save: SaveData = readSaveData()): WorldState {
  const day = Number.isFinite(save.worldDay) ? Math.max(1, Math.floor(save.worldDay ?? 1)) : 1;
  const minutes = Number.isFinite(save.worldMinutes)
    ? Math.max(0, Math.min(1439, Math.floor(save.worldMinutes ?? 480)))
    : 480;
  const weather = ["clear", "cloudy", "rain"].includes(save.weather ?? "")
    ? save.weather as WeatherId
    : WEATHER_CYCLE[(day - 1) % WEATHER_CYCLE.length];
  return { day, minutes, weather };
}

export function advanceWorldTime(amount: number): WorldState {
  const current = readWorldState();
  const total = current.minutes + Math.max(0, Math.floor(amount));
  const daysPassed = Math.floor(total / 1440);
  const day = current.day + daysPassed;
  const minutes = total % 1440;
  const weather = daysPassed > 0 ? WEATHER_CYCLE[(day - 1) % WEATHER_CYCLE.length] : current.weather;
  const state = { day, minutes, weather };
  writeSaveData({ worldDay: day, worldMinutes: minutes, weather });
  return state;
}

export function formatWorldClock(state: WorldState): string {
  const hour = Math.floor(state.minutes / 60);
  const minute = state.minutes % 60;
  const period = TIME_INFO[getTimePeriod(state.minutes)].label;
  return `${WEATHER_INFO[state.weather].icon} ${period} • ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function formatFishingEnvironment(state: WorldState, biome: "coast" | "river"): string {
  const location = biome === "coast" ? "ชายฝั่ง" : "ลำธาร";
  return `${location} • วันที่ ${state.day}\n${formatWorldClock(state)}`;
}
