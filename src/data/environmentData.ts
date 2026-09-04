export type WeatherId = "clear" | "cloudy" | "rain";
export type TimePeriod = "morning" | "day" | "evening" | "night";

export const WEATHER_INFO: Record<WeatherId, { icon: string; label: string }> = {
  clear: { icon: "☀️", label: "ฟ้าโปร่ง" },
  cloudy: { icon: "☁️", label: "เมฆมาก" },
  rain: { icon: "🌧️", label: "ฝนตก" }
};

export const TIME_INFO: Record<TimePeriod, { label: string }> = {
  morning: { label: "เช้า" },
  day: { label: "กลางวัน" },
  evening: { label: "เย็น" },
  night: { label: "กลางคืน" }
};

export const FISH_ENVIRONMENT_WEIGHTS: Record<string, {
  biomes: Array<"coast" | "river">;
  time: Record<TimePeriod, number>;
  weather: Record<WeatherId, number>;
}> = {
  "ปลากระบอก": {
    biomes: ["coast", "river"],
    time: { morning: 1.5, day: 1.2, evening: .9, night: .6 },
    weather: { clear: 1.15, cloudy: 1, rain: .85 }
  },
  "ปลากะพงขาว": {
    biomes: ["coast", "river"],
    time: { morning: .9, day: .8, evening: 1.5, night: 1.35 },
    weather: { clear: .85, cloudy: 1.2, rain: 1.55 }
  },
  "ปลาทู": {
    biomes: ["coast"],
    time: { morning: 1.7, day: 1.1, evening: .7, night: .45 },
    weather: { clear: 1.3, cloudy: 1, rain: .6 }
  },
  "กุ้งก้ามกราม": {
    biomes: ["river"],
    time: { morning: 1, day: .85, evening: 1.35, night: 1.5 },
    weather: { clear: .9, cloudy: 1.15, rain: 1.25 }
  },
  "ปูม้า": {
    biomes: ["coast"],
    time: { morning: .8, day: .9, evening: 1.35, night: 1.5 },
    weather: { clear: 1, cloudy: 1.15, rain: .85 }
  },
  "หอยแครง": {
    biomes: ["coast"],
    time: { morning: 1, day: 1, evening: 1, night: 1 },
    weather: { clear: 1, cloudy: 1, rain: 1.1 }
  },
  "หอยกาบเอเชีย": {
    biomes: ["river"],
    time: { morning: 1, day: 1, evening: 1, night: 1 },
    weather: { clear: 1, cloudy: 1, rain: 1.05 }
  }
};
