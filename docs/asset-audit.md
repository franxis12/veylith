# Supplied asset audit

The complete `public/assets` tree contains **275 PNGs: 39 sheets and 236 individual frames**, approximately **74.95 MiB** on disk. There are **29 character sequences (170 frames)** and **10 effect sequences (66 frames)**. All PNGs decoded successfully. Every individual frame is pixel-identical to its corresponding sheet cell. No original image was changed.

All sequences are **one horizontal row**, read left to right, with **zero margin and zero spacing**. Every file is RGBA with transparency; every sheet has alpha values spanning 0–255. Individual PNG filenames and their dimensions, alpha ranges, bounds, sheet comparisons, and SHA-256 hashes are recorded in [asset-inventory.json](asset-inventory.json).

**Playback rates below are recommended starting values**, selected after visual inspection. The source files contain no supplied timing metadata. “Once” holds the final frame unless the development panel selects “Return to idle”.

## Character sequences

| Exact sheet path under public/assets                           | Cell size | Frames | Sheet size | FPS | Playback |
| -------------------------------------------------------------- | --------- | -----: | ---------- | --: | -------- |
| `characters/air/fall/air_fall_spritesheet.png`                 | 512 × 512 |      4 | 2048 × 512 |   8 | loop     |
| `characters/air/glide_loop/air_glide_loop_spritesheet.png`     | 512 × 512 |      6 | 3072 × 512 |   8 | loop     |
| `characters/air/glide_start/air_glide_start_spritesheet.png`   | 512 × 512 |      4 | 2048 × 512 |  10 | once     |
| `characters/air/idle/air_idle_spritesheet.png`                 | 512 × 512 |      8 | 4096 × 512 |   8 | loop     |
| `characters/air/jump/air_jump_spritesheet.png`                 | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/air/land/air_land_spritesheet.png`                 | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/air/run/air_run_spritesheet.png`                   | 512 × 512 |      8 | 4096 × 512 |  12 | loop     |
| `characters/earth/fall/earth_fall_spritesheet.png`             | 512 × 512 |      4 | 2048 × 512 |   8 | loop     |
| `characters/earth/idle/earth_idle_spritesheet.png`             | 512 × 512 |      8 | 4096 × 512 |   8 | loop     |
| `characters/earth/jump/earth_jump_spritesheet.png`             | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/earth/land/earth_land_spritesheet.png`             | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/earth/push_end/earth_push_end_spritesheet.png`     | 512 × 512 |      3 | 1536 × 512 |  10 | once     |
| `characters/earth/push_loop/earth_push_loop_spritesheet.png`   | 512 × 512 |      8 | 4096 × 512 |  10 | loop     |
| `characters/earth/push_start/earth_push_start_spritesheet.png` | 512 × 512 |      4 | 2048 × 512 |  10 | once     |
| `characters/earth/run/earth_run_spritesheet.png`               | 512 × 512 |      8 | 4096 × 512 |  12 | loop     |
| `characters/earth/smash/earth_smash_spritesheet.png`           | 512 × 512 |      8 | 4096 × 512 |  12 | once     |
| `characters/fire/attack/fire_attack_spritesheet.png`           | 512 × 512 |      6 | 3072 × 512 |  12 | once     |
| `characters/fire/double_jump/fire_double_jump_spritesheet.png` | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/fire/fall/fire_fall_spritesheet.png`               | 512 × 512 |      4 | 2048 × 512 |   8 | loop     |
| `characters/fire/idle/fire_idle_spritesheet.png`               | 512 × 512 |      8 | 4096 × 512 |   8 | loop     |
| `characters/fire/jump/fire_jump_spritesheet.png`               | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/fire/land/fire_land_spritesheet.png`               | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/fire/run/fire_run_spritesheet.png`                 | 512 × 512 |      8 | 4096 × 512 |  12 | loop     |
| `characters/water/attack/water_attack_spritesheet.png`         | 512 × 512 |      6 | 3072 × 512 |  12 | once     |
| `characters/water/fall/water_fall_spritesheet.png`             | 512 × 512 |      4 | 2048 × 512 |   8 | loop     |
| `characters/water/idle/water_idle_spritesheet.png`             | 512 × 512 |      8 | 4096 × 512 |   8 | loop     |
| `characters/water/jump/water_jump_spritesheet.png`             | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/water/land/water_land_spritesheet.png`             | 512 × 512 |      5 | 2560 × 512 |  12 | once     |
| `characters/water/run/water_run_spritesheet.png`               | 512 × 512 |      8 | 4096 × 512 |  12 | loop     |

## Effects inspected and integrated

Nine unique sheets are now registered separately from character poses for projectiles, impacts, wind, double jump and short flame residue. The byte-identical `landing_impact` duplicate stays unused; all originals are preserved. See [elemental powers](elemental-powers.md).

