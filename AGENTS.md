# Veylith project rules

## Scope and safety

- Work in this existing Elements directory. Inspect current files before changes; preserve existing functionality and user work.
- Keep code modular, small, focused, and strictly typed. Separate React UI, Phaser world logic, application state, and platform services.
- Preserve the authorized movement, elemental abilities, immediate gem replacement, UI/progression, ten Earth-only Ancient Forest campaign levels and the original prototypes and development visual editor. Additional enemies, damage, shops, monetization and unrelated gameplay require a separate request.
- Never invent missing assets, filenames, animation metadata, or fallback character art. Inspect the user's real assets before writing loaders or registries.
- Do not modify assets unnecessarily. Preserve original artwork and filenames unless the task explicitly requires changes.
- Do not introduce dependencies without a concrete reason. Use npm and keep the lockfile synchronized. Keep Phaser on major version 3 unless a migration is requested.
- Do not add ads, analytics, authentication, backend services, purchases, notifications, or unrelated native plugins without authorization.

## Architecture

- React manages the application interface. Phaser manages the game world. Never use React state for per-frame physics or animation.
- Keep Zustand limited to application/UI preferences and status; gameplay state stays in Phaser.
- Preserve GameCanvas's cancellation, duplicate-instance guard, and teardown behavior. React StrictMode must remain enabled and must not create duplicate games.
- The virtual world is configured in `src/game/config/settings.ts`. Maintain aspect ratio, safe-area handling, bounded pixel density, and landscape support. Phaser 3.90 does not support a renderer `resolution` option; preserve the shared WorldCamera policy.
- Introduce entity/system/level modules when actual functionality needs them. Avoid empty TypeScript placeholders, giant scenes, circular dependencies, and premature abstractions.
- Keep character paths centralized in `game/assets/characterSheets.ts` and effect paths in `game/assets/effectSheets.ts`. The audit and original-file hashes live under `docs/asset-*`. Preserve the measured frame counts, foot anchors, common scale, and mirrored origin compensation; do not normalize every pose to a fixed silhouette height.
- Keep the development character preview UI, preview keyboard adapter, and preview scene excluded from production. Gameplay keyboard/touch controls ship in production and must use `GameInputAction`; never wire device events directly to player movement.
- All-animation preview loading is intentionally development-only. Gameplay loads 24 character sheets (including the requested Earth push start/loop/end) plus existing power/gem/transformation effects; the full 29-sheet lab is available only at `?preview=characters` in development. Keep this budget bounded; physical iPhone profiling of the newly requested effects is still pending.

## Validation and documentation

- Run tests after meaningful changes. Use `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` for changes affecting the application foundation; keep formatting clean with `npm run format:check`.
- Test meaningful behavior and invariants. Avoid tests that only mirror implementation.
- For lifecycle/render changes, verify a real browser mount, resize, and unmount in addition to mocked DOM tests.
- For native changes, run `npm run cap:sync`, inspect the iOS configuration, and build with Xcode when available. Clearly report unavailable native/device validation.
- Keep README and architecture/asset documentation updated with meaningful behavior or workflow changes.
- Keep secrets and signing credentials out of the repository. Do not commit generated web bundles, node_modules, personal Xcode state, or build output.

## Current phase boundary

The ten Earth-only Ancient Forest campaign levels use canonical versioned JSON in `src/game/levels/data/`. Editor and game must consume the same data; do not restore a separate editable TypeScript layout. Preserve level IDs, existing progress v1, coin entitlement rules and configurable star thresholds without a defeat timer. Gem pickups immediately replace the element and remain consumed until restart. Never add manual element selection to gameplay or playtest.

The `/editor` route is a desktop development tool and must remain guarded by `import.meta.env.DEV`; keep editor code and filesystem access out of production/iOS. All writes must be explicit, validated, restricted to the level directory, conflict checked and atomic. Preserve existing files on invalid data or save conflicts. Keep playtest isolated from the editor draft/history and campaign progression.

Rectangular colliders remain independent of visual sizes. Expose only properties supported by actual gameplay; label fixed/unsupported behavior clearly. The current editor supports multiple independent blocks and plates, one wall and one Air crossing per level, with multiple targets, doors and exits. Heavy blocks use real gravity and collider dimensions; never reinstate the old same-height/right-side restriction or a scripted track. Preserve contact-based plate activation, solid collision, Earth-only pushing and full restart if any block is lost. Empty `plateId` means a free block/platform; a plate contact latches only the contacting block, not all blocks referencing that plate. Schema validity does not prove solvability. Preserve restart and test real solution paths after modifying puzzle behavior.

The original forest, wind puzzle, movement sandbox and character lab remain available. Do not modify original assets to resolve cosmetic issues. Read `docs/level-editor.md`, `docs/forest-puzzles.md` and `docs/architecture.md` before extending these systems.

Collectible coins are supported in canonical/editor levels. Preserve attempt-local pickup/reset, optional collection, independent colliders and playtest isolation. Campaign victories bank each saved coin ID once, in addition to the existing star entitlement. Resolve values from the canonical level, preserve prior v1 saves and validate the complete ledger; never mint currency on pickup, retry, failure or preview.
