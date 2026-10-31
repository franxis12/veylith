# Elemental powers MVP

Press **E / Shift / Poder** for the current form's power. Release and press again to cast; holding does not automatically fire. Movement, jumping and transformation stay available during casting. A small bar above the character fills during recharge and disappears when ready.

| Form  | Active power                                                                                 | Existing traversal and effects                                                           | Recharge |
| ----- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Water | Horizontal water projectile, animated splash on solid impact                                 | Normal jump                                                                              | 500 ms   |
| Fire  | Horizontal fireball, explosion and brief flame residue on impact                             | One extra air jump, with its original flame burst                                        | 650 ms   |
| Air   | 180 ms horizontal impulse in the facing direction, at 820 units/s; one impulse per airtime   | High jump (680 launch speed), wind loop while gliding; hold jump or power during descent | 900 ms   |
| Earth | On the ground: smash. In the air: plunge at 1100 units/s until landing, with impact and dust | Low jump, heavy fall; dust on hard landings                                              | 850 ms   |

Air's impulse has normal solid collisions and does not teleport through the gate. Changing forms cancels an active impulse/plunge and power pose, retaining the current vertical momentum under the new form's movement rules. Cooldowns belong to each form and do not reset on transformation. Neither Fire's extra jump nor Air's airborne impulse recharges through switching. Landing replenishes airtime budgets. A fresh attempt resets everything.

Water/Fire projectiles travel at 700 units/s for at most 1400 ms. They collide with enabled level solids, including the closed door; the open door is passable. Collision sweeps cover both the muzzle offset and the whole travel segment to avoid skipping thin walls. Projectiles expire at the world boundary. The new Ancient Forest puzzles connect projectile hits to tanks/torches and the Earth strike to designated cracked walls. There are no enemies, health or general damage systems; fire residue is visual feedback. The Earth impact burst appears only when the fist reaches an enabled solid explicitly marked `breakable: true`, checked at the strike frame. A nearer non-breakable solid blocks the effect. Air punches and ordinary platforms do not produce it; the character can still swing and landing dust remains independent. The new forest levels 4 and 5 supply breakable walls. Their collision is removed only when the timed strike reaches them; the original two prototypes retain their previous behavior. The first puzzle's Earth plate still works by weight.

## Boundaries and lifecycle

`PlayerPowers` owns device-independent cast decisions, recharge, impulse and plunge. `PlayablePlayer` combines those decisions with `PlayerMotor` and retains the fixed collision body and original visual Player. `PowerEffects` owns projectile movement/collisions, bounded temporary effects and the recharge bar. `ActionState` consumes a new one-shot press from the existing `use_ability` action. No device events bypass it.

The scene permits at most **8 projectiles, 16 transient effects and 1 attached wind loop**. Lifetimes and recharge use game delta, so pausing freezes them. Effects stop on expiry, release/transform (wind), scene restart or actual teardown. Completion suppresses new casts and cancels active player impulses/plunges. No new packages, audio, generated artwork or modifications to original PNGs were introduced.

## Asset load and fallbacks

Gameplay loads 21 character sheets (131 MiB raw RGBA): the previous 18 traversal sheets plus Water/Fire attack and Earth smash. Air reuses its traversal pose; no missing Air attack is invented. Nine unique effect sheets add 27.375 MiB, for **30 sheets / 158.375 MiB** total raw texture pixels. The duplicate Earth landing export is preserved but not loaded. The character lab stays at its original 29 sheets / 170 MiB and does not load effects.

`assets/effectSheets.ts` centralizes exact source paths, real cell sizes/counts and playback. Original transparent ending frames are retained. Missing optional character clips fall back to idle; missing effects use simple colored rings/projectiles while mechanics continue. Only essential idle sheets can block startup. On contact with a breakable solid, Earth’s smash burst begins at the extended fist (frame 4), mirrored with facing, and landing dust anchors its measured source baseline (352/512) directly to the resolved foot height. Ground punches do not emit landing dust. This memory count excludes decoder copies, renderer buffers and other browser overhead. Real iPhone profiling remains required.

## Validation

- Strict TypeScript, ESLint, formatting, **117 tests across 19 files**, production build and Capacitor iOS synchronization pass.
- Real Chrome checks cover all four powers, Fire extra-jump flames, Air glide release/transform, both projectile directions, wall/muzzle collision, cooldown/air-budget abuse, completion, pause, repeated casts without object accumulation, and three actual mount/destroy cycles.
- Multitouch movement + jump + power, cancellation and portrait/landscape resizing pass at 667 × 375 / DPR 2 and 852 × 393 / DPR 3. Simulated missing projectile and attack sheets retain functioning powers with visible fallback/idle.
- The full keyboard puzzle solution still works. The development sandbox and character lab remain available. Earth fist offsets were verified in both directions at the strike frame; the dust's visible baseline equals the resolved foot height exactly. Wind is brightened at render time without changing its source.
- Production browser checks pass: 30 requested sheets, keyboard powers, touch fireball/replay, complete puzzle solution, no development UI and no runtime errors.
- Conditional-impact regression tests cover misses, ordinary solids, reachable breakables in both directions, disabled/out-of-range objects, and occlusion by nearer solids.
- SHA-256 comparison confirms all **275 original PNGs** are unchanged. No dependencies were added.

The existing large Phaser chunk advisory remains (approximately 1.23 MB minified / 330 kB gzip). Native compilation, iOS WebView behavior and physical-device performance/memory require full Xcode and an iPhone, which are unavailable in this environment.

For the subsequent five-level integration and its current validation, see [Ancient Forest puzzles](forest-puzzles.md). The validation above records the earlier powers-only milestone.
