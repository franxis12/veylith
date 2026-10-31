import { describe, expect, it } from 'vitest';
import { campaignLevel, rateTime } from '../game/levels/catalog';
import {
  completeLevel,
  decodeProgress,
  emptyProgress,
  isUnlocked,
  loadProgress,
  SAVE_KEY,
  saveProgress,
} from '../services/progress/progress';
import type { StoragePort } from '../services/progress/progress';
import { createProgressStore } from '../stores/progressStore';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('time thresholds and rewards', () => {
  it.each([
    [0, 3],
    [60_000, 3],
    [60_001, 2],
    [100_000, 2],
    [100_001, 1],
  ])('awards %s ms its exact boundary rating %s', (time, stars) =>
    expect(rateTime(campaignLevel('forest'), time)).toBe(stars),
  );
  it('uses each level configuration and rejects invalid times', () => {
    expect(rateTime(campaignLevel('puzzle'), 30_000)).toBe(2);
    expect(rateTime(campaignLevel('forest'), 30_000)).toBe(3);
    for (const time of [-1, NaN, Infinity])
      expect(() => completeLevel(emptyProgress(), 'forest', time)).toThrow();
  });
  it('only pays the difference and keeps best time/stars on a worse replay', () => {
    let progress = emptyProgress();
    const attempts = [
      [120_000, 30, 1],
      [140_000, 0, 1],
      [80_000, 30, 2],
      [70_000, 0, 2],
      [40_000, 40, 3],
      [30_000, 0, 3],
    ];
    for (const [time, earned, stars] of attempts) {
      const completed = completeLevel(progress, 'forest', time!);
      expect(completed.result.earnedCoins).toBe(earned);
      expect(completed.result.stars).toBe(stars);
      progress = completed.progress;
    }
    expect(progress.coins).toBe(100);
    const worse = completeLevel(progress, 'forest', 150_000);
    expect(worse.result).toMatchObject({
      newRecord: false,
      stars: 1,
      earnedCoins: 0,
      bestTimeMs: 30_000,
    });
    expect(worse.progress.levels.forest?.stars).toBe(3);
    expect(completeLevel(progress, 'forest', 30_000).result.newRecord).toBe(
      false,
    );
  });
});

describe('progression', () => {
  it('starts with only the first level open, rejects bypass, and unlocks the next on one star', () => {
    const blank = emptyProgress();
    expect(isUnlocked(blank, 'forest')).toBe(true);
    expect(isUnlocked(blank, 'puzzle')).toBe(false);
    expect(() => completeLevel(blank, 'puzzle', 10_000)).toThrow('locked');
    const won = completeLevel(blank, 'forest', 200_000).progress;
    expect(isUnlocked(won, 'puzzle')).toBe(true);
    expect(won.lastLevel).toBe('puzzle');
    const final = completeLevel(won, 'puzzle', 10_000).progress;
    expect(final.coins).toBe(130);
    expect(final.lastLevel).toBe('puzzle');
  });
});

describe('versioned local storage', () => {
  it('round trips records and continues an unlocked level after reload without double payment', () => {
    const storage = memoryStorage();
    const first = createProgressStore(storage);
    expect(first.getState().selectLevel('puzzle')).toBe(false);
    first.getState().complete('forest', 120_000);
    expect(first.getState().selectLevel('puzzle')).toBe(true);
    const reloaded = createProgressStore(storage);
    expect(reloaded.getState().progress.lastLevel).toBe('puzzle');
    expect(reloaded.getState().complete('forest', 130_000).earnedCoins).toBe(0);
    expect(reloaded.getState().complete('forest', 20_000).earnedCoins).toBe(70);
    expect(reloaded.getState().progress.coins).toBe(100);
    expect(decodeProgress(storage.values.get(SAVE_KEY)!)).toEqual(
      reloaded.getState().progress,
    );
  });
  it.each([
    '{',
    'null',
    '{}',
    '{"version":0}',
    '{"version":1,"coins":999,"lastLevel":"forest","levels":{}}',
  ])('recovers malformed data without deleting the original: %s', (raw) => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, raw);
    expect(loadProgress(storage)).toMatchObject({
      status: 'recovered',
      progress: emptyProgress(),
    });
    expect(storage.getItem(`${SAVE_KEY}.recovery`)).toBe(raw);
  });
  it('rejects invalid records, impossible progression and mismatched currency', () => {
    const valid = completeLevel(emptyProgress(), 'forest', 50_000).progress;
    for (const invalid of [
      { ...valid, coins: 500 },
      {
        ...valid,
        levels: { forest: { bestTimeMs: -1, stars: 3, awardedCoins: 100 } },
      },
      {
        ...valid,
        levels: { forest: { bestTimeMs: 10, stars: 4, awardedCoins: 100 } },
      },
      { ...emptyProgress(), lastLevel: 'puzzle' },
      {
        ...valid,
        lastLevel: 'puzzle',
        levels: { puzzle: valid.levels.forest },
      },
    ])
      expect(() => decodeProgress(JSON.stringify(invalid))).toThrow();
  });
  it('preserves saves from a newer app version rather than overwriting them', () => {
    const storage = memoryStorage();
    const newer = '{"version":2,"important":"keep"}';
    storage.setItem(SAVE_KEY, newer);
    const store = createProgressStore(storage);
    store.getState().complete('forest', 1000);
    expect(store.getState().storageStatus).toBe('future');
    expect(storage.getItem(SAVE_KEY)).toBe(newer);
  });
  it('survives denied storage reads and quota errors with an in-memory reward ledger', () => {
    const broken: StoragePort = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota');
      },
    };
    expect(loadProgress(broken).status).toBe('unavailable');
    expect(saveProgress(broken, emptyProgress())).toBe(false);
    const store = createProgressStore(broken);
    expect(store.getState().complete('forest', 1000).earnedCoins).toBe(100);
    expect(store.getState().complete('forest', 1000).earnedCoins).toBe(0);
    expect(store.getState().progress.coins).toBe(100);
    expect(store.getState().storageStatus).toBe('unavailable');
  });
});
