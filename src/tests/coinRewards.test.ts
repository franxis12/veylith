import { campaignLevel } from '../game/levels/catalog';
import { describe, expect, it, vi } from 'vitest';
import { RunSession } from '../game/session/RunSession';
import {
  completeLevel,
  decodeProgress,
  emptyProgress,
} from '../services/progress/progress';
import { createProgressStore } from '../stores/progressStore';

// Authoritative campaign fixture, without changing the real five JSON files.
vi.mock('../game/levels/forestPuzzles/layouts', async (original) => {
  const actual =
    await original<typeof import('../game/levels/forestPuzzles/layouts')>();
  const doc = structuredClone(actual.LEVEL_DOCUMENTS['forest-1']);
  for (const [id, value, enabled] of [
    ['coin-a', 2, true],
    ['coin-b', 5, true],
    ['disabled', 10, false],
  ] as const)
    doc.objects.push({
      type: 'coin',
      id,
      value,
      asset: 'coin',
      x: 300,
      y: 550,
      width: 48,
      height: 48,
      rotation: 0,
      layer: 3,
      visible: true,
      collider: { enabled, x: 0, y: 0, width: 48, height: 48 },
    });
  return {
    ...actual,
    LEVEL_DOCUMENTS: { ...actual.LEVEL_DOCUMENTS, 'forest-1': doc },
  };
});

describe('banking collected coins', () => {
  it('pays each saved coin once, ignores unknown/disabled IDs, and preserves star entitlements', () => {
    const slow = campaignLevel('forest-1').twoStarsMs + 1;
    const first = completeLevel(emptyProgress(), 'forest-1', slow, [
      'coin-a',
      'coin-a',
      'missing',
      'disabled',
    ]);
    expect(first.result.earnedCoins).toBe(32);
    expect(first.progress.levels['forest-1']).toMatchObject({
      awardedCoins: 30,
      collectedCoins: { 'coin-a': 2 },
    });
    const repeat = completeLevel(first.progress, 'forest-1', slow + 10000, [
      'coin-a',
    ]);
    expect(repeat.result.earnedCoins).toBe(0);
    const other = completeLevel(repeat.progress, 'forest-1', slow + 20000, [
      'coin-b',
    ]);
    expect(other.result.earnedCoins).toBe(5);
    const improved = completeLevel(other.progress, 'forest-1', 10000, [
      'coin-a',
      'coin-b',
    ]);
    expect(improved.result.earnedCoins).toBe(70);
    expect(improved.progress.coins).toBe(107);
    expect(decodeProgress(JSON.stringify(improved.progress))).toEqual(
      improved.progress,
    );
  });
  it('preserves old v1 saves and prevents repeated payouts after reloading storage', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const old = completeLevel(emptyProgress(), 'forest-1', 10000).progress;
    expect(decodeProgress(JSON.stringify(old))).toEqual(old);
    const store = createProgressStore(storage);
    store.getState().complete('forest-1', 10000, ['coin-a']);
    const reloaded = createProgressStore(storage);
    expect(
      reloaded.getState().complete('forest-1', 10000, ['coin-a']).earnedCoins,
    ).toBe(0);
    expect(reloaded.getState().progress.coins).toBe(102);
  });
  it('rejects malformed collectible ledgers and mismatched balances', () => {
    const valid = completeLevel(emptyProgress(), 'forest-1', 10000, [
      'coin-a',
    ]).progress;
    for (const collectedCoins of [
      { 'coin-a': -2 },
      { 'coin-a': 1.1 },
      { 'coin-a': 1001 },
      { '../bad': 2 },
      [],
    ]) {
      const bad = {
        ...valid,
        levels: {
          ...valid.levels,
          'forest-1': { ...valid.levels['forest-1'], collectedCoins },
        },
      };
      expect(() => decodeProgress(JSON.stringify(bad))).toThrow();
    }
    expect(() =>
      decodeProgress(JSON.stringify({ ...valid, coins: valid.coins + 1 })),
    ).toThrow();
  });
  it('only forwards pickups on successful active completion; retries and playtest do not bank currency', () => {
    const award = vi.fn(
      (ms: number, ids: readonly string[]) =>
        completeLevel(emptyProgress(), 'forest-1', ms, ids).result,
    );
    const run = new RunSession(award, () => 1000);
    run.complete(['coin-a']);
    expect(award).not.toHaveBeenCalled();
    run.start('water');
    run.pause();
    run.complete(['coin-a']);
    expect(award).not.toHaveBeenCalled();
    run.retry();
    run.start('water');
    run.complete(['coin-b']);
    run.complete(['coin-a']);
    expect(award).toHaveBeenCalledExactlyOnceWith(0, ['coin-b']);
    expect(run.getSnapshot().result?.earnedCoins).toBe(105);
    const preview = new RunSession();
    preview.start('water');
    preview.complete(['coin-a']);
    expect(preview.getSnapshot().result).toBeNull();
  });
});
