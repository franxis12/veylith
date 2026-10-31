# Ancient Forest MVP

Ancient Forest is the default level in development and production. It reuses the existing controller, touch controls, 62 × 174 collision body and 200-pixel character reference height. No new attacks, puzzles, enemies or persistent progression were added. Existing powers and La puerta del viento are preserved.

## Try the level

Run `npm run dev`, then open the printed URL (normally `http://localhost:5173/`).

1. Move with A/D or arrows. Jump with Space/W/up, or the touch arrows and Jump button. The first low ledge is accessible to Earth; the next ledge and short pit exercise Water's normal jump.
2. After the small pit, collect the Fire gem in the clearing before approaching the tall ledge. Jump from the clearing and press Jump again near the first jump's apex. The ledge rises 280 world pixels above the floor, beyond a single Water or Air jump. Aim for its left edge from the left; its underside is solid.
3. Collect Air near the right edge of the Fire ledge, then cross to the next high platform. As Air, jump right from the elevated launch and **keep Jump held while descending** across the wide gap to the ruins. Jumping from the lower floor is not the intended route. Only a gem pickup changes form in normal play, including in flight; manual controls require development with `?devElements=1`.
4. Collect Earth and then Water among the ruins. Walk past the heavy block, pressure plate, water tank with moving water and the opening/closing mechanical door. These props remain non-solid and have no puzzle logic. Land beside the active portal to complete the level.
5. Falling below the level restores all five gems and restarts at Water's starting position. **R / Reiniciar** restarts at any time; **Volver a jugar** starts a fresh attempt after completion.

The prior puzzle is available at `/?level=puzzle` in both builds. The movement sandbox remains development-only at `/?level=test`, as does the character lab at `/?preview=characters`. Unknown level names open Ancient Forest.

## Modules

- `game/assets/forestAssets.ts`: exact supplied paths, measured dimensions and alpha bounds; 24 selected PNGs, reused across the scene. Only the forest route queues them. A missing required forest texture reports its real filename and blocks startup instead of silently making terrain invisible.
- `game/levels/ancientForest/layout.ts`: 5,888 × 1,100 world, seven solid terrain/platform strips, spawn and exit. The camera retains a logical 1,280 × 720 viewport and follows horizontally with a 180-pixel look-ahead.
- `AncientForest.ts`: assembles modular tiles, independent strip colliders, props and signs. Tiles remain at their original 128-pixel scale. Each strip excludes 16-pixel transparent side margins. Feet contact the rim at source y=24; the first grass tips start at y=8. Platform bottoms end at source y=80, just inside their alpha boundary at 88.
- `ForestBackdrop.ts`: three repeating layers at 0.08 / 0.32 / 0.55 camera speed. Sky and ruins sit behind terrain; the third supplied foliage layer is lowered and kept behind gameplay so it does not conceal pit edges. Viewport-sized repeaters avoid textures as wide as the level. Retina camera-origin compensation preserves the existing DPR cap.
- `ForestState.ts`: spatial hints, grounded exit detection and fall retry, without timers or saved progression. `LevelProgress` publishes only discrete snapshot changes; React renders `ForestHud`. Existing puzzle snapshots remain supported.

MainScene disposes the level on shutdown; Phaser clears its terrain, props, labels and static bodies. Restart does not recreate the game or reload textures. The previous projectile system now checks the actual world's bounds rather than the original 1,280-pixel viewport so existing powers remain usable in the larger level.

## Original resources

The folder `public/assets/environments/ancient_forest` contains **109 PNGs**. All filenames, dimensions, alpha bounds and SHA-256 hashes are recorded in [environment-inventory.json](environment-inventory.json); `used` identifies the 28 loaded environment files (24 static assets, one optional portal frame, three animation sheets). No source PNG was changed, renamed, cropped or resaved.

| Used resources                                                                                                                                       | Source dimensions                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `backgrounds/layer_01_sky_mountains.png`, `layer_02_forest_ruins.png`, `layer_03_foreground.png`                                                     | 2048 × 1024 each                           |
| `terrain/ground_top_left.png`, `ground_center.png`, `ground_top_right.png`, `ground_left_edge.png`, `solid_underground.png`, `ground_right_edge.png` | 128 × 128 each                             |
| `platforms/floating_platform_left.png`, `floating_platform_center.png`, `floating_platform_right.png`                                                | 128 × 128 each                             |
| `decorations/bush_fern.png`, `flowers_blue.png`, `grass_cluster_short.png`                                                                           | 256 × 256; 128 × 192; 128 × 128            |
| `decorations/broken_pillar.png`, `ancient_column.png`, `tree_roots.png`, `mushrooms_amber.png`                                                       | 256 × 512; 256 × 768; 512 × 256; 128 × 160 |
| `interactive/heavy_block.png`, `water_tank_empty.png`                                                                                                | 256 × 256; 512 × 512                       |
| `interactive/mechanical_door_open.png`, `portal_active.png`, `pressure_plate_inactive.png`                                                           | 512 × 768; 512 × 768; 512 × 192            |

