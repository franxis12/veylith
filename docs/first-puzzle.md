# 01 — La puerta del viento

A single introductory puzzle built on the existing traversal controller. It remains available at `?level=puzzle`; Ancient Forest is the current default. Native web assets must be synchronized separately. No new artwork or dependencies are required.

## Objective and solution

Reach the marked exit on the right. A closed gate blocks the route, and a gap separates the two pieces of ground.

1. Collect Air near the spawn and jump from the starting floor onto the elevated plate.
2. Collect Earth on the left of the elevated plate and stand on it as Earth to open the gate.
3. Collect the Air gem just to the right of the plate, jump right and hold Jump or Poder to cross.
4. Land at the exit to finish.

The plate is 230 world units above the starting floor. Water's normal jump cannot reach it; Air's current 680 launch speed can. Fire's extra jump can also be tested with the development element controls. The plate requires Earth standing on it, introducing the need to change form after reaching it.

## Rules and recovery

- The gate stays open while Earth stands within the center strip of the plate.
- Leaving the plate or changing element starts a six-second countdown. Re-entering as grounded Earth refreshes it.
- A closing gate does not become solid inside the player. Crossing it in time is enough: the player can still finish if the timer runs out before landing at the exit.
- Falling into the gap restarts the attempt immediately, with Water at the starting point, a closed gate and cleared input.
- R or **Reiniciar** restarts at any time. **Volver a jugar** restarts after completion.
- Completion requires landing at the exit after activation. It freezes movement until replay.
- Pausing/backgrounding stops simulation and the countdown.

Keyboard and multitouch use the shared action interface. Restart buttons release focus so Space can immediately jump after restarting. The HUD gives an initial hint, open-door countdown, expired-door hint and victory message.

The movement sandbox remains at `?level=test` in development; the animation lab remains at `?preview=characters`. Manual element selection requires development with `?devElements=1`. The three compatibility gems are restored on every restart. The original sprites and Air jump tuning are unchanged by this phase.

## Validation

Initial checks passed: typecheck, lint and **98 tests across 15 files**. New coverage checks element/position/ground contact requirements, timer refresh and expiry, retry, completion, UI update frequency and shared restart actions.

Real Chrome runs completed the entire puzzle with keyboard and with simultaneous native touch pointers at 667 × 375 / DPR 2 and 852 × 393 / DPR 3. They also verified fall retry, timeout/reactivation, safe gate closure, pause, victory/replay, rotation, no scroll, three actual StrictMode mount/unmount cycles, no accumulated physics bodies, zero runtime errors, and access to both existing development views.

Typecheck, lint, all 98 tests, formatting, production build and `npm run cap:sync` passed. The existing large-Phaser-chunk advisory remains (about 1.224 MB minified / 328 kB gzip). All 275 original PNGs passed SHA-256 verification unchanged. Physical iPhone and full Xcode validation remain unavailable. This is a functional puzzle prototype using simple geometry; it adds no combat, level campaign, persistent progression, audio or new effects.
