# Asset guidelines

## Destination and ownership

Place supplied character spritesheets under `public/assets/characters/`. Four folders are ready: `water/`, `fire/`, `air/`, and `earth/`. Environment, object, effect, UI, and audio assets have separate sibling directories under `public/assets/`.

The supplied delivery is now integrated. [asset-audit.md](asset-audit.md) lists every sheet and its measured layout; [asset-inventory.json](asset-inventory.json) lists every original PNG, frame bounds, transparency, comparisons, and hashes. The typed runtime manifest uses only these verified character files. No character image has been generated or modified.

Preserve original files, names, and folder organization when importing existing artwork. Do not rescale, recolor, compress, trim, rename, or regenerate art without a reason and authorization. Keep source art or export notes alongside the delivery when useful.

## PNG recommendations

- Use PNG for lossless spritesheets. RGBA with a true alpha channel is preferred for characters; transparent pixels should not contain a baked background, checkerboard, or matte.
- Export in a consistent color space, normally sRGB. Retain source resolution; rendering/filtering choices will follow inspection of the actual artwork.
- For grid spritesheets, use consistent cell width and height within each sheet. Keep frame dimensions, row/column counts, margins, and spacing documented.
- Align the character's pivot and baseline across frames. Include enough transparent room for attacks, gliding, and other wide poses to avoid cropping or jitter.
- Avoid trimming individual cells in a grid sheet. If the supplied art is a packed/trimmed atlas, include the real atlas metadata and original frame offsets instead of reconstructing them by guesswork.
- Keep sheets reasonably sized for mobile GPU memory. We will inspect actual dimensions before choosing atlas organization or optimization; do not resize the originals in advance.

## Organization and names

Separate elemental variants using the existing element folders when appropriate. For newly named exports, prefer consistent lowercase names with underscores and no spaces; keep existing delivered names unchanged until inspected. Frame order should follow the exporter's metadata or documented sequence, not a guessed filename sort.

The integrated action vocabulary includes idle, run, jump, fall, land, attack, double_jump, glide_start, glide_loop, push_start, push_loop, push_end, and smash. Air and Earth have no attack sequence. Fire has double_jump; Air has glide_start/glide_loop; Earth has push_start/push_loop/push_end/smash. **Do not assume that an action exists for every element.**

Provide frame dimensions, export format, playback information if known, and notes about unusual pivots or non-looping sequences. Missing information must be established by inspection or clarification, never invented.

## Procedure for future asset deliveries

1. Inventory the real files and folder structure without altering them.
2. Inspect image dimensions, alpha, frames, margins, spacing, and alignment.
3. Record only the actual animation availability for each element.
4. Create a centralized typed asset/animation registry using real paths and verified metadata.
5. Validate loading and frame boundaries before adding gameplay behavior.

Files in `public/` are copied as-is to the production build. `game/assets/loadCharacterAssets.ts` constructs URLs using Vite's base URL; keep path construction centralized. Avoid remote asset URLs so the iOS bundle can operate offline. Correct alignment in metadata, never by editing the originals. Update the audit and frame metadata if a future authorized delivery replaces art.
