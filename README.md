# Veylith

A playable 2D platformer MVP for iPhone in landscape and web. The hero can move, jump and transform between Water, Fire, Air and Earth. The campaign starts with **ten Earth-only Ancient Forest levels** built from the supplied environment assets. See [solutions, routes, implementation and validation](docs/level-design.md). Existing elemental powers and the earlier **La puerta del viento** puzzle remain available.

## Veylith UI and campaign MVP

The main menu, level selection, HUD, pause and completion screen use the supplied UI PNGs. Level selection places ten compact Earth markers directly on the map ground, without added shadows; small screens can pan the same scene. `elements_logo.png` already displays **Veylith** and keeps its original filename. Asset failures retain readable text and CSS controls; no artwork has been generated or overwritten.

- **Play / Continue** starts the saved unlocked level. **Continue** inside the pause panel resumes the same world and timer. Returning to the menu or closing the app discards the current attempt; the next launch starts the saved level from its beginning. There are no spatial checkpoints or mid-attempt saves.
- **Pause / Escape**, window blur and app inactivity stop the world and stopwatch. Loading and victory are excluded. Restart (R or UI), including automatic fall retry, resets time, player and gems.
- Every completed level earns 1–3 stars. Inclusive targets for the ten levels live in `src/game/levels/data/forest-*.json` (the legacy targets and rewards remain in `catalog.ts`): each forest level has its own 3/2-star targets; the legacy forest and wind puzzle retain 60/100 and 20/40 seconds. Slower finishes still earn one star. These are initial tunable targets, not final difficulty balancing.
- Reward entitlements are 30/60/100 coins for 1/2/3 stars (50/100/150 for El santuario de piedra). First completion pays its entitlement; improving the rating pays only the remaining difference. Repeating or worsening a rating pays no additional star reward. Optional editor-placed coins are banked once per coin on victory. Best time and stars never decrease.
- Version 1 of `veylith.progress` stores the per-level best times, best stars, awarded star coins, optional banked pickup IDs/values and continuation level in local storage. Newer versions are preserved without writes; damaged saves are backed up under `veylith.progress.recovery`; blocked storage uses session memory with a visible warning.
- All ten campaign levels are selectable from the start, with objective hints in the HUD. The original two prototypes remain: the wind prototype unlocks after any successful original forest traversal. No shop, purchases, ads or backend is included.

See [UI, progression, asset mapping and validation](docs/veylith-ui.md).

## Language, sound and options

English is the initial game language. **Options** is available from the main menu, level selection, HUD and pause/results panels. Choose **English / Español**, toggle sound, adjust the master volume, select mobile gestures or buttons, and read the keyboard controls. Options opened during play pause the world and clock; closing resumes that same run. Opening options from a paused game keeps it paused afterward.

Language and mobile mode are stored under `veylith.preferences.v1`; existing sound preferences stay under `veylith.audio.v1`. Campaign saves are unchanged. Menus, HUD, results, canonical level titles, objective hints and world signs switch immediately. Editor source text and custom text remain editable and are never rewritten. See [options, localization and touch controls](docs/options-controls.md).

## Ancient Forest puzzles

Run `npm run dev`, open the printed URL and choose **Play** or **Level select**. The first ten Ancient Forest levels start as Earth and have no transformation gems. Their puzzles use linked mechanisms, a reusable stone bridge, reflected light, belts, pulleys, one-way gates, timed doors and alternate states. Earth can jump onto a standard heavy block in one jump (about 208 px), retaining its heavier descent. Stable route IDs are deliberately ordered `forest-1`, `forest-2`, `forest-6`, `forest-7`, `forest-8`, `forest-9`, `forest-10`, `forest-3`, `forest-4`, `forest-5` to preserve existing saves. Use `/?level=<id>` or the menu. [Solutions, times, rewards, verification and limitations](docs/level-design.md).

