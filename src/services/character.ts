import { CHARACTER_PRESETS, DEFAULT_CHARACTER_PRESET_ID } from "../data/characterData";
import { AVATAR_BASE_TEXTURES } from "../data/avatarData";
import type { AvatarBaseVariant } from "../types/avatar";
import type { CharacterPreset, CharacterSelection } from "../types/character";
import { readSaveData, writeSaveData, type SaveData } from "./save";

export function readCharacterSelection(save: SaveData = readSaveData()): CharacterSelection {
  const storedPreset = CHARACTER_PRESETS.find(preset => preset.id === save.character?.presetId);
  const preset = storedPreset
    ?? CHARACTER_PRESETS.find(preset => preset.id === DEFAULT_CHARACTER_PRESET_ID)!;
  const storedVariant = save.character?.baseVariant;
  const validVariant = typeof storedVariant === "string"
    && Object.hasOwn(AVATAR_BASE_TEXTURES, storedVariant)
    && storedVariant.startsWith(preset.gender === "male" ? "boy-" : "girl-");
  return {
    presetId: preset.id,
    baseVariant: validVariant ? storedVariant as AvatarBaseVariant : preset.baseVariant,
    playerName: sanitizePlayerName(save.character?.playerName),
    finalized: Boolean(storedPreset) && save.character?.finalized === true
  };
}

export function getSelectedCharacter(save: SaveData = readSaveData()): CharacterPreset {
  const selection = readCharacterSelection(save);
  const preset = CHARACTER_PRESETS.find(preset => preset.id === selection.presetId) ?? CHARACTER_PRESETS[0];
  return { ...preset, baseVariant: selection.baseVariant ?? preset.baseVariant };
}

/** เติมฐานภาพให้เซฟเก่าเพียงครั้งเดียว โดยคงข้อมูลเกมและรหัสเซฟเดิม */
export function migrateCharacterAppearance(): void {
  const save = readSaveData();
  if (!CHARACTER_PRESETS.some(preset => preset.id === save.character?.presetId)) return;
  const selection = readCharacterSelection(save);
  if (save.character?.baseVariant === selection.baseVariant) return;
  writeSaveData({ character: { ...save.character!, baseVariant: selection.baseVariant } });
}

export function selectCharacterPreset(presetId: string): CharacterPreset | undefined {
  const save = readSaveData();
  if (isCharacterFinalized(save)) return undefined;
  const preset = CHARACTER_PRESETS.find(item => item.id === presetId);
  if (!preset) return undefined;
  writeSaveData({ character: {
    presetId, baseVariant: preset.baseVariant, playerName: readCharacterSelection(save).playerName, finalized: false
  } });
  return preset;
}

export function isCharacterFinalized(save: SaveData = readSaveData()): boolean {
  const selection = readCharacterSelection(save);
  return selection.finalized === true && Boolean(selection.playerName);
}

export function sanitizePlayerName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 16);
}

export function finalizeCharacterPreset(presetId: string, playerName: string): CharacterPreset | undefined {
  if (isCharacterFinalized()) return undefined;
  const preset = CHARACTER_PRESETS.find(item => item.id === presetId);
  const safeName = sanitizePlayerName(playerName);
  if (!preset || !safeName) return undefined;
  writeSaveData({ character: { presetId, baseVariant: preset.baseVariant, playerName: safeName, finalized: true } });
  return preset;
}
