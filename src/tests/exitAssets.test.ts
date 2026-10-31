// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  EXIT_FRAME,
  SEAL_PREVIEW,
  queueExitAssets,
  EXIT_MASK,
  SEAL_SHEETS,
  exitPlacement,
} from '../game/assets/exitAssets';
const json = (path: string) =>
  JSON.parse(readFileSync('public/assets/objects/' + path, 'utf8'));
it('uses the supplied frame, mask and every original animation cell at declared dimensions/rate', () => {
  const frame = json('ancient_doorway_frame/manifest.json'),
    seal = json('magical_seal/manifest.json');
  for (const a of [
    EXIT_FRAME,
    SEAL_PREVIEW,
    EXIT_MASK,
    ...Object.values(SEAL_SHEETS).map((s) => ({
      ...s,
      width: s.width * s.columns,
      height: s.height * Math.ceil(s.frames / s.columns),
    })),
  ]) {
    const file = readFileSync('public/' + a.path);
    expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([
      a.width,
      a.height,
    ]);
  }
  for (const [id, sourceId] of [
    ['idle', 'SEALED_IDLE'],
    ['break', 'SEAL_BREAK'],
    ['activate', 'SEAL_ACTIVATE'],
  ] as const) {
    const a = SEAL_SHEETS[id],
      source = seal.animations[sourceId];
    expect([a.frames, a.fps, a.columns, a.loop]).toEqual([
      source.frameCount,
      source.fps,
      source.columns,
      source.loop,
    ]);
    expect(a.path.endsWith(source.spritesheet)).toBe(true);
  }
  const p = exitPlacement(174, 195);
  expect(p.x + frame.doorwayAnchor.x * p.scale).toBeCloseTo(87);
  expect(p.y + frame.doorwayBaselineY * p.scale).toBeCloseTo(195);
  expect(frame.sealPlacement.height * p.scale).toBe(195);
});

it('loads only the original first frame in the editor, keeping all animation sheets for play', () => {
  const image = vi.fn(),
    spritesheet = vi.fn();
  const scene = {
    textures: { exists: () => false },
    load: { image, spritesheet },
  } as unknown as Phaser.Scene;
  queueExitAssets(scene, true);
  expect(image).toHaveBeenCalledTimes(2);
  expect(spritesheet).toHaveBeenCalledExactlyOnceWith(
    SEAL_PREVIEW.key,
    expect.stringContaining('magical_seal/idle/frames/frame_01.png'),
    { frameWidth: 512, frameHeight: 1024, endFrame: 0 },
  );
  spritesheet.mockClear();
  queueExitAssets(scene);
  expect(spritesheet).toHaveBeenCalledTimes(3);
});