The pre-existing edited first-level draft is preserved as `forest-1-saved-draft` in the editor and byte-for-byte under `docs/level-archive/`. No original art was changed. `scripts/earth-campaign-smoke.js` replays all ten canonical levels through actual game inputs; `scripts/browser-smoke.js` checks the UI lifecycle and `scripts/campaign-editor-smoke.js` checks editable connections and isolated preview. Earlier campaign layouts are archived in `docs/level-archive/before-earth/`; their elemental mechanic regressions use frozen test fixtures.

## Visual level editor (development only)

Run `npm run dev` and open **`/editor`** on the localhost URL printed by Vite. Place existing assets on a Phaser canvas, move/resize objects and independent box colliders, configure mechanisms, undo/redo, explicitly save JSON, and play the current unsaved draft with the real game. The **Recolectables → Moneda** library entry adds configurable contact pickups, counted in playtest and banked once per coin on campaign victory. Changing level height also moves its fall boundary; the red guide marks where falling restarts the attempt. Files live in `src/game/levels/data/`; the ten campaign levels now use these same documents. New custom levels are opened and played from the editor; they are not automatically added to the campaign.

Use **Zoom** or the wheel/−/+ controls to view the editor canvas at 1–300%. **Encuadrar** centers the entire level. To use a zoom when playing, click **Aplicar zoom al juego**, or set **Zoom al jugar (%)** under level properties (25–150%). **Probar** previews it immediately; **Guardar** persists it with the level. At 50%, the game shows twice as much world horizontally and vertically. Ordinary editor navigation preserves the chosen gameplay zoom, artwork and colliders.

Heavy blocks now fall from their placed height, support custom collider sizes and can be pushed off ledges by Earth toward a plate on either side. The inspector can fit a block collider to its visual size.

The editor and local file service are guarded out of production/iOS builds. No assets or dependencies were added. See the [editor guide, shortcuts, storage safeguards, limits and tests](docs/level-editor.md).

