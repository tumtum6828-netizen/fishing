import { AVATAR_PREVIEW_MOTION } from "../data/avatarData";
import type { AvatarLayerSet } from "./avatarRenderer";

export type AvatarPreviewController = {
  update: (deltaMs: number) => void;
  setWalking: (walking: boolean) => void;
};

/** Uses the scene's update loop, so closing/rebuilding the preview leaves no running timers. */
export function createAvatarPreview(
  avatar: Pick<AvatarLayerSet, "setPose" | "setOffsetY">,
  baseY: number,
  walking = false
): AvatarPreviewController {
  const { frameMs, bobPeriodMs, bobHeight } = AVATAR_PREVIEW_MOTION;
  let elapsedMs = walking ? frameMs : 0;

  function render(): void {
    avatar.setPose(walking && Math.floor(elapsedMs / frameMs) % 2 === 1 ? "walk" : "idle");
    avatar.setOffsetY(baseY - (walking ? Math.abs(Math.sin(elapsedMs / bobPeriodMs)) * bobHeight : 0));
  }

  render();
  return {
    update(deltaMs): void {
      if (!walking || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
      elapsedMs += deltaMs;
      render();
    },
    setWalking(nextWalking): void {
      walking = nextWalking;
      elapsedMs = walking ? frameMs : 0;
      render();
    }
  };
}
