import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import {
  FOREST_ASSETS,
  failedForestAssets,
  queueForestAssets,
} from '../game/assets/forestAssets';
import { ForestState } from '../game/levels/ancientForest/ForestState';
import { LevelProgress } from '../game/levels/LevelProgress';
import { ANCIENT_FOREST } from '../game/levels/ancientForest/layout';
import { selectLevel } from '../game/levels/levelSelection';

describe('Ancient Forest assets and selection', () => {
  it('validates every loaded texture against the supplied PNG dimensions and alpha bounds', () => {
    for (const asset of Object.values(FOREST_ASSETS)) {
      const png = readFileSync(resolve('public', asset.path));
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.readUInt32BE(16)).toBe(asset.width);
      expect(png.readUInt32BE(20)).toBe(asset.height);
      expect(asset.bounds[2]).toBeLessThanOrEqual(asset.width);
      expect(asset.bounds[3]).toBeLessThanOrEqual(asset.height);
    }
    // 37.547 MiB static art, including eight existing puzzle-state textures.
    expect(
      Object.values(FOREST_ASSETS).reduce(
        (sum, asset) => sum + asset.width * asset.height * 4,
        0,
      ),
    ).toBeLessThan(38 * 1024 * 1024);
  });

  it('reuses cached images and identifies exact missing filenames', () => {
    const image = vi.fn();
    const exists = (key: string) => key !== 'forest:ground';
    const textures = { exists } as Phaser.Textures.TextureManager;
    queueForestAssets({ load: { image }, textures } as unknown as Phaser.Scene);
    expect(image).toHaveBeenCalledExactlyOnceWith(
      'forest:ground',
      expect.stringContaining('terrain/ground_center.png'),
    );
    expect(failedForestAssets(textures)).toEqual([FOREST_ASSETS.ground.path]);
  });

  it('defaults to the forest, preserves the prior puzzle and excludes the test sandbox from production URLs', () => {
    for (const development of [true, false]) {
      expect(selectLevel('', development)).toBe('forest');
      expect(selectLevel('?level=unknown', development)).toBe('forest');
      expect(selectLevel('?level=puzzle', development)).toBe('puzzle');
    }
    expect(selectLevel('?level=test', true)).toBe('test');
    expect(selectLevel('?level=test', false)).toBe('forest');
  });
});

describe('forest traversal state', () => {
  it('requires a grounded arrival inside the portal, rather than flying past or standing below it', () => {
    const state = new ForestState();
    const exit = ANCIENT_FOREST.exit;
    for (const player of [
      { x: exit.x, feetY: exit.feetY, grounded: false },
      { x: exit.x, feetY: exit.feetY + 50, grounded: true },
      { x: exit.x + exit.halfWidth + 1, feetY: exit.feetY, grounded: true },
    ]) {
      expect(state.update(player)).toBe(false);
      expect(state.snapshot.phase).toBe('exploring');
    }
    state.update({ x: exit.x, feetY: exit.feetY, grounded: true });
    expect(state.snapshot.phase).toBe('complete');
    expect(state.update({ x: exit.x, feetY: 1100, grounded: false })).toBe(
      false,
    );
    expect(state.snapshot.phase).toBe('complete');
  });

  it('requests a fresh attempt after falling and updates hints when backtracking', () => {
    const state = new ForestState();
    state.update({ x: 2800, feetY: 370, grounded: true });
    expect(state.snapshot.section).toBe('glide');
    state.update({ x: 1900, feetY: 650, grounded: true });
    expect(state.snapshot.section).toBe('fire');
    expect(
      state.update({
        x: 3500,
        feetY: ANCIENT_FOREST.fallLimit,
        grounded: false,
      }),
    ).toBe(true);
    expect(new ForestState().snapshot).toEqual({
      kind: 'forest',
      phase: 'exploring',
      section: 'arrival',
    });
  });

  it('only publishes discrete UI changes and can switch cleanly between old and new levels', () => {
    const progress = new LevelProgress();
    const listener = vi.fn();
    const stop = progress.subscribe(listener);
    const forest = new ForestState().snapshot;
    progress.publish(forest);
    for (let index = 0; index < 120; index++) progress.publish({ ...forest });
    expect(listener).toHaveBeenCalledTimes(1);
    progress.publish({ ...forest, section: 'fire' });
    progress.publish({ phase: 'locked', activated: false, secondsLeft: 0 });
    progress.publish(null);
    progress.publish(null);
    expect(listener).toHaveBeenCalledTimes(4);
    stop();
    progress.publish(forest);
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
