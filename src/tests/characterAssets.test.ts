import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CHARACTER_ANIMATIONS,
  availableAnimations,
  getCharacterAnimation,
} from '../game/systems/animation/animationRegistry';
import type { AnimationId } from '../game/systems/animation/animationRegistry';
import { frameAlignment } from '../game/systems/animation/alignment';
import { ELEMENT_CONFIG, PLAYER_VISUAL_HEIGHT } from '../game/config/elements';
import { ELEMENTS } from '../game/types/character';

describe('audited character registry', () => {
  it('contains exactly the supplied animations, with element-specific identifiers', () => {
    expect(CHARACTER_ANIMATIONS).toHaveLength(29);
    expect(new Set(CHARACTER_ANIMATIONS.map((clip) => clip.id)).size).toBe(29);
    expect(availableAnimations('water')).toHaveLength(6);
    expect(availableAnimations('fire')).toContain('double_jump');
    expect(availableAnimations('air')).toContain('glide_start');
    expect(availableAnimations('earth')).toContain('push_end');
    expect(getCharacterAnimation('air', 'attack')).toBeUndefined();
    expect(getCharacterAnimation('earth', 'attack')).toBeUndefined();
    expectTypeOf<
      Extract<AnimationId, 'air:attack' | 'earth:attack'>
    >().toBeNever();
  });

  it.each(CHARACTER_ANIMATIONS)(
    '$id matches the real PNG header and frame layout',
    (clip) => {
      const png = readFileSync(
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          '../../public',
          clip.path,
        ),
      );
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.readUInt32BE(16)).toBe(clip.frameWidth * clip.frameCount);
      expect(png.readUInt32BE(20)).toBe(clip.frameHeight);
      expect(png[25]).toBe(6); // PNG color type 6: RGBA.
      expect(clip.footY).toHaveLength(clip.frameCount);
      expect(clip.fps).toBeGreaterThan(0);
      expect(clip.footY.every((y) => y > 0 && y <= clip.frameHeight)).toBe(
        true,
      );
    },
  );

  it('preserves the ground anchor in both directions for every supplied frame', () => {
    for (const clip of CHARACTER_ANIMATIONS) {
      for (let frame = 0; frame < clip.frameCount; frame++) {
        for (const facing of ['left', 'right'] as const) {
          const { originX, originY, scale } = frameAlignment(
            clip,
            frame,
            facing,
          );
          const sourceAnchorX = ELEMENT_CONFIG[clip.element].anchorX;
          const mirroredAnchorX =
            facing === 'left' ? clip.frameWidth - sourceAnchorX : sourceAnchorX;
          expect(
            (mirroredAnchorX - originX * clip.frameWidth) * scale,
          ).toBeCloseTo(0);
          expect(
            ((clip.footY[frame] ?? 0) - originY * clip.frameHeight) * scale,
          ).toBeCloseTo(0);
        }
      }
    }
  });

  it('gives all four audited idle poses the same visible height without scaling poses per frame', () => {
    for (const element of ELEMENTS) {
      const clip = getCharacterAnimation(element, 'idle');
      expect(clip).toBeDefined();
      if (!clip) continue;
      const alignment = frameAlignment(clip, 0, 'right');
      // All four source poses have visible top 24 and exclusive bottom 479.
      expect((479 - 24) * alignment.scale).toBeCloseTo(PLAYER_VISUAL_HEIGHT);
      expect((479 - 24) * alignment.scale).toBeCloseTo(180);
      expect(frameAlignment(clip, 1, 'right').scale).toBe(alignment.scale);
    }
  });
});
