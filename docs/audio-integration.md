# Runtime audio

All 74 WAVs in `audio-inventory.json` are registered in `src/services/audio/catalog.ts` and routed to existing game/UI events. No audio or artwork was regenerated or renamed. Campaign JSON, physics rules, gem replacement and the progress ledger are unchanged.

## Event ownership

| Events                                                                                                          | Runtime owner                                       | Trigger                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Four elemental steps, jumps and landings; Fire double jump; Air glide/dash; Earth swing/plunge; Water/Fire cast | `MovementAudio`                                     | Accepted motor/power decisions; steps require real grounded displacement.                                                      |
| Water/Fire impacts and Earth contact                                                                            | `PowerEffects`                                      | Actual swept projectile or timed melee collision, never projectile expiry.                                                     |
| Gems, coins, tanks, torches, plates, doors, walls and exit readiness                                            | `GemSystem`, `ForestPuzzle`, `FirstPuzzle`          | Actual collection or state transition, once. Heavy-block scrape requires movement; its landing requires a fall.                |
| Elevators, fans, bridges, lakes, lava, wheel, boiler and levers                                                 | `WorldAudio` / `WorldSystem`                        | Committed world state. Blocked elevators are silent; bridge loops follow movement/direction. Boiler heat is replaced by steam. |
| Forest ambience and legacy animated props                                                                       | `MainScene`, `AncientForest`, `ForestAnimatedProps` | Scene lifetime, proximity and the existing door animation.                                                                     |
| Eleven decorative types                                                                                         | `propSounds` / `WorldAudio`                         | Current artwork states, including animation next-state aliases. No new physics, timing rules, damage or interactive behavior.  |
| Confirm, back, pause/resume and restart                                                                         | React callbacks / `MainScene`                       | Accepted action only. Automatic blur pause, hover, rendering and disabled buttons are silent.                                  |
| Victory, stars, record and banked reward                                                                        | `bindRunAudio`                                      | One confirmed completion; actual result flags. Playtest uses `portal_complete` and no persistent reward sequence.              |

Decorative appearance/disappearance, pressure warning, growth and bounce sounds accompany those animations only when a placed object displays that state. They do not make the decoration interactive. Water contact for a plant or floating wood remains a future mechanical event; the shared Water impact/contact cues already serve real interactions elsewhere.

## Lifetime and loading

- A shared lazy Web Audio context starts after a pointer/key gesture. Phaser does not create a second audio context. Audio failure leaves the game playable.
- UI cues and sounds for the scene's forms/placed objects are preloaded after unlock. Other sounds load on demand; fetch/decode requests are deduplicated. A failed file is suppressed for the page session. The decoded LRU cache is bounded to 12 MiB; live voices may retain additional buffers temporarily.
- Each game owns a world scope and a result scope. Pause stops world voices; resume restarts desired loops. Restart clears the old scene's loops and pending one-shots. Unmount disposes both scopes synchronously, including when Phaser destruction is deferred.
- Mute, zero volume and background cancel active scope voices and delayed rewards. Returning cannot replay missed one-shots. Pausing the world leaves explicit UI actions audible.
- Limits: 28 global voices, three concurrent voices per cue, eight loops per scope, eight pending one-shots per scope and a 65 ms per-cue retrigger guard. Stale asynchronous one-shots are dropped after 300 ms for the world or 1200 ms for UI.
- Object volume falls quadratically to zero over 850 world units with reduced vertical distance weighting. Lakes and lava measure distance from the nearest point on their surface, so wide pools remain audible at either bank. Player effects and UI use their own gain. Loops fade when started/stopped. Initial master volume is 65%.
- **Sonido** is available in menus, gameplay, pause/results and editor playtest. Mute/volume persist as validated `veylith.audio.v1` preferences, separate from progress v1.

## Validation

`src/tests/audio.test.ts` covers cancellation, pause/channel isolation, loop races/caps, browser unlock/failures, actual earned rewards, playtest isolation and movement decisions. `src/tests/worldAudio.test.ts` checks real WAV hashes, mechanism movement/transition rules and decorative state mapping without mutation.

`scripts/audio-smoke.js` uses an externally installed Playwright (no added dependency) and a running Vite server. It checks gesture unlock, real campaign movement, pause/mute/background, persistence, resize/restart/unmount, a real portal collision in an in-memory level, the result sequence and decoding all 74 files. The fixture never writes canonical levels or saved coins. Set `PLAYWRIGHT_MODULE`, `VEYLITH_URL` and optionally `SMOKE_OUTPUT` to run it.

The [verification report](audio-integration-verification.json) records 371 passing tests, browser playback/lifecycle checks and real mechanism regression paths. Browser playback/decoding and automated event checks do not certify the final acoustic mix. Physical iPhone playback, audio-session interruptions and listening through device speakers/headphones remain pending. No native configuration changed in this integration.
