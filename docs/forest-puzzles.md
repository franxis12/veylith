> Documento histórico de los cinco puzzles originales. La campaña actual de diez niveles, sus nombres, orden, soluciones y validación están en [level-design.md](level-design.md). Los IDs de guardado se conservan; la geometría histórica está archivada en `level-archive/before-earth/` y en los fixtures de regresión. Los diez mapas actuales usan solo Tierra.

# Ancient Forest: five playable puzzles

The existing project is `/Users/francismartinez/Projects/Elements`. The five new levels use React navigation, Phaser Arcade Physics, the existing player/powers/gems/camera, and the existing local progress ledger. No assets or dependencies are created or replaced.

## Access and configuration

From the main menu choose **Selección de niveles → Ancient Forest**. All five entries are available immediately for testing, in development and production. Fresh saves start at the first puzzle. Direct routes are `/?level=forest-1` through `/?level=forest-5`. The original `/?level=forest` traversal and `/?level=puzzle` timed wind prototype remain available; the latter still requires the original traversal completion. Existing version-1 saves and coins are preserved.

| Route      | Level                 | Solution                                                                                                                                                                  | Three / two stars | Total coins at 1 / 2 / 3 stars |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------ |
| `forest-1` | El depósito olvidado  | Start as Water; shoot the tank three times, cross the opened door, enter the portal.                                                                                      | 25 / 50 s         | 30 / 60 / 100                  |
| `forest-2` | La llama perdida      | Collect Fire; hit each of the two torches, in either order; enter the portal.                                                                                             | 35 / 65 s         | 30 / 60 / 100                  |
| `forest-3` | El abismo del viento  | Optional jump for the misleading Earth gem; drop to the lower clearing, collect Air, jump near the edge and hold Jump across the 800-unit gap; land and enter the portal. | 30 / 60 s         | 30 / 60 / 100                  |
| `forest-4` | El peso de la montaña | Collect Earth, walk against the block until it docks on the plate, jump over it, approach the cracked wall and use Power; enter the portal.                               | 40 / 75 s         | 30 / 60 / 100                  |
| `forest-5` | Las cuatro pruebas    | Water tank → Fire and two torches → Air glide and landing → Earth block/plate and wall → combined final gate → portal.                                                    | 75 / 130 s        | 50 / 100 / 150                 |

Layout, spawn, exit, objects, gates, hints and star thresholds: `src/game/levels/data/forest-*.json`. Reward entitlements: `src/game/levels/catalog.ts`. Thresholds are inclusive and configurable. They are initial test values, not device-balanced difficulty targets. There is no time limit or defeat timer. Slower successful attempts still earn one star; repeat rewards only pay improvements.

## What existed and what was added

Before this change, movement, Fire's extra jump, Air's glide/impulse, Earth smash/plunge animation, bounded Water/Fire projectiles, transformations, consumable gems, parallax, timer and rewards worked. Ancient Forest's tank, block, plate and cycling door were decorations. Earth could detect a breakable strike for VFX, but no existing level supplied a destructible wall.

Added behavior:

- Swept projectile contact with tank/torch targets, including the muzzle segment. A nearer enabled wall or door absorbs a shot before a target. Water needs three hits on the tank; Fire needs one hit on each distinct torch. Wrong elements have no effect. Filled tanks and lit torches latch for the attempt.
- Real static door colliders disable only when their listed prerequisites are solved. They are tall enough that Fire/Air cannot jump over the elemental sequence.
- Multiple independent gravity-driven Arcade blocks can be placed in one editor level. Each block can be pushed from either side by grounded Earth only, including off a platform. Its actual collider size comes from the level document. Each collides with terrain, doors, walls, plates and other blocks; supported contact with its assigned plate latches only that block where it landed. A block with an empty plate ID stays movable and works as a step/platform. Losing any block below the fall limit restarts the attempt. The original levels retain their flat solution path; editor levels can use other elevations and sizes. The existing run animation is reused.
- Earth's existing timed fist contact now disables the reached cracked-wall collider and shows the supplied broken-wall art. The strike respects nearer solids and uses the existing Earth impact VFX. This is targeted puzzle-wall destruction, not general destructible terrain or an area damage system.
- A crossing records actual Air gliding over the gap and grounded arrival on the far bank. Returning to the launch bank cancels unfinished crossing credit.
- The existing `LevelProgress` bridge supplies a discrete objective hint/counter to `RunHud`. Phaser retains all positions and mechanism state; Zustand retains only saved/application state.

