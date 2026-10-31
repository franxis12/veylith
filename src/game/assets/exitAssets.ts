import type Phaser from 'phaser';
import { assetUrl } from './loadCharacterAssets';
import { queueOptionalSheet, registerOptionalSheet } from './optionalSheet';
import type { OptionalSheet } from './optionalSheet';

const root = 'assets/objects/';
export const EXIT_FRAME = {
  key: 'exit:frame',
  path: root + 'ancient_doorway_frame/ancient_doorway_frame.png',
  width: 1280,
  height: 1344,
};
export const EXIT_MASK = {
  key: 'exit:mask',
  path: root + 'ancient_doorway_frame/alignment/seal_clip_mask.png',
  width: 1280,
  height: 1344,
};
export const SEAL_SHEETS = {
  idle: {
    path: root + 'magical_seal/seal_idle_spritesheet.png',
    width: 512,
    height: 1024,
    columns: 4,
    frames: 8,
    fps: 6,
    loop: true,
  },
  break: {
    path: root + 'magical_seal/seal_break_spritesheet.png',
    width: 512,
    height: 1024,
    columns: 5,
    frames: 10,
    fps: 10,
    loop: false,
  },
  activate: {
    path: root + 'magical_seal/seal_activate_spritesheet.png',
    width: 512,
    height: 1024,
    columns: 4,
    frames: 8,
    fps: 8,
    loop: false,
  },
} as const satisfies Record<string, OptionalSheet>;
export const SEAL_PREVIEW = {
  ...SEAL_SHEETS.idle,
  key: 'exit:seal:preview',
  path: root + 'magical_seal/idle/frames/frame_01.png',
  frames: 1,
  columns: 1,
  loop: false,
};
function exitSheets(preview: boolean) {
  return preview
    ? [SEAL_PREVIEW]
    : Object.entries(SEAL_SHEETS).map(([id, sheet]) => ({
        ...sheet,
        key: sealKey(id as keyof typeof SEAL_SHEETS),
      }));
}
export const sealKey = (id: keyof typeof SEAL_SHEETS) => `exit:seal:${id}`;
// Audited frame manifest: all coordinates are original source pixels.
export const SEAL_PLACEMENT = {
  left: 560,
  top: 676,
  width: 280,
  height: 560,
  anchorX: 700,
  baseline: 1234,
};

/** Keep schema-v1 exit dimensions as the opening/interaction guide, not the facade.
 * Uniform art scale uses opening height; anchors and all saved colliders stay intact. */
export function exitPlacement(width: number, height: number) {
  const scale = height / SEAL_PLACEMENT.height;
  return { scale, x: width / 2 - 700 * scale, y: height - 1234 * scale };
}
export function queueExitAssets(scene: Phaser.Scene, preview = false): void {
  for (const asset of [EXIT_FRAME, EXIT_MASK])
    if (!scene.textures.exists(asset.key))
      scene.load.image(asset.key, assetUrl(asset.path));
  for (const sheet of exitSheets(preview))
    queueOptionalSheet(scene, sheet.key, sheet);
}
export function missingExitAssets(
  scene: Phaser.Scene,
  preview = false,
): string[] {
  return [
    EXIT_FRAME,
    EXIT_MASK,
    ...exitSheets(preview).map((s) => ({
      key: s.key,
      path: s.path,
      width: s.width * s.columns,
      height: s.height * Math.ceil(s.frames / s.columns),
    })),
  ]
    .filter((a) => {
      if (!scene.textures.exists(a.key)) return true;
      const image = scene.textures.get(a.key).getSourceImage() as {
        width: number;
        height: number;
      };
      return image.width !== a.width || image.height !== a.height;
    })
    .map((a) => a.path);
}
const clipped = new WeakSet<Phaser.Textures.Texture>();
/** Apply the supplied alpha mask once, in source coordinates. Canvas composition
 * supports both Canvas and WebGL, including rotated/moved editor containers.
 * Replace each upload in place; never retain a second GPU atlas or edit disk PNGs. */
export function registerExitAnimations(
  scene: Phaser.Scene,
  preview = false,
): void {
  const missing = missingExitAssets(scene, preview);
  if (missing.length)
    throw new Error(`Exit assets failed to load: ${missing.join(', ')}`);
  const mask = scene.textures
    .get(EXIT_MASK.key)
    .getSourceImage() as HTMLImageElement;
  for (const sheet of exitSheets(preview)) {
    const key = sheet.key;
    const texture = scene.textures.get(key);
    if (!clipped.has(texture)) {
      const source = texture.getSourceImage() as HTMLImageElement;
      const atlas = document.createElement('canvas');
      atlas.width = source.width;
      atlas.height = source.height;
      const context = atlas.getContext('2d')!;
      const cell = document.createElement('canvas');
      cell.width = sheet.width;
      cell.height = sheet.height;
      const c = cell.getContext('2d')!;
      for (let i = 0; i < sheet.frames; i++) {
        const x = (i % sheet.columns) * sheet.width,
          y = Math.floor(i / sheet.columns) * sheet.height;
        c.clearRect(0, 0, cell.width, cell.height);
        c.globalCompositeOperation = 'source-over';
        c.drawImage(
          source,
          x,
          y,
          cell.width,
          cell.height,
          0,
          0,
          cell.width,
          cell.height,
        );
        c.globalCompositeOperation = 'destination-in';
        c.drawImage(mask, 560, 676, 280, 560, 0, 0, cell.width, cell.height);
        context.drawImage(cell, x, y);
      }
      scene.textures.remove(key);
      const prepared = scene.textures.create(
        key,
        atlas,
        atlas.width,
        atlas.height,
      );
      if (prepared) {
        prepared.add('__BASE', 0, 0, 0, atlas.width, atlas.height);
        for (let i = 0; i < sheet.frames; i++)
          prepared.add(
            i,
            0,
            (i % sheet.columns) * sheet.width,
            Math.floor(i / sheet.columns) * sheet.height,
            sheet.width,
            sheet.height,
          );
      }
      if (prepared) clipped.add(prepared);
    }
    if (!preview) registerOptionalSheet(scene, key, sheet);
  }
}
