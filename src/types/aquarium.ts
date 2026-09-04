export type AquaticSex = "male" | "female";

export type AquariumResident = {
  name: string;
  weight: number;
  saleValue: number;
  sex: AquaticSex;
};

export type AquariumData = {
  residents: AquariumResident[];
  decorationIds: string[];
  cleanedAtWorldMinute: number;
  fedAtWorldMinute: number;
};
