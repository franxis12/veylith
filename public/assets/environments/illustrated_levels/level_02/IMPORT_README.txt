VEYLITH — LEVEL 02: DOS PESOS, UNA SALIDA
Environmental artwork for manual import into the Veylith Level Editor.

CANVAS
1536 x 576 pixels. Top-left origin; X right, Y down. PNG, sRGB.
This preserves the 8:3 aspect ratio of the reference's upper level panorama.
The lower instruction panels were excluded. No stretching was applied to the scene.

IMPORT ORDER
1. background/background.png at (0,0).
2. Waterfall, water_surface and mist animation instances from manifest.json.
3. static_world/static_world.png at (0,0).
4. Hanging vines, moving leaves and magical particles from manifest.json.
5. foreground/foreground.png at (0,0).

All three static layer canvases and the animation registration images are 1536 x 576.
Each animation is independent and uses a compact local frame rectangle.
Use the per-instance positions, display sizes, opacity and phase from the manifest.
Positions describe the top-left of the complete frame, including transparent padding.
Each animation folder contains eight individual transparent PNGs and one 4-by-2 sheet.
The manifest provides every sheet rectangle, FPS and looping setting.
Use normal alpha blending. These PNGs have straight, unassociated alpha.

REGISTRATION IMAGES
animated/alignment/behind_world_frame_00.png
animated/alignment/front_world_frame_00.png
animated/alignment/all_effects_frame_00.png
These full-canvas transparent PNGs show the intended placement at time zero.
They are alignment guides, not additional still layers to leave underneath animations.
The static background and world do not contain duplicate flowing-water sprites.
Short ivy attached to masonry stays static; the separate long vine strands move.

HORIZONTAL SECTIONS
Optional 512 x 576 PNG sections are provided for background, static world and foreground.
Place section_00 at X=0, section_01 at X=512 and section_02 at X=1024, all Y=0.
They are exact lossless slices of the full layers, with no overlap and no gap.
Use either full-width layers or sections. Animation positions remain in world coordinates.

PREVIEWS
preview/composite.png: clean assembled environment with environmental effects at time zero.
preview/static_composite.png: assembled static layers with animated effects switched off.
preview/environment_loop.webp: four-second animated composition preview.
preview/environment_loop.gif: convenient reduced-color animated preview.
preview/animation_contact_sheet.png: six sampled moments from that preview.
preview/clean_composite_native.png: clean 2048 x 768 painted master before layer extraction,
without the independent animated effects. This is the clean composite fallback when
the reconstructed layer separation is unsuitable for a particular import workflow.

REFERENCE AND RECONSTRUCTION LIMITS
The source is one flattened illustrated instruction sheet, not a layered source file.
The export is a visually matched reconstruction, not a pixel-perfect recovery.
The fixed ledges, elevations, lower floor, open gaps, fixed wooden approach and supporting
architecture were visually compared with the source. Small painted edge differences remain.
Hidden scenery under text and objects was necessarily reconstructed. Layer separation
also reconstructed the distant forest and portions of terrain surface detail.
Canvas alignment and the lossless section boundaries were checked numerically.
The animation frames are generated painted poses; smooth optical-flow continuity is not
guaranteed. FPS values are suggested starting points and can be adjusted in the editor.

REMOVED GAMEPLAY / PRESENTATION ELEMENTS
Titles, labels, numbered badges, arrows, instruction panels, character, movable crates,
pressure plates, moving elevator deck, lift chain, exit door/sigil, torches/flames and
spike hazards were removed. The stone doorway recess and stationary supports remain.
The elevator space is intentionally open. Do not fill it with a fixed platform.
The small water-surface effect belongs to the existing cascade basin; no lake was added.
Magical motes are a subtle optional requested effect and may be disabled.

No gameplay code, collider definitions or mechanisms are included.
The manifest is asset-placement metadata, not an engine-specific importer or collision file.
Configure collision regions and interactive objects manually after import.

PROVENANCE
Built-in image generation was used for painting, extraction and effect-sheet generation.
Only the supplied reference was used as the visual style guide.
GENERATION_PROMPTS.txt contains the final prompt set.
validation.json records image dimensions, alpha checks, sheet/frame inventory and hashes.
No pre-existing Veylith assets were modified.
