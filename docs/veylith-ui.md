# Veylith UI, time and campaign MVP

## Existing project and scope

Real directory: `/Users/francismartinez/Projects/Elements` (not a symbolic link). This directory had no Git repository, so original source files were backed up before editing. React 19 / Phaser 3 / Zustand / Capacitor are retained, without new dependencies. Movement, collisions, powers, gem state, character sheets, world geometry and camera scaling are preserved.

Five new Ancient Forest puzzles are independently selectable for testing (`?level=forest-1` through `forest-5`); fresh saves begin at forest-1. The supplied original forest and wind prototype remain as a separate route: forest starts unlocked and completing it at any rating unlocks the wind prototype. URL selection cannot skip that legacy unlock. See [new puzzle targets and behavior](forest-puzzles.md). `?level=test` and `?preview=characters` remain development tools. Gameplay no longer exposes manual element controls even with `?devElements=1`; the character lab is a separate animation inspection tool.

## Supplied assets

The integration manifest is `src/components/ui/assets.ts`. All paths were checked against disk and representative PNGs were inspected visually, including transparency and actual dimensions. The legacy filename `logo/elements_logo.png` contains the Veylith logo.

| Interface       | Existing artwork under `public/assets/ui/`                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main menu       | `backgrounds/main_menu_background.png`, `logo/elements_logo.png`, `logo/elemental_crystal_arrangement.png`, primary/secondary buttons                           |
| Level selection | `backgrounds/level_map_background.png`, `level-select/level_node_current.png`, `level_node_locked.png`, `level_node_completed.png`                              |
| Pause           | `panels/pause_panel.png`, primary, retry, level-selection and main-menu buttons                                                                                 |
| HUD             | `hud/timer_hud_frame.png`, `current_element_indicator_frame.png`, `hud_coin_icon.png`, movement, ability, jump, pause and restart buttons with pressed variants |
| Completion      | `panels/level_completed_panel.png`, `victory/star_filled.png`, `star_empty.png`, `rewards/coin_reward_display_frame.png`, next/retry/navigation buttons         |

Button text is real HTML; no asset names or animation metadata are invented. Asset-backed buttons and level nodes have transparent backgrounds; their PNGs supply all visible borders and fills. Missing optional images retain readable text with no blocking loader. Victory now plays the original star-unlock, record, coin-spin and reward-sparkle strips, plus the supplied victory glow. Earned stars also reveal on level selection. Animations are finite, respect reduced motion, and never control reward commits or navigation. No source asset is changed or regenerated. UI source textures load only when used by their screen.

The pause dialog uses only the supplied PNG for its visible frame and background. Its title, time and controls stay inside the inner rim; short viewports and larger text scroll the content area while the artwork stays fixed. The outer dialog has no extra colored rectangle. This layout is scoped to pause; the completion panel retains its existing presentation.

## Time and rewards

The run clock uses monotonic `performance.now()` intervals while the scene is ready and active. It starts after scene construction, excludes loading, pauses on manual pause, blur or app inactivity, and freezes on completion. Foreground return opens/retains pause until the player resumes. The 100 ms React display cadence does not reduce stored time precision. Pausing preserves position, collected gems, gate timer, powers and current element. Restart and automatic fall retry start a fresh attempt at zero.

| Existing level         | Three stars | Two stars | One star              |
| ---------------------- | ----------- | --------- | --------------------- |
| Bosque de los Orígenes | ≤ 60 s      | ≤ 100 s   | Any slower completion |
| La puerta del viento   | ≤ 20 s      | ≤ 40 s    | Any slower completion |

Targets and total rewards are editable per level in `game/levels/catalog.ts`. Initial total rewards are 30 / 60 / 100 coins. Example: 1 star gives 30, replaying gives 0, improving to 2 stars gives 30 more, then 3 stars gives 40 more. Skipping directly from 1 to 3 gives 70 more. Best time is independent of the current attempt's rating; worse attempts cannot reduce saved records. A completed run latches its reward once. Editor-placed coins add a separate optional reward: each saved coin ID pays only on its first successful collection. Unknown/disabled IDs cannot pay. The HUD distinguishes saved balance from the current attempt’s collected value; a retry or failed run discards unbanked pickups.

## Persistence and continuation

`veylith.progress`, version 1, stores the best time, best stars and total coins already awarded per level, optional banked pickup IDs/values, the wallet and last selected/next unlocked level. Old v1 saves without pickup entries remain valid. The codec checks finite nonnegative times, integer rewards, valid ratings, aggregate currency and progression. Save failures keep the session playable and display a warning. Damaged data is preserved under `.recovery`. Future versions are not overwritten.

Pause → Continue resumes the current attempt. Menu → Continue and an app reload start the remembered level from the beginning. Physics positions, current gem pickups and partial-attempt time are intentionally not serialized. Local storage is specific to the browser origin/app install, can be cleared by the device, and is not cloud sync. Simultaneous tabs do not merge results; use one active game tab.

## Validation

See the completion report for final command output and browser checks. Tests include clock lifecycle, exact rating boundaries, reward upgrades/replays, unlock enforcement, malformed/future/denied storage, React navigation and StrictMode, input holds, native foreground/manual pause composition, and the prior movement/powers/gems suite.

Browser checks use actual Chrome and Phaser. Completion verification positions the player at the existing exit to exercise its collision-to-result integration; it is not a full manual playthrough or a difficulty-balancing pass. Touch safe areas, native app lifecycle and existing texture memory costs still need profiling on a physical iPhone. Xcode and simulator/device validation depend on the installed native toolchain.

## Victory animation audit

The four used strips were checked cell-by-cell against their original numbered PNGs. Each cell is 256 × 256: `star_unlock`, `time_record_celebration` and `coin_reward_sparkle` have six horizontal cells (1536 × 256); `coin_spin` has eight (2048 × 256). No exported timing metadata is supplied. The UI chooses 600/750/650/840 ms respectively, staggering earned stars by 320 ms. Empty stars remain empty. Record effects play only for a new best time, coin effects only for a positive reward.

CSS advances the loaded strip without per-frame React state. Image-load state prevents a strip from finishing before it appears; end/error events return to static art. Missing effects disappear without blocking the result; missing star animations use the static earned star. Reduced-motion preference presents the final static result immediately. Leaving the screen removes playback with the DOM; replaying a level mounts a fresh celebration. Animation completion does not award coins, change progression, unpause Phaser or disable any button. Original PNGs remain untouched.

## Earth selection map

The level menu now shows exactly the ten canonical Earth levels. Smaller markers sit flat over measured clearings in the supplied `level_map_background.png`; marker art, numbers and captions have no added shadows. The original images are unchanged. The historical prototypes remain in the catalog and retain their saved data/routes, but have no entries on this menu.

`LEVEL_MAP_POINTS` places the ten IDs in the preserved campaign order. A proportional 16:9 scene contains both artwork and markers; it pans on smaller screens instead of cropping the artwork independently or moving nodes onto trees/water. Portrait starts near the remembered Earth level. Keyboard focus brings the marker into view. Each button retains a minimum 44-pixel target, title, earned stars and accessible description with its best time and star thresholds; mouse/keyboard focus also reveals those details. A tap still starts that level directly. Neither layout nor browsing writes rewards or completion records.