The new Veylith environment exports are available in the searchable library: **12 modular platform families and 155 original PNG pieces** (50 platform tiles/supports and 105 forest decorations). Use **Plataformas · Modulares**, **Plataformas · Piezas y soportes**, or the seven **Bosque** groups. Platforms assemble their original left/center/right tiles and have independent rectangular colliders. Resizing follows each asset: platforms repeat their center, chains/ropes extend vertically, beams extend horizontally, terrain fills tile, and unique decorations keep their proportions. **Escala visual (%)** scales the complete object and its modules uniformly; subsequent resizing extends it at the chosen module size. Partial repeats crop instead of stretching; colliders stay independent. Decorative slopes, magic and supports remain static. Editor and playtest share the same renderer and load only placed resources. See [placement and verification](docs/level-editor.md#nuevos-assets-de-entorno-veylith).

## Original forest traversal (preserved)

Select **Bosque de los Orígenes** or open `/?level=forest`. Explore the opening platforms as Water, collect the Fire gem and use its double jump to reach the high cornice, then collect Air on the ledge and jump and hold Jump to glide to the ruins. Walk past the inactive block, animated water tank and opening/closing door to the swirling exit portal. The prop animations are cosmetic. Falling resets the level; **R / Reiniciar** restarts at any time.

The level uses 28 of the 109 supplied environment PNGs: three parallax layers, modular terrain/platforms, decoration, prop layers and three animation sheets. Original files are untouched. See [Ancient Forest controls, asset list and limitations](docs/ancient-forest.md) and the [complete environment inventory](docs/environment-inventory.json).

## First puzzle: La puerta del viento

Complete the original **Bosque de los Orígenes** traversal to unlock **La puerta del viento** in level selection. `/?level=puzzle` also opens it when unlocked; a URL cannot bypass progression:

1. Collect the **Air gem** near the spawn to jump onto the elevated plate.
2. Collect **Earth** on the elevated plate and stand on its center to open the gate.
3. Collect the **Air gem** to the right of the plate, jump right and hold Jump or Poder to cross the gap before the gate closes.
4. Land at the marked exit to win.

The plate keeps the gate open while Earth stands on it, then gives you **six seconds** after leaving or changing form. Falling automatically starts a fresh attempt. **R / Reiniciar** restarts at any time; **Volver a jugar** starts again after winning. The scene has hints, a countdown and a completion message. The existing puzzle receives three compatibility gems (Air, Earth, Air); its plate, timer and gate rules are unchanged.

The original platform test stage is still available at `/?level=test` in development. The character lab remains at `/?preview=characters`. See [first puzzle rules and validation](docs/first-puzzle.md).

## Movement and controls

The player can pass through terrain, platform, decoration and standalone Box Collider sides and undersides, then land on top when descending. Pushable blocks/mirrors, doors, breakable walls and directional/energy barriers retain lateral contact for their mechanics. Heavy blocks and projectiles retain their own collision rules. This applies to existing levels and editor playtests, including standalone Box Colliders. Reach the surface with the jump to land on it; this does not increase jump height. In the editor, **Collider rectangular → Caras sólidas para el personaje** controls each face independently. Choose **Pared sólida** for a wall or **Solo superficie** for a platform; the choice is saved with the level and used immediately in playtest.

Near a reflector, **hold Action / E**, then drag the circular control to rotate the mirror. On touch screens, keep one finger on Action and use another on the dial. Release Action to stop and close it; the angle stays until restart. A/D rotates continuously and focused dial arrows adjust by 1°. The editor exposes its initial angle and whether rotation is allowed. See [reflector controls and optics](docs/advanced-mechanics.md).

Run `npm run dev` and open the printed URL. Development and production both start the Veylith main menu.

- **A/D or ←/→:** move. **Space, W or ↑:** jump.
- **Gems:** touching a gem immediately replaces the active element. Each gem is consumed until restart.
- Gameplay transformations come only from gems. Manual selectors and number-key transformations are disabled in the campaign and movement sandbox. The separate development character lab retains its inspection controls.
- **Water:** normal jump. **Fire:** press jump again for one extra jump per flight.
- **Air:** hold jump, E or Shift while descending to glide. **Earth:** a higher jump that reaches the standard heavy block, with a heavier descent.
- **E / Shift / Poder:** Water projectile, Fire fireball, Air impulse or Earth smash/plunge. Release and press again to cast.
- On a phone, the left half accepts a horizontal swipe: keep the finger down to move, release to stop. On the right half, swipe up to jump or tap once to use a power. Both sides work simultaneously. Hold after an upward swipe to glide as Air; release and swipe again for Fire’s second jump. **Options → Mobile controls → Buttons** restores the arrow/jump/power buttons.

Release and press again for Fire's second jump. Switching elements cannot refill it; landing does. Holding jump does not automatically jump again on landing. Input clears when focus or app activity is lost.

The optional movement test stage contains a floor and four ledges. The collision body stays the same size across forms, animation frames and levels.

See [gem transformations](docs/gems.md), [elemental powers, effects and validation](docs/elemental-powers.md) and the earlier [movement MVP](docs/gameplay-mvp.md).

## Character preview

The existing **Character lab** is preserved at `/?preview=characters` when running `npm run dev`. It still loads all 29 animations and supports element/animation selection, looping/one-shot playback, replay, pause, facing and visual alignment guides. It remains an animation inspection view without player movement.

The lab UI, scene and preview keyboard adapter are dynamically imported only in development and are excluded from production. Gameplay controls ship in both modes. Gameplay loads 24 character sheets (including Earth push start/loop/end), nine existing effects, 12 gem sheets and four transformation effects (225.375 MiB decoded RGBA, or approximately 306.422 MiB with Ancient Forest, puzzle-state images and existing animated props); optional failed sequences use idle so cosmetic asset problems do not block movement. The four idle sheets are essential.

See [the original asset audit](docs/asset-audit.md) for actual filenames, dimensions, frame counts, alignment and effects. All original PNGs are preserved. The 128 gem/transformation PNGs are separately audited in [gem inventory](docs/gem-asset-inventory.json).

## Requirements and installation

- Node.js 22.13+ on the 22.x line, 24.x, or 26+; npm 10+. `.nvmrc` selects Node 22. Prefer the newest patch on a supported LTS line.
- For native development: macOS and full Xcode 26 or newer, with an iOS SDK. Command Line Tools alone cannot build or run the app. See [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

Run commands from this directory; do not create another project folder:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The development server listens on the local network so a phone on the same Wi-Fi can open the Mac's LAN address. Landscape is preferred; portrait web views show a rotation reminder while preserving the canvas aspect ratio.

## Commands

| Command                | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Vite development server with hot reload                  |
| `npm run build`        | Strict TypeScript checks and production files in `dist/` |
| `npm run preview`      | Serve the production build locally                       |
| `npm run typecheck`    | TypeScript checks without output                         |
| `npm run lint`         | ESLint with zero warnings allowed                        |
| `npm run test`         | Run Vitest once                                          |
| `npm run test:watch`   | Watch tests during development                           |
| `npm run format:check` | Verify formatting                                        |
| `npm run format`       | Format application source and documentation              |
| `npm run cap:sync`     | Build the web application and synchronize iOS            |
| `npm run ios:open`     | Open the generated iOS project in Xcode                  |

## Technology choices

React 19, TypeScript 6, Vite 8, Phaser **3.90**, Zustand 5, Capacitor 8, Vitest 5, ESLint 10, and Prettier 3. Exact versions are pinned in `package.json` and `package-lock.json`.

- Phaser is intentionally kept on the requested major version 3.
- TypeScript 6 is the latest stable line supported by the installed TypeScript ESLint parser; TypeScript 7 is outside that parser's supported range.
- Happy DOM supplies the test DOM and supports the installed Node 22 runtime.
- The Capacitor App plugin is the only added native plugin. It supplies native foreground/background notifications.
- A scoped `xcode → uuid 11.1.1` override fixes the upstream CLI dependency's [buffer bounds advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), retaining its CommonJS API. Review removal of this override when updating Capacitor.

## Project layout

```text
src/
  app/                  React shell and application configuration
  components/game/      GameCanvas mount and cleanup boundary
  components/dev/       Development-only React animation controls
  editor/               Development-only visual level editor
  game/
    assets/             Audited spritesheet manifest and loading
    config/             Virtual resolution and element visual metadata
    core/               Phaser configuration and instance ownership
    dev/                Preview scene, keyboard adapter, per-canvas bridge
    entities/player/    Visual Player, physics adapter and movement decisions
    levels/             Ancient Forest, first puzzle, UI progress and test stage
    scenes/             Boot loading and playable scene
    systems/animation/  Registry, playback controller, alignment
    systems/input/      Typed actions, source aggregation and gameplay keyboard
    types/              Element and animation identifiers
  services/lifecycle/   Web and native application activity
  stores/               Zustand application state
  styles/               Safe areas, viewport sizing, letterboxing
  tests/                Configuration and lifecycle tests
public/assets/
  characters/{water,fire,air,earth}/
  vfx/{water,fire,earth}/
  environments/ objects/ effects/ ui/ audio/
ios/                    Native Capacitor project (Swift Package Manager)
docs/                   Architecture and asset guidance
```

Additional systems, levels, managers, and storage modules should be introduced with their first real implementation. Empty TypeScript scaffolding is deliberately omitted.

## iOS development

The native project lives under `ios/`. It uses Swift Package Manager, so CocoaPods is unnecessary.

```sh
npm run cap:sync
npm run ios:open
```

In Xcode, choose the **App** target, select a signing team for a physical device, choose an iPhone or simulator, and run. Synchronize again after changing web code, native plugin dependencies, or Capacitor configuration. `ios:open` opens existing files; it does not rebuild them.

Configuration:

- Display name: **Veylith**.
- Temporary application ID: `com.example.elements` in `src/app/config.ts`.
- Before distribution, replace that ID in `src/app/config.ts` **and** Xcode's App target → Signing & Capabilities → Bundle Identifier (Debug and Release). Capacitor sync does not rename an existing native target. Then run `npm run cap:sync`.
- Built web assets: `dist/`, configured in `capacitor.config.ts`.
- Both landscape orientations are declared in `ios/App/App/Info.plist` for iPhone and iPad. The initial target is iPhone.
- CSS owns safe-area padding with `viewport-fit=cover`; native automatic content insets and scrolling are disabled to avoid double padding.
- The App plugin pauses the engine and timer when inactive. After returning, select **Continuar** to resume. Web visibility and window focus loss have the same pause boundary.
- Default Capacitor app icons and launch resources are tool-generated native scaffolding. Replace them with final branding before release; they are not character assets.

The project is a playable movement MVP, not an App Store submission. Signing, device behavior, performance, and final branding need validation in Xcode and on a physical iPhone. Native builds use the playable production scene; the character lab remains a web development tool.

## Initialization validation

The initial setup was checked with a clean `npm ci`, strict TypeScript, ESLint, 23 Vitest tests, and a production build. The dependency audit reports no known vulnerabilities.

Real Chrome checks covered 1440 × 900 at DPR 1, 667 × 375 at DPR 2, and 852 × 393 at DPR 3, including portrait/landscape resizing, a single canvas, no scrolling, and three StrictMode mount/unmount cycles with actual Phaser destruction. These are browser viewport checks, not iOS device tests.

The native project and Info.plist pass structural validation. Full Xcode is unavailable in the initialization environment, so native compilation, simulator/device execution, signing, and real iPhone safe-area/background behavior remain unverified. The `ios:open` command can dispatch successfully without proving that Xcode is installed or a build has succeeded.

The lazy-loaded Phaser bundle is approximately 1.2 MB before compression (325 kB gzip), which triggers Vite's default large-chunk advisory. The production build succeeds. Rendering budgets and asset optimization need real-device profiling before release. Web output explicitly targets Safari 15 alongside ES2020 for the native project's iOS 15 minimum.

## Character integration validation (previous phase)

Strict TypeScript, ESLint, all **65 Vitest tests**, and the production build pass. Real Chrome checks verified all 29 character animations and all 170 frames facing both directions, shared foot alignment, element changes, looping and one-shot playback, transitions back to idle, pause/resume, viewport rotation, and actual Phaser destruction and remounting. A simulated missing file correctly blocks startup and reports its exact path. No supplied character animation failed to load.

Production browser checks verified one canvas, no preview interface or element shortcuts, and only four idle sheets requested. The development scene, controls, styles, and number-key adapter are absent from production bundles. SHA-256 checks confirm all 275 original PNG files are unchanged. Capacitor synchronization succeeded with the updated production build; native compilation and physical iPhone testing remain unverified.

## Assets and scope

### Veylith sound pack

The sound library uses a **natural, magical fantasy** style. All **74 audio assets** are registered with runtime event routes for movement, powers, collectibles, mechanisms, UI and completion. The five remaining decorative types follow their current visual states with nearby sound. Stage one mechanisms reuse the existing cues. The editor canvas and character lab stay silent; editor playtest uses the same sound system as gameplay.

Open [the sound library](docs/audio-preview.html) directly in a browser, or visit `/docs/audio-preview.html` on the development server. Search by sound/object name, browse movement, elements, world, future mechanics, UI and victory, then play or download each WAV. All 15 loops support repeat audition. The [initial sample](docs/veylith-sound-demo.wav), [UI/result sample](docs/veylith-ui-demo.wav) and [three-star victory example](docs/veylith-victory-preview.wav) are preserved. The victory example is an audition mix, not runtime behavior.

- Prepared WAVs: `public/assets/audio/veylith-natural-v1/`, 44.1 kHz / 16-bit, effects mono and original forest stereo; approximately 8.47 MiB total. All original 23 WAV/MP3 files remain byte-for-byte unchanged.
- Original generated MP3s: `docs/audio-sources/veylith-natural-v1/`, preserved without edits. Generation used 25 + 11 + 76 credits, 112 total; the latest expansion used 76.
- [Audio inventory](docs/audio-inventory.json): real paths, prompts/task IDs, hashes, durations, peak/sample checks, processing, family coverage and decorative mappings. WAV preparation removes DC offset, leaves peak headroom, fades one-shot endpoints and crossfades loop boundaries. This does not restore detail lost through MP3 encoding. Integration preserves every audio file byte-for-byte.
- The listening pages are under `docs/`, outside the production entry. The game does not preload the WAVs. No application code, level data, progression, native settings, artwork or dependencies were changed. Human listening, runtime integration and physical iPhone mixing remain pending.

Use **Sonido** in the menu, level selection, HUD, pause/results or playtest to mute or adjust volume. Preferences persist independently under `veylith.audio.v1`. A pointer/key gesture unlocks one shared Web Audio context. World audio stops on pause, background, restart and teardown; UI/results use a separate scope. Nearby loops fade with distance, decoded caching is capped at 12 MiB, and voice counts are bounded. No dependency or native plugin was added.

Victory plays once per confirmed completion, with only earned stars, new-record audio only when `result.newRecord`, and rewards only when `result.earnedCoins > 0`. Playtest uses the portal cue without persistent rewards. Browsing saved results, automatic background pause and disabled controls stay silent. Audio never awards currency or changes completion rules. See [runtime wiring, limits and checks](docs/audio-integration.md); physical iPhone listening and mixing remain pending.

The updated [coverage report](docs/audio-audit.html) links all 26 families and all eleven decorative types to their actual sound files. [Audit data](docs/audio-coverage-audit.json) retains historical references/source hashes and records integration separately. That historical audit predates stage one; the current mechanics guide distinguishes fifteen functional world types from five visual-only objects. Music, extra footstep takes and other optional polish remain separate creative choices.

The character/effect delivery contains 275 PNGs, including 29 character sheets and 10 effect sheets. The environment delivery adds 109 PNGs; 24 are used by Ancient Forest, adding 31.421875 MiB of decoded source textures. Nine unique effect sheets are active; the duplicate Earth landing export remains unused. See [asset guidelines](docs/asset-guidelines.md) and the [machine-readable inventory](docs/asset-inventory.json).

No dependencies were added for character integration or the movement MVP. All input sources emit the shared typed action interface. The movement phase is documented in [gameplay MVP](docs/gameplay-mvp.md). Texture memory and real iPhone performance still require device profiling before release.

Read [architecture](docs/architecture.md) and [project rules](AGENTS.md) before extending the project.

### Interactive World Pack

El editor incorpora los 20 objetos del pack existente, conservando los PNG originales y los niveles anteriores. Los nueve tipos funcionales originales son: ascensor activable, viento resistido por Tierra, lava para Fuego, lago para Agua, rueda hidráulica, caldera Agua/Fuego, puente retráctil, muro de Tierra y palanca. La primera etapa añade seis mecanismos y quedan cinco visuales colocables con estados/animaciones. Arte, collider y zona de efecto se editan por separado. Las conexiones por IDs se guardan en JSON y funcionan en playtest; las gemas siguen siendo la única transformación normal. Detalles y límites: [Interactive World MVP](docs/interactive-world.md).

Canonical puzzle blocks reuse the original art with editable collision sizes: 128 × 56, or 512 × 56 for the reusable bridge in level 2. The three supplied push animations respond to grounded side contact in both directions. `scripts/earth-puzzle-negative-smoke.js` checks reset and bounded naive strategies through actual input without writing user progress.

## Auditoría y remediación de assets

`npm run audit:assets` genera `docs/asset-coverage.md`, `docs/asset-coverage.json` y `docs/asset-coverage.csv`. Recorre todos los assets originales, mide PNG/WAV, verifica los frames de cada spritesheet y cruza registros, consumidores y evidencia del navegador. No considera que registrar o cargar un archivo pruebe su integración. Las reservas revisadas se enumeran en `scripts/asset-reservations.json`; los archivos nuevos sin consumidor aparecen pendientes.

La remediación conecta los tres estados de botones, opciones e indicadores reales, giro/destello de monedas, puertas reactivas, agua de depósitos y llamas de antorchas, transiciones de ventilador/ascensor/caldera/muro y VFX independientes de líquidos. Mantiene colliders, gemas, editor y saves. Consulta [cobertura por archivo](docs/asset-coverage.md) y [pruebas y límites](docs/asset-remediation-verification.md).

## Primera etapa: seis mecanismos

Puerta temporizada, plataforma evanescente, rebote, bloque flotante, barrera e interruptor configurable están disponibles en `/editor`, con seis documentos `lab-*` fuera de campaña. [Guía de parámetros y pruebas](docs/stage-one-mechanics.md). Se conservan la campaña de Tierra 1–10, los assets originales, las gemas y los saves v1.

### Mecanismos avanzados

Reflectores, poleas/contrapesos, cintas y compuertas direccionales están disponibles en `/editor`, con cuatro laboratorios `lab-*` independientes de la campaña. [Guía de parámetros, diseño y validación](docs/advanced-mechanics.md).

## Tierra como puzzles · revisión 2

Los diez niveles canónicos usan relaciones entre mecanismos, reutilización de carga, luz, cintas, poleas, compuertas y estados temporales. No contienen gemas; Agua queda reservada al nivel 11. Los IDs y saves se conservan. [Diseño por nivel, soluciones y playtest](docs/earth-level-design.md).

Las tres pistas de cada mapa se editan en **Propiedades del nivel** y se revelan opcionalmente en campaña y playtest. Los mapas anteriores y sus hashes están en `docs/level-archive/before-earth-puzzles-v2/`. Los smokes vigentes son `earth-campaign-smoke.js`, `earth-puzzle-negative-smoke.js` y `earth-puzzle-editor-smoke.js`; los antiguos smokes de geometría de campaña pueden depender del diseño archivado.

Las palancas permiten **ida y regreso** del ascensor con una segunda pulsación, o dos mandos configurables para enviar y devolver la plataforma. Selecciona **Ida y regreso por palanca** en el recorrido del ascensor; los modos antiguos se conservan. Ejemplo: `lab-lever-return`. [Configuración y pruebas](docs/interactive-world.md#palancas-para-regresar-el-ascensor).

Los bloques apilados se desplazan juntos al empujar el inferior con Tierra, conservando colisiones, caída y placas independientes. No necesitan configuración adicional. También se corrigió la ralentización inicial del reloj de Phaser en dispositivos con menos fotogramas por segundo, sin aumentar la velocidad del personaje. [Uso y límites de los bloques apilados](docs/level-editor.md#bloques-apilados).

## Escenarios ilustrados

El editor permite colocar el paquete real `level_02`, conservar sus capas y animaciones, dibujar Box Colliders independientes y combinarlo con piezas modulares. Abre `lab-illustrated` desde `/editor` para probarlo. Consulta [inventario, uso y límites](docs/illustrated-environments.md). La auditoría reproducible es `node scripts/integrate-illustrated-assets.js --check`; los PNG originales permanecen intactos.

Campaña Ancient Forest vigente: [10 niveles ilustrados, soluciones, pistas y validación](docs/illustrated-campaign.md). Los diez conservan el esquema editable del Level Editor y usan exclusivamente Tierra.

La salida de los puzzles utiliza ahora la puerta antigua con sello mágico y una breve presentación de cámara al desbloquearse. Ver [montaje y validación](docs/exit-door.md).