Unused resources include alternate terrain corners/bottoms, the combined tilesheet, extra decoration, closed-door/full-tank states, wind/torch/wall art, the torch animation and individual frames. The closing-door strip is pixel-identical to the opening strip in reverse, so its animation reuses the opening texture.

## Limits

- The block cannot yet be pushed, the tank cannot be filled and the door has no puzzle logic. Existing projectiles do not activate them. The portal marks completion without loading another level.
- Platforms have solid tops, sides and undersides. There are no one-way platforms, slopes, checkpoints or moving platforms.
- The supplied backgrounds repeat horizontally; their artwork can reveal a seam. This MVP uses the original images unchanged.
- The 24 environment images add **31.421875 MiB decoded RGBA**. Together with the existing character/effect scope, source textures total approximately **285.297 MiB** including 52 MiB of gem/transformation sheets and 43.5 MiB for animated props, before repeat surfaces, framebuffers and browser copies. Loading is scoped but this is not an iPhone memory certification.
- Web browser checks do not establish native iOS performance, safe-area behavior or device reliability. No native configuration was changed. Run `npm run cap:sync` before opening the latest level in Xcode; physical-device validation remains necessary.

## Validation completed

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test` (125 tests across 21 files) and `npm run build` passed.
- Chrome exercised a continuous route with real Phaser Arcade physics: both Water ledges, the short pit, the Fire double jump, the elevated launch, Air glide, ruins and portal completion. Manual restart and actual falling reset to Water at spawn, retaining exactly seven static bodies and reusing the 24 environment textures.
- Browser checks covered real keyboard input, simultaneous native touch points for movement/jump, transformation in flight, touch restart, 852 × 393 at DPR 3 (capped 2560 × 1440 backing), portrait/landscape resize, and three actual React StrictMode mount/unmount cycles. Each mount created one game; each unmount removed its canvas, scenes, player and forest references.
- Production loads the forest and its 24 environment images. The prior puzzle remains playable in production without loading any forest images. No application JavaScript or resource-loading errors were observed in these checks.
- SHA-256 verification confirmed all 384 existing PNGs (275 character/effect + 109 environment) remain unchanged.
- Vite retains the existing large Phaser chunk advisory; the build succeeds. Native compilation, Capacitor synchronization and physical iPhone profiling were not performed for this web-only change.

## Animated props

`forestAnimations.ts` records the measured four-column grids. Door opening has eight 512 × 768 frames in a 2048 × 1536 sheet. Portal energy has twelve 512 × 768 frames in a 2048 × 2304 sheet; water has twelve 512 × 512 frames in a 2048 × 1536 sheet. Every row-major cell was checked against the individual PNG. The eight supplied door closing frames exactly match the opening frames in reverse, saving a duplicate 12 MiB upload. The audit and original SHA-256 hashes are in [forest-animation-inventory.json](forest-animation-inventory.json).

`ForestAnimatedProps` places water behind the existing tank shell and energy behind the empty portal frame, preserving their shared full-canvas coordinates, ground anchors and scale. Water and energy loop at 12 fps; the door opens/closes at 10 fps, with additional 1.6-second open and 1-second closed holds. These are cosmetic playback choices. The door has no collision and the tank does not respond to powers. The portal keeps its existing exit rule.

Only the forest queues these textures. Missing or malformed animations preserve the existing static objects; if the empty portal frame fails, the original active portal image is used. Animations run on Phaser game time, pause with the game, and their scene-owned objects are destroyed on restart/unmount. No artwork is resized or rewritten.

Animated-prop validation: 154 tests across 25 files, typecheck, lint, format check and production build passed. Chrome confirmed advancing water/energy frames and the complete door opening/closing cycle, pause/resume, restart, resize and real React unmount/remount. Blocking all optional animation files and the empty portal frame preserved three visible static props and portal completion. All 109 original environment PNG hashes still match the audit. The production build retains the existing Phaser bundle-size advisory.
