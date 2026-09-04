export type BreedingProject = {
  speciesName: string;
  startedAtWorldMinute: number;
  readyAtWorldMinute: number;
  parentWeightEach: number;
  parentValueEach: number;
};

export type BreedingData = {
  xp: number;
  completedCount: number;
  claimedRewardLevels: number[];
  project?: BreedingProject;
};