| Exact sheet path under public/assets                                | Cell size | Frames | Sheet size | Suggested FPS | Playback |
| ------------------------------------------------------------------- | --------- | -----: | ---------- | ------------: | -------- |
| `characters/air/glide_vfx/air_glide_wind_vfx_spritesheet.png`       | 512 × 512 |      8 | 4096 × 512 |            10 | loop     |
| `vfx/earth/land_impact/earth_land_impact_spritesheet.png`           | 512 × 512 |      6 | 3072 × 512 |            12 | once     |
| `vfx/earth/landing_impact/earth_landing_impact_vfx_spritesheet.png` | 512 × 512 |      6 | 3072 × 512 |            12 | once     |
| `vfx/earth/smash_impact/earth_smash_impact_spritesheet.png`         | 256 × 256 |      8 | 2048 × 256 |            14 | once     |
| `vfx/fire/burning_loop/fire_burning_loop_spritesheet.png`           | 128 × 128 |      6 | 768 × 128  |            10 | loop     |
| `vfx/fire/double_jump/fire_double_jump_vfx_spritesheet.png`         | 512 × 512 |      6 | 3072 × 512 |            12 | once     |
| `vfx/fire/impact/fire_impact_spritesheet.png`                       | 256 × 256 |      8 | 2048 × 256 |            16 | once     |
| `vfx/fire/projectile/fire_projectile_spritesheet.png`               | 256 × 128 |      6 | 1536 × 128 |            12 | loop     |
| `vfx/water/impact/water_impact_spritesheet.png`                     | 256 × 256 |      6 | 1536 × 256 |            16 | once     |
| `vfx/water/projectile/water_projectile_spritesheet.png`             | 256 × 128 |      6 | 1536 × 128 |            12 | loop     |

## Missing files and export observations

- Air and Earth have no `attack` sequence. Neither is registered or offered in the selector. Earth `smash` remains its own animation; it is not renamed to `attack`.
- All other requested common and element-specific character sequences exist. No corrupt PNG, empty character frame, or sheet/frame mismatch was found.
- `characters/air/glide_vfx/` contains wind effects, not an additional character pose.
- The Earth `vfx/earth/land_impact/` and `vfx/earth/landing_impact/` sheets are byte-identical duplicate exports with different filenames. Both were preserved.
- `earth_smash_impact_08.png`, `fire_impact_08.png`, and `water_impact_06.png` are completely transparent final frames, also present in their sheets. These appear to be fade-out endpoints, not decoding failures. They are retained as authored fade-out frames.
- Water attack frames extend close to the right image edge (visible bound reaches x=509 of 512); there is still transparent margin, but future exporters should preserve sufficient room.

## Alignment metadata

All four first idle frames have visible top y=24 and exclusive foot boundary y=479, giving a shared visible height of 455 source pixels. The shoe span is practically identical across elements; its shared center is x=297. `game/config/elements.ts` sets that horizontal anchor and a 180-unit visual height. All elements use the same scale, 180/455. No frame is stretched or individually rescaled.

`characterSheets.ts` records the exclusive bottom of visible alpha (threshold 32/255) for every character frame. The animation controller uses this source-pixel foot anchor as the sprite origin on each animation update. This removes baked vertical offsets, including airborne run frames and jump/fall poses, while the Player position stays fixed. This is an **in-place visual preview**, not a physical jump or a root-motion animation system. Crouches, bent legs, cape movement, and hand extension remain authored pose changes.

Horizontal registration stays at x=297 instead of chasing each silhouette center, which would shift the body when arms or capes extend. Flipping mirrors the off-center origin as well as the image. Switching an element resets to its first idle frame, retaining the world position and facing. The preview box marks the 180-unit reference height and the horizontal line marks the common foot baseline.

## Loading budget

The development character lab (`?preview=characters`) loads 29 character sheets: about **170 MiB of raw RGBA texture pixels**, excluding browser decoding, mipmaps, and renderer overhead. The playable MVP loads **24 character sheets / 146 MiB** plus **nine unique effect sheets / 27.375 MiB** in both development and production. Total: **173.375 MiB** raw RGBA. Character scope adds Water/Fire attack, Earth smash and the three original Earth push sequences to the traversal sheets. Landing uses idle/run; glide starts directly with the loop. Missing optional traversal sheets fall back to idle. The previous integration-only build loaded four idle sheets (32 MiB). See [the current gameplay budget and validation](gameplay-mvp.md); physical iPhone memory profiling is still required. Do not rescale or replace supplied originals as an implicit optimization.

Vite copies all public files, including the separate-frame exports and unused effects, into the output. Their presence in the app bundle does not mean they are all decoded or loaded as textures. A future packaging task may address redundant distribution files without changing the originals.
