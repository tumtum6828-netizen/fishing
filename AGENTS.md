# Fishing Game Project Instructions

These instructions apply to the entire repository unless a deeper `AGENTS.md` overrides them.

## Project handoff

- For continuing work, read `START_HERE.md` and `docs/HANDOFF.md`; consult `docs/GAME_PLAN.md` for the agreed product direction.
- After substantive work, update `docs/HANDOFF.md` with the actual changes, verification, remaining issues, and next step. Keep it concise; do not label untested work as verified.

## Project facts

- Engine: Phaser 3.90.
- Language: TypeScript.
- Build tool: Vite.
- Target: mobile web in landscape orientation.
- Design resolution: 1280×720, scaled responsively.
- Primary UI language: Thai.
- Build verification: `npm run build`.
- Save key: `aquatic-adventure-save-v1`.
- Current art is prototype art; preserve gameplay behavior when replacing it.

## Work protocol

1. Inspect the relevant code and current working-tree changes before editing.
2. Make the smallest safe change that completes the request.
3. Preserve user changes and unrelated files.
4. Do not perform opportunistic refactors.
5. Run `npm run build` after code changes.
6. Review the final diff for debug code, accidental changes, and generated noise.
7. Report the outcome, verification result, and any remaining risk concisely.

Do not print model recommendations or stop work merely because a different model might be preferable. Escalate reasoning only when the task genuinely involves architecture, persistence compatibility, subtle timing, or a failed focused attempt.

## Model and reasoning router

Classify code tasks internally before editing. Choose the smallest capable model and lowest reliable reasoning effort.

| Work | Preferred route |
|---|---|
| Exact text, rename, tiny number or spacing change | SPARK low when available; otherwise LUNA low |
| Mechanical cleanup, repetitive edits, small isolated fix | LUNA low |
| Small UI behavior or localized bug | LUNA medium |
| Normal gameplay feature, menu, interaction, or data wiring | TERRA medium |
| Multi-scene gameplay, inventory, quests, fish AI, or interacting systems | TERRA high |
| Architecture, save-schema design, core fishing state machine, difficult timing bug | SOL high |
| Repository-wide refactor, migration, or unresolved high-impact bug | SOL xhigh |

- The effort name is `low`, not `light`. Current supported effort names may also include `none`, `medium`, `high`, `xhigh`, and `max`.
- If SPARK is unavailable, fall back to LUNA low.
- Do not use SOL merely because it is available.
- Do not use `max` for routine work. Reserve it for an exceptional unresolved problem after focused lower-effort attempts.
- Do not interrupt or block routine work to request a switch. Continue with the current capable model.
- Mention a model switch in one short line only when the current choice is materially wasteful or materially increases correctness risk.
- A repository instruction cannot switch the active root model by itself; it can only recommend the route.

## Architecture

- Keep gameplay rules separate from presentation, input, persistence, and platform services.
- Use explicit state transitions for casting, waiting, hooking, fighting, escaping, catching, and menus.
- Put tunable gameplay values in centralized data/configuration rather than scattering constants.
- Avoid adding major systems directly to `src/main.ts`.
- New scenes belong under `src/scenes/`.
- Fish, rod, species, rarity, and balancing data belong under `src/data/`.
- Save/load code belongs under `src/services/`.
- Shared types belong under `src/types/`.
- Reusable UI and drawing helpers belong under `src/ui/`.
- Do not introduce another framework or engine without approval.
- Use delta time for time-based gameplay; frame-rate-dependent behavior is a bug.
- Clean up timers, listeners, and transient UI when restarting or changing scenes.

## Product boundaries

- `FishingScene` contains only casting, waiting, reeling, catch/escape feedback, and essential controls.
- Encyclopedia, collection, equipment, quests, shops, and breeding use separate scenes.
- The fishing HUD should show only information needed during the current interaction.
- Rod level limits the fish pool before rarity selection; weak rods cannot roll high-tier or legendary fish.
- A legendary fish remains unidentified during the fight. Reveal its identity only after a successful catch.
- Educational facts must distinguish real information from fictional gameplay behavior.
- Endangered species should reward research, photography, or release rather than high sale value.

## Fishing-system verification

For casting, fish AI, tension, stamina, line distance, catch resolution, rods, rewards, or save changes, verify:

- valid transitions between ready, casting, waiting, fighting, caught, escaped, retry, and scene exit;
- press, hold, release, interrupted input, and retry behavior;
- tension, stamina, and distance stay within valid bounds;
- each catch grants at most one result and one reward;
- rod restrictions are applied before fish selection;
- legendary identity remains hidden until catch success;
- timers and temporary UI do not survive restart or scene change;
- save data remains compatible or includes an explicit migration.

## Save rules

- Keep save identifiers stable.
- New fields must have safe defaults when loading older saves.
- Never discard a damaged save silently if recovery of valid fields is practical.
- Do not change the save key or make a breaking schema change without approval.

## Safety and scope

- Do not commit, push, publish, deploy, delete assets, or rewrite history unless explicitly requested.
- Do not change dependencies or lockfiles unless the requested work requires it.
- Do not suppress errors or weaken checks to make a build pass.
- Do not claim completion without running available verification.
- Keep user-facing updates and final responses concise and outcome-first.
