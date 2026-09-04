export type DailyQuestMetric = "fish_caught" | "trash_collected" | "aquarium_care" | "battle_completed";

export type DailyQuestState = {
  dateKey: string;
  progress: Record<string, number>;
  claimedIds: string[];
  bonusClaimed: boolean;
};

export type DailyQuestDefinition = {
  id: string;
  metric: DailyQuestMetric;
  icon: string;
  title: string;
  description: string;
  goal: number;
  rewardCoins: number;
  rewardXp: number;
  rewardConservation: number;
};
