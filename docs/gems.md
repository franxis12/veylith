# Gem transformations MVP

## Playing

Normal gameplay changes element only by touching a gem. There is no inventory or permanent unlock: the destination element replaces the active one immediately, including same-element pickups. Every gem has an independent level-local ID and disappears until the next attempt. Spawn is collectible immediately; Collect is cosmetic after consumption. Restart, falling and replay restore all gems and the layout's initial element (Water in both existing levels).

Ancient Forest contains five test placements, not new puzzles or traps:

| ID                  | Element | Center (world pixels) |
| ------------------- | ------- | --------------------- |
| forest-water        | Water   | 600, 514              |
| forest-fire         | Fire    | 1920, 560             |
| forest-air          | Air     | 2470, 290             |
| forest-earth        | Earth   | 4410, 560             |
| forest-water-return | Water   | 4950, 560             |

The existing wind-door level gets Air/Earth/Air compatibility pickups without changing its rules. The development sandbox remains empty for manual testing. Open `?devElements=1` (or `?level=test&devElements=1`) in development to restore keyboard 1–4 and touch selectors. Production ignores this flag. The character inspection lab remains independent.

## Motion and consumption

Each pickup calls `PlayablePlayer.transform` without moving the collision body or changing facing or either velocity component. Element-specific running speed, gravity and glide limits apply in the following normal update. There is no pause, teleport, jump impulse or velocity reset from the transformation. The collision rectangle remains 62 × 174 for every form. Pickup overlap is 44 × 80 around the gem center, independent of source transparency.

Fire has one extra jump per flight, including after walking off a ledge. Acquiring Fire in midair grants access to the unused jump, but switching away/back or collecting another Fire gem never refills it. Only grounding refills it. Air can only glide while descending and held; switching to Air cannot create upward velocity. Switching away exits glide. Existing power cooldowns/air dash limits survive changes; no new attacks are implemented.

If multiple gems overlap the player on one frame, they are consumed once in layout order; the final gem determines the active form. IDs must be unique. Level completion suppresses collection. Scene shutdown clears all transient gem visuals and the one active transformation effect.

## Actual supplied assets

Inspected 128 original PNGs: 92 gem files and 36 transformation files. Every file is 8-bit RGBA; exact paths, dimensions and SHA-256 hashes are recorded in [gem-asset-inventory.json](gem-asset-inventory.json). Originals are never rewritten.

- `assets/items/gems/{water,fire,air,earth}/idle/*_gem_idle_spritesheet.png`: 2048 × 256, eight 256 × 256 frames.
- The corresponding `spawn` and `collect` strips: 1536 × 256, six 256 × 256 frames each.
- `assets/effects/transformations/{element}/{element}_transform_spritesheet.png`: 4096 × 512, eight 512 × 512 frames each.

Individual frame PNGs are present but not loaded at runtime. Gem metadata lives in `gemSheets.ts`; transformation paths remain centralized in `effectSheets.ts`. Timing is an MVP playback choice, not supplied metadata: Idle loops at 10 fps, Spawn/Collect run once at 16 fps (375 ms), transformation runs once at 16 fps (500 ms). The destination effect follows the player and never gates movement or collection.

Missing or malformed Spawn/Collect uses Idle when available. If Idle also fails, a colored diamond marks the collectible; collection fades it. Missing or malformed transformation art uses a colored ring around the player. Completion cleanup advances with game time and does not depend on an animation event, browser timer or network response. Character and environment asset policies remain unchanged.

The 12 gem strips add 20 MiB decoded RGBA, and the four transformation strips add 32 MiB. Forest source textures total approximately 241.797 MiB, before browser/GPU overhead. This is measured loading scope, not physical-device profiling; iPhone testing remains pending.

## Validation

Automated tests cover one-time overlaps, distinct IDs of the same form, restoration on new attempts, consumption during Spawn, Spawn → Idle, Collect cleanup, completed-level suppression, destination VFX following, total visual failure, duplicate IDs, original asset hashes/dimensions, production URL gating, normal keyboard/touch controls, direct player position/facing/velocity preservation and repeated airborne transformations without extra jumps.

Final validation: typecheck, lint, 143 tests across 24 files, format check and production build passed. The build retains the existing large-bundle advisory for Phaser. Chrome checks verified all four collected forms, Fire ledge, Air crossing, portal completion, touch/keyboard restart, automatic fall retry, three real React unmount/remount cycles, failed requests for all 16 new sheets, native multitouch with independent release, rotation, and production with the development query flag. Production excludes the manual selector labels and numeric key mappings. The previous puzzle was completed using its three gems with ordinary controls. No physical iPhone or native Xcode validation was performed for this web-only change.