The original forest traversal retains its cosmetic props. New puzzles use static supplied empty/full, unlit/lit and closed/open images to reflect mechanism state; torch flames are static supplied artwork. Portal energy and power/transformation VFX reuse existing animation sheets. No extra animation sheet is loaded. Eight existing state images add 6.125 MiB of decoded texture pixels: static forest art totals 37.546875 MiB and the full forest gameplay scope is approximately 291.422 MiB before browser/GPU copies and buffers. This is not a physical iPhone memory measurement.

## Solvability and restart

Gems immediately replace the current element and stay consumed until restarting. There is no gameplay element selector. In level five, each replacement lies behind the gate for the preceding challenge, and completed mechanisms never revert. A player who jumps past a needed gem can return to it before the next closed gate.

In level three, the optional Earth gem is above the starting path. The subsequent 280-unit drop exceeds Air's maximum 257-unit upward jump, so the player cannot return to that gem after collecting Air below. Both skipping and taking the trap preserve a solution. The two 800-unit gaps have a conservative margin for Air glide and exceed normal Air jump range. Falling below the level resets the whole attempt automatically.

R, the HUD restart button and pause-menu restart remain available. Restart reconstructs mechanism state, blocks, closed gates, walls, gems, player, effects and clock. Loading and paused/background time are excluded. A grounded arrival at the portal only wins after every objective is solved. Completion freezes the run and awards once through the existing progress service.

## Repeatable validation

Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run format:check`.

`src/tests/forestPuzzles.test.ts` covers every solution/exit guard, missing prerequisites, incorrect elements, hit quotas, both torch orders, block contact/latching, crossing cancellation, gem consumption/reset, conservative flight geometry, gate placement before replacement gems, projectile/strike occlusion, exact rating thresholds, reward idempotence and old saves. Existing movement, input, assets, lifecycle and progress tests are retained.

For the optional real Chromium smoke test, start `npm run dev -- --host 127.0.0.1 --port 5178 --strictPort` and run `node scripts/browser-smoke.js` with an available Playwright package. If Playwright is provided externally, set `PLAYWRIGHT_MODULE` to its package path. `BROWSER_CHANNEL` defaults to `chrome`; `VEYLITH_URL` and `SMOKE_OUTPUT` override the server and evidence directory. No project dependency is added. The harness lives under `scripts/`, is excluded from the production entry, and drives the actual game through `ActionState`; it reads positions to wait for conditions and never teleports, changes elements directly or marks objectives solved.

Remaining validation limits: no physical iPhone/iOS WebView performance run, native Xcode build, or difficulty playtest across different users. Native configuration was not changed. The existing large Phaser bundle advisory remains.

## Editor-placed coins

The editor can now add optional collectible coins to these same documents. They disappear on player overlap and reset with the attempt. A successful campaign run banks each newly collected saved coin ID once, in addition to the existing star reward; retries and unsuccessful runs pay nothing. Values are configurable from 1 to 1000. The five supplied JSON layouts remain unchanged by the implementation, so add coins explicitly in the editor and save to include them in a campaign level. Playtest counts pickups but never changes the saved balance. See [editor instructions](level-editor.md). The existing coin image adds 0.25 MiB of decoded texture storage to the forest scope.

## Stacked blocks

Supported heavy blocks now carry blocks resting on top by their actual horizontal displacement, including towers. Only grounded Earth supplies a deliberate push. Cargo respects walls and falls when it loses support; plate latching remains per block. See [editor setup](level-editor.md#bloques-apilados). This adds no serialized fields or canonical layout changes.
