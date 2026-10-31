# Options, languages and mobile controls

English is the initial language. Open **Options** (gear button) from the main menu, level selection, game HUD, pause or result screen. Select **Español** to switch the game to Spanish immediately. The language selector always shows the names “English” and “Español”.

## Sound and persistence

Mute/unmute and the master volume slider reuse the existing audio engine and `veylith.audio.v1` settings. They apply immediately. Language and mobile mode are stored separately under `veylith.preferences.v1`; blocked storage still supports the current session. This change does not alter campaign saves, currency, rewards, canonical level data or original assets.

Opening options during a run freezes the clock, simulation and world sounds, and clears input. Closing resumes the same run. If options were opened from the pause panel, closing returns to pause. Settings do not restart the level. Escape closes options, Tab stays inside them and focus returns to the triggering control when available.

## Mobile gestures

Gestures are the default on touch-capable devices. HUD buttons remain usable above the gesture zones.

- Left half: touch, swipe horizontally left/right and keep the finger down to move. Return near the initial touch point for neutral; slide to the opposite side to reverse. Release to stop.
- Right half: swipe upward to jump. A single stationary tap uses the current element’s power.
- Both halves accept independent fingers, so movement and jumping/power work together.
- Holding after the upward swipe keeps Jump held for Air glide. Release and swipe again for Fire’s extra jump. The first ten campaign levels remain Earth-only.
- A swipe cannot also cast a power. Cancelled touches never cast. Cancellation, lost capture, rotation/resize, backgrounding and leaving play clear holds.
- **Options → Mobile controls → Buttons** restores the existing movement/jump/power buttons. Keyboard controls remain A/D or arrows, Space/W/up, E/Shift, Escape and R.

Recognition uses CSS pixels, independent of device pixel ratio: 18 px movement dead zone, 28 px upward jump threshold with vertical dominance, tap maximum travel 12 px and duration 350 ms. Additional fingers on an already occupied side are ignored; a captured finger stays assigned to its starting side.

## Translation boundary

The shipped game menus, HUD, loading/storage messages, result screens, element names, all ten canonical campaign titles, hints and signs, and the original prototype signs have English/Spanish copy. Canonical JSON and visual-editor text remain in their authored language. Exact source matching deliberately leaves new/custom editor text unchanged when there is no translation; add matching copy to `services/i18n/levelText.ts` to translate it. Development editor/lab tools are not part of this game-language update.

## Validation

Automated tests cover language defaults/persistence, unavailable storage, all canonical text coverage, custom-text fallback, canvas subscriptions and disposal, options pause/resume/focus/progress invariants, gesture recognition, independent fingers, quick taps and cancellation. `scripts/options-gestures-smoke.js` uses an external Playwright installation and Chromium’s native multi-touch dispatch against the actual React/Phaser game, with no physics teleports or injected game actions. It also checks settings reload, sound controls, instant canvas translation, rotation, restart and remount.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run format:check`. Optional browser command: `PLAYWRIGHT_MODULE=<installed-playwright> VEYLITH_URL=<vite-url> node scripts/options-gestures-smoke.js`.

Physical iPhone/WebView touch feel and native memory/performance still require device testing. No native project configuration or dependencies were changed.

## Verified on 2026-10-21

- Typecheck, lint, all 382 tests, production build and repository formatting passed. The existing large Phaser bundle advisory remains.
- The real-browser options/gesture test passed with no page errors: English default, Spanish persistence, native simultaneous touch movement/jump, one power per tap, cancellation, live translated world signs, pause/resume, audio controls, buttons fallback, portrait/landscape resize, remount and restart.
- The adapted audio browser regression passed: all 74 WAVs decoded, movement/ambient/result cues played, mute/volume persisted and restart/unmount released audio correctly.
- Browser tests used isolated profiles, never the user’s save or open tab. Physical iPhone/WebView testing remains pending.
