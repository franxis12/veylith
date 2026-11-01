import type { PluginListenerHandle } from '@capacitor/core';
import {
  GAME_CENTER_ACHIEVEMENTS,
  GAME_CENTER_LEVELS,
  isRankedLevel,
  leaderboardId,
  MAX_SCORE_MS,
} from './config';
import { PlayerCompletions } from './completions';
import type {
  CompletionStorage,
  GameCenterPlugin,
  GameCenterSnapshot,
  PlayerStatus,
} from './types';

export interface RankedAttempt {
  readonly playerId: string;
  readonly epoch: number;
}
const unavailable: GameCenterSnapshot = {
  available: false,
  authenticated: false,
  busy: false,
  uiActive: false,
  notice: 'none',
};

/** Native failures never escape into gameplay. No old progress or queued scores are replayed. */
export class GameCenterController {
  private snapshot: GameCenterSnapshot = unavailable;
  private readonly listeners = new Set<() => void>();
  private readonly handles: PluginListenerHandle[] = [];
  private readonly attempts = new WeakSet<RankedAttempt>();
  private readonly completions: PlayerCompletions;
  private readonly submittedBest = new Map<string, number>();
  private epoch = 0;
  private revision = 0;
  private started: Promise<void> | undefined;
  private disposed = false;

  constructor(
    private readonly plugin: GameCenterPlugin | null,
    storage?: CompletionStorage,
  ) {
    this.completions = new PlayerCompletions(storage);
  }
  getSnapshot = (): GameCenterSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(value: Partial<GameCenterSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...value };
    this.listeners.forEach((listener) => listener());
  }
  private apply(status: PlayerStatus): void {
    const playerId =
      status.available &&
      status.authenticated &&
      typeof status.playerId === 'string' &&
      status.playerId.length > 0 &&
      status.playerId.length <= 512
        ? status.playerId
        : undefined;
    if (playerId !== this.snapshot.playerId) {
      this.epoch += 1;
      this.submittedBest.clear();
    }
    this.revision += 1;
    // Replace, rather than spread, so signing out removes the previous identity.
    this.snapshot = {
      available: status.available === true,
      authenticated: status.available === true && !!playerId,
      busy: this.snapshot.busy,
      uiActive: this.snapshot.uiActive,
      notice: 'none',
      ...(playerId ? { playerId } : {}),
      ...(playerId && typeof status.displayName === 'string'
        ? { displayName: status.displayName.slice(0, 128) }
        : {}),
    };
    this.listeners.forEach((listener) => listener());
  }
  initialize(): Promise<void> {
    if (!this.plugin || this.disposed) return Promise.resolve();
    this.started ??= this.start();
    return this.started;
  }
  private async start(): Promise<void> {
    const plugin = this.plugin!;
    try {
      const auth = await plugin.addListener('authStateChanged', (status) => {
        if (!this.disposed) this.apply(status);
      });
      if (this.disposed) {
        await auth.remove();
        return;
      }
      this.handles.push(auth);
      const ui = await plugin.addListener('uiStateChanged', ({ active }) =>
        this.update({ uiActive: active === true }),
      );
      if (this.disposed) {
        await ui.remove();
        return;
      }
      this.handles.push(ui);
      await this.authenticate();
    } catch {
      this.update({ available: true, busy: false, notice: 'unavailable' });
    }
  }
  async authenticate(): Promise<void> {
    if (!this.plugin || this.disposed || this.snapshot.busy) return;
    this.update({ available: true, busy: true, notice: 'none' });
    const revision = this.revision;
    try {
      const result = await this.plugin.authenticate();
      if (!this.disposed && revision === this.revision) this.apply(result);
    } catch {
      this.update({ notice: 'unavailable' });
    } finally {
      this.update({ busy: false });
    }
  }
  async refresh(): Promise<void> {
    if (!this.plugin || this.disposed || !this.started) return;
    const revision = this.revision;
    try {
      const result = await this.plugin.getStatus();
      if (!this.disposed && revision === this.revision) this.apply(result);
    } catch {
      /* Existing identity is still revalidated natively on each submission. */
    }
  }
  async showDashboard(view: 'leaderboards' | 'achievements'): Promise<void> {
    if (!this.plugin || !this.snapshot.authenticated || this.snapshot.busy)
      return;
    this.update({ busy: true, notice: 'none' });
    try {
      await this.plugin.showDashboard({ view });
    } catch {
      this.update({ notice: 'unavailable' });
    } finally {
      this.update({ busy: false });
      await this.refresh();
    }
  }
  captureAttempt(): RankedAttempt | null {
    const playerId = this.snapshot.authenticated
      ? this.snapshot.playerId
      : undefined;
    if (!playerId || this.disposed) return null;
    const token = Object.freeze({ playerId, epoch: this.epoch });
    this.attempts.add(token);
    return token;
  }
  private matches(token: RankedAttempt): boolean {
    return (
      !this.disposed &&
      this.snapshot.authenticated &&
      token.epoch === this.epoch &&
      token.playerId === this.snapshot.playerId
    );
  }
  async completeAttempt(
    token: RankedAttempt | null,
    level: string,
    elapsedMs: number,
  ): Promise<void> {
    if (!token || !this.attempts.has(token)) return;
    this.attempts.delete(token);
    if (
      !this.plugin ||
      !this.matches(token) ||
      !isRankedLevel(level) ||
      !Number.isFinite(elapsedMs) ||
      elapsedMs <= 0 ||
      elapsedMs > MAX_SCORE_MS
    )
      return;
    const score = Math.max(1, Math.ceil(elapsedMs));
    const count = this.completions.record(token.playerId, level);
    const id = leaderboardId(level);
    try {
      if (score < (this.submittedBest.get(id) ?? Infinity)) {
        await this.plugin.submitScore({
          leaderboardId: id,
          score,
          playerId: token.playerId,
        });
        if (!this.matches(token)) return;
        this.submittedBest.set(
          id,
          Math.min(score, this.submittedBest.get(id) ?? Infinity),
        );
      }
      if (!this.matches(token)) return;
      await this.plugin.reportAchievement({
        achievementId: GAME_CENTER_ACHIEVEMENTS.firstWin,
        percentComplete: 100,
        playerId: token.playerId,
      });
      if (!this.matches(token)) return;
      await this.plugin.reportAchievement({
        achievementId: GAME_CENTER_ACHIEVEMENTS.earthComplete,
        percentComplete: (count / GAME_CENTER_LEVELS.length) * 100,
        playerId: token.playerId,
      });
      if (this.matches(token)) this.update({ notice: 'sent' });
    } catch {
      if (this.matches(token)) this.update({ notice: 'notSent' });
    }
  }
  dispose(): void {
    this.disposed = true;
    this.epoch += 1;
    this.listeners.clear();
    this.handles.splice(0).forEach((handle) => {
      void handle.remove().catch(() => {});
    });
  }
}
