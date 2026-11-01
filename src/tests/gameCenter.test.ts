import { describe, expect, it, vi } from 'vitest';
import type { PluginListenerHandle } from '@capacitor/core';
import { GameCenterController } from '../services/gameCenter/controller';
import {
  GAME_CENTER_ACHIEVEMENTS,
  GAME_CENTER_LEVELS,
  leaderboardId,
} from '../services/gameCenter/config';
import type {
  GameCenterPlugin,
  PlayerStatus,
} from '../services/gameCenter/types';
import { PlayerCompletions } from '../services/gameCenter/completions';
import { bindRankedRun } from '../services/gameCenter/bindRun';
import { RunSession } from '../game/session/RunSession';
import { completeLevel, emptyProgress } from '../services/progress/progress';

const player = (id: string): PlayerStatus => ({
  available: true,
  authenticated: true,
  playerId: id,
  displayName: id,
});
class NativeMock implements GameCenterPlugin {
  state: PlayerStatus = player('A');
  authChanged: ((status: PlayerStatus) => void) | undefined;
  uiChanged: ((status: { active: boolean }) => void) | undefined;
  remove = vi.fn().mockResolvedValue(undefined);
  authenticate = vi.fn(async () => this.state);
  getStatus = vi.fn(async () => this.state);
  showDashboard = vi
    .fn<(options: { view: 'leaderboards' | 'achievements' }) => Promise<void>>()
    .mockResolvedValue(undefined);
  submitScore = vi
    .fn<
      (options: {
        leaderboardId: string;
        score: number;
        playerId: string;
      }) => Promise<void>
    >()
    .mockResolvedValue(undefined);
  reportAchievement = vi
    .fn<
      (options: {
        achievementId: string;
        percentComplete: number;
        playerId: string;
      }) => Promise<void>
    >()
    .mockResolvedValue(undefined);
  addListener(
    event: 'authStateChanged',
    callback: (status: PlayerStatus) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'uiStateChanged',
    callback: (status: { active: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  async addListener(
    event: string,
    callback:
      | ((status: PlayerStatus) => void)
      | ((status: { active: boolean }) => void),
  ): Promise<PluginListenerHandle> {
    if (event === 'authStateChanged')
      this.authChanged = callback as (status: PlayerStatus) => void;
    else this.uiChanged = callback as (status: { active: boolean }) => void;
    return { remove: this.remove };
  }
  change(status: PlayerStatus) {
    this.state = status;
    this.authChanged?.(status);
  }
}
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
async function ready() {
  const plugin = new NativeMock();
  const saved = storage();
  const service = new GameCenterController(plugin, saved);
  await service.initialize();
  return { plugin, service, saved };
}

describe('Game Center session isolation', () => {
  it('does nothing on web and initializes native authentication only once', async () => {
    const web = new GameCenterController(null);
    await web.initialize();
    await web.authenticate();
    await web.showDashboard('leaderboards');
    expect(web.getSnapshot().available).toBe(false);
    expect(web.captureAttempt()).toBeNull();
    const { service, plugin } = await ready();
    await service.initialize();
    expect(plugin.authenticate).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot()).toMatchObject({
      authenticated: true,
      playerId: 'A',
      busy: false,
    });
  });
  it('tolerates cancelled authentication and reports retry failures without blocking play', async () => {
    const plugin = new NativeMock();
    plugin.state = { available: true, authenticated: false };
    const service = new GameCenterController(plugin);
    await service.initialize();
    expect(service.captureAttempt()).toBeNull();
    plugin.authenticate.mockRejectedValueOnce(Error('offline'));
    await expect(service.authenticate()).resolves.toBeUndefined();
    expect(service.getSnapshot()).toMatchObject({
      authenticated: false,
      busy: false,
      notice: 'unavailable',
    });
    plugin.state = player('A');
    await service.authenticate();
    expect(service.captureAttempt()?.playerId).toBe('A');
  });
  it('rejects pre-auth, duplicate, forged and cross-account attempts including A→B→A', async () => {
    const { service, plugin } = await ready();
    await service.completeAttempt(null, 'forest-1', 1000);
    await service.completeAttempt(
      { playerId: 'A', epoch: 1 },
      'forest-1',
      1000,
    );
    const a = service.captureAttempt();
    plugin.change(player('B'));
    plugin.change(player('A'));
    await service.completeAttempt(a, 'forest-1', 1000);
    expect(plugin.submitScore).not.toHaveBeenCalled();
    const valid = service.captureAttempt();
    await service.completeAttempt(valid, 'forest-1', 1500.2);
    await service.completeAttempt(valid, 'forest-1', 1000);
    expect(plugin.submitScore).toHaveBeenCalledTimes(1);
    expect(plugin.submitScore).toHaveBeenCalledWith({
      playerId: 'A',
      leaderboardId: leaderboardId('forest-1'),
      score: 1501,
    });
  });
  it('keeps stable forest IDs rather than visible numbering and ignores prototypes/invalid scores', async () => {
    const { service, plugin } = await ready();
    for (const [id, ms] of [
      ['forest', 1000],
      ['puzzle', 1000],
      ['forest-1', 0],
      ['forest-1', NaN],
      ['forest-1', Infinity],
      ['forest-1', -10],
      ['forest-1', 86_400_001],
    ] as const) {
      await service.completeAttempt(service.captureAttempt(), id, ms);
    }
    expect(plugin.submitScore).not.toHaveBeenCalled();
    await service.completeAttempt(service.captureAttempt(), 'forest-6', 2000);
    expect(plugin.submitScore).toHaveBeenCalledWith({
      playerId: 'A',
      leaderboardId: 'com.francismartinez.veylith.forest6.time',
      score: 2000,
    });
  });
  it('submits a new player’s own win even if previous player has a faster local best', async () => {
    const { service, plugin } = await ready();
    await service.completeAttempt(service.captureAttempt(), 'forest-1', 500);
    await service.completeAttempt(service.captureAttempt(), 'forest-1', 2000);
    expect(plugin.submitScore).toHaveBeenCalledTimes(1);
    plugin.change(player('B'));
    await service.completeAttempt(service.captureAttempt(), 'forest-1', 9000);
    expect(plugin.submitScore).toHaveBeenLastCalledWith({
      playerId: 'B',
      leaderboardId: leaderboardId('forest-1'),
      score: 9000,
    });
    expect(plugin.reportAchievement).toHaveBeenLastCalledWith({
      playerId: 'B',
      achievementId: GAME_CENTER_ACHIEVEMENTS.earthComplete,
      percentComplete: 10,
    });
  });
  it('never replays a failed result on reconnect, but allows another valid run', async () => {
    const { service, plugin } = await ready();
    plugin.submitScore.mockRejectedValueOnce(Error('network'));
    await service.completeAttempt(service.captureAttempt(), 'forest-1', 700);
    expect(service.getSnapshot().notice).toBe('notSent');
    expect(plugin.reportAchievement).not.toHaveBeenCalled();
    await service.refresh();
    expect(plugin.submitScore).toHaveBeenCalledTimes(1);
    await service.completeAttempt(service.captureAttempt(), 'forest-1', 800);
    expect(plugin.submitScore).toHaveBeenCalledTimes(2);
    expect(service.getSnapshot().notice).toBe('sent');
  });
  it('stops a pending submission chain when the player changes', async () => {
    const { service, plugin } = await ready();
    let finish = () => {};
    plugin.submitScore.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = service.completeAttempt(
      service.captureAttempt(),
      'forest-1',
      1000,
    );
    plugin.change(player('B'));
    finish();
    await pending;
    expect(plugin.reportAchievement).not.toHaveBeenCalled();
    expect(service.getSnapshot()).toMatchObject({
      playerId: 'B',
      notice: 'none',
    });
  });
  it('does not let a stale auth promise replace a newer native identity event', async () => {
    const { service, plugin } = await ready();
    let finish: (status: PlayerStatus) => void = () => {};
    plugin.authenticate.mockImplementationOnce(
      () =>
        new Promise<PlayerStatus>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = service.authenticate();
    plugin.change(player('B'));
    finish(player('A'));
    await pending;
    expect(service.getSnapshot().playerId).toBe('B');
  });
  it('exposes overlay state, recovers dashboard errors, and disposes listeners', async () => {
    const { service, plugin } = await ready();
    plugin.uiChanged?.({ active: true });
    expect(service.getSnapshot().uiActive).toBe(true);
    plugin.uiChanged?.({ active: false });
    await service.showDashboard('achievements');
    expect(plugin.showDashboard).toHaveBeenCalledWith({ view: 'achievements' });
    const attempt = service.captureAttempt();
    service.dispose();
    plugin.change(player('B'));
    await service.completeAttempt(attempt, 'forest-1', 1000);
    expect(plugin.submitScore).not.toHaveBeenCalled();
    expect(plugin.remove).toHaveBeenCalledTimes(2);
  });
});

describe('per-player earned achievement ledger', () => {
  it('persists only authenticated completions across launches, not shared saved progress', async () => {
    const { service, plugin, saved } = await ready();
    saved.values.set(
      'veylith.progress',
      JSON.stringify({
        levels: Object.fromEntries(GAME_CENTER_LEVELS.map((id) => [id, {}])),
      }),
    );
    for (const level of GAME_CENTER_LEVELS.slice(0, 9))
      await service.completeAttempt(service.captureAttempt(), level, 1000);
    expect(plugin.reportAchievement).toHaveBeenLastCalledWith(
      expect.objectContaining({ percentComplete: 90 }),
    );
    service.dispose();
    const next = new GameCenterController(plugin, saved);
    await next.initialize();
    await next.completeAttempt(
      next.captureAttempt(),
      GAME_CENTER_LEVELS[9]!,
      1000,
    );
    expect(plugin.reportAchievement).toHaveBeenLastCalledWith(
      expect.objectContaining({ percentComplete: 100, playerId: 'A' }),
    );
    plugin.change(player('B'));
    await next.completeAttempt(next.captureAttempt(), 'forest-1', 1000);
    expect(plugin.reportAchievement).toHaveBeenLastCalledWith(
      expect.objectContaining({ percentComplete: 10, playerId: 'B' }),
    );
  });
  it('handles invalid/unavailable storage and unique validated IDs', () => {
    const saved = storage();
    saved.values.set('veylith.gamecenter.v1.A', '{bad');
    const ledger = new PlayerCompletions(saved);
    expect(ledger.record('A', 'forest-1')).toBe(1);
    expect(ledger.record('A', 'forest-1')).toBe(1);
    expect(ledger.record('B', 'forest-2')).toBe(1);
    const failing = new PlayerCompletions({
      getItem() {
        throw Error('denied');
      },
      setItem() {
        throw Error('denied');
      },
    });
    expect(failing.record('A', 'forest-1')).toBe(1);
  });
});

it('binds only real post-auth run wins, captures at attempt start, preserves retry/pause and local progress', async () => {
  const { service, plugin } = await ready();
  let now = 0;
  let progress = emptyProgress();
  const run = new RunSession(
    (elapsed) => {
      const completed = completeLevel(progress, 'forest-1', elapsed);
      progress = completed.progress;
      return completed.result;
    },
    () => now,
  );
  bindRankedRun(run, 'forest-1', service);
  plugin.change({ available: true, authenticated: false });
  run.start('earth');
  plugin.change(player('A'));
  now = 500;
  run.complete();
  await Promise.resolve();
  expect(plugin.submitScore).not.toHaveBeenCalled();
  expect(progress.levels['forest-1']).toBeDefined();
  run.retry();
  run.start('earth');
  now = 900;
  run.pause();
  now = 5000;
  run.resume();
  now = 5600;
  run.complete();
  run.complete();
  await vi.waitFor(() =>
    expect(plugin.reportAchievement).toHaveBeenCalledTimes(2),
  );
  expect(plugin.submitScore).toHaveBeenCalledTimes(1);
  expect(plugin.submitScore).toHaveBeenLastCalledWith(
    expect.objectContaining({ score: 1000, playerId: 'A' }),
  );
  expect(progress.levels['forest-1']?.bestTimeMs).toBe(500);
  run.dispose();
});
