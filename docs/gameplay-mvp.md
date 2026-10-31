# Playable movement MVP

The movement test stage contains a controllable character, solid floor and four ledges, and remains available at `?level=test` in development. The default scene has since become [the first puzzle](first-puzzle.md). Original art and the 29-animation inspection lab are preserved. The validation below records the movement phase; current powers, controls and texture budget are documented in [elemental powers](elemental-powers.md).

## Controls

| Action          | Keyboard                                           | Touch              |
| --------------- | -------------------------------------------------- | ------------------ |
| Move left/right | A/D or left/right arrows                           | Hold arrows        |
| Jump            | Space, W or up arrow                               | Jump               |
| Fire extra jump | Release and press jump again in the air            | Tap Jump again     |
| Air glide       | Hold jump, E or either Shift while descending      | Hold Jump or Glide |
| Transform       | 1 Water, 2 Fire, 3 Air, 4 Earth (numpad supported) | Element buttons    |

Touch supports movement, jumping/gliding and transformation simultaneously. Pointer cancellation, lost capture, blur and backgrounding clear holds. Opposite directions cancel. Holding jump does not auto-jump on landing. Water and Earth have no separate ability-button action in this phase.

Fire has one extra jump per airborne period, including when stepping off a platform or switching to Fire midair. Switching away and back never replenishes a used jump; landing does. Air glides only on descent. Switching to Earth while falling immediately enables its heavier gravity. Transforming never moves the collision body or changes its size.

## Initial tuning

Logical units are world pixels and seconds; constants live in `PlayerMotor.ts`.

| Property              | Water / Fire | Air  | Earth |
| --------------------- | ------------ | ---- | ----- |
| Horizontal speed      | 300          | 300  | 245   |
| Ground jump velocity  | −560         | −680 | −355  |
| Rising gravity        | 900          | 900  | 900   |
| Falling gravity       | 900          | 900  | 2000  |
| Maximum falling speed | 900          | 900  | 1150  |

Air's ground jump is approximately 47% higher than Water/Fire (28% higher than the previous Air tuning), using a stronger launch with the same rising gravity. Gliding behavior is unchanged.

Fire's extra jump velocity is −520. Air glide gravity is 150 with maximum descent of 100. Collision size stays 62 × 174 for every form. Ground is at y=650; ledge tops are y=595, 490, 355 and 235. These values are deliberately easy to adjust after playtesting.

## Animation and memory choices

Gameplay uses 18 existing sheets / 111 frames: idle, run, jump, fall, Fire double_jump and Air glide_loop. This bounds decoded RGBA pixels at 111 MiB, versus 170 MiB for all 29 sheets. Renderer buffers, image copies, driver allocations and browser overhead are additional. No original image is resized, renamed, moved or regenerated. Optional missing animations use idle, with physics unaffected. Idle sheets remain essential for displaying each form.

Landing transitions directly to idle/run and gliding directly to the loop; land and glide_start remain available in the lab. Existing pose jitter and duplicate Earth landing artwork are cosmetic and are not repaired in this phase.

## Validation

Validated on October 18, 2026:

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run test`: **85 tests passed across 13 files**, including the original 65 tests.
- `npm run build`: passed. The existing Phaser chunk-size advisory remains (approximately 1.22 MB minified / 326 kB gzip for the game chunk); no build errors.
- `npm run format:check`: passed.
- `npm run cap:sync`: passed, including a fresh production build and copy into the existing iOS project.
- SHA-256 comparison: all **275 original PNGs** and their filenames unchanged. No dependencies were added.

Real Chrome checks verified horizontal movement/release, facing, wall/world-bound collisions, sequential Water traversal of all four ledges, jump-height differences (approximately 170 world units for Water versus 67 for Earth), Fire's single extra jump and non-refill through transformation, Air glide hold/release, Earth heavy descent, stable body geometry while transforming, landing on thin ledges, focus-loss release and three actual StrictMode mount/unmount cycles.

Mobile browser checks at 667 × 375 / DPR 2 and 852 × 393 / DPR 3 exercised simultaneous touch movement/jump/transformation, independent finger release, dragging outside a captured button, pointer cancellation, rotation and a single canvas with no page scrolling. Production requested exactly 18 character sheets, ran keyboard/touch controls and excluded the lab even with its development query parameter. Simulated loss of Fire double_jump still allowed the physical extra jump using idle; a missing essential Water idle reported the exact filename. The existing character lab still opens and plays its registered sequences.

Native pause/resume also disconnects and reconnects the keyboard adapter so a missed keyup cannot latch the next press. Input state is cleared independently of DOM blur.

## Remaining limits

Only Xcode Command Line Tools are installed; full Xcode, simulator/device execution, native compilation and signing were not available. Capacitor synchronization is not a native build. Physical iPhone touch behavior, safe areas, memory and frame rate remain unverified. Chrome viewport/touch emulation is not an iOS WebView test. Texture usage is a calculated raw-pixel budget, not a measured native peak.

The stage and movement tuning are intentionally simple. Cosmetic pose differences remain; landing and glide-start animations are omitted from gameplay loading as described above. Attacks, puzzles, progression, sound and effects are outside this phase.
