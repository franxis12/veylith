import type { PluginListenerHandle } from '@capacitor/core';

export interface PlayerStatus {
  available: boolean;
  authenticated: boolean;
  playerId?: string;
  displayName?: string;
}
export interface GameCenterPlugin {
  getStatus(): Promise<PlayerStatus>;
  authenticate(): Promise<PlayerStatus>;
  showDashboard(options: {
    view: 'leaderboards' | 'achievements';
  }): Promise<void>;
  submitScore(options: {
    leaderboardId: string;
    score: number;
    playerId: string;
  }): Promise<void>;
  reportAchievement(options: {
    achievementId: string;
    percentComplete: number;
    playerId: string;
  }): Promise<void>;
  addListener(
    event: 'authStateChanged',
    callback: (status: PlayerStatus) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'uiStateChanged',
    callback: (status: { active: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}
export interface GameCenterSnapshot extends PlayerStatus {
  busy: boolean;
  uiActive: boolean;
  notice: 'none' | 'unavailable' | 'notSent' | 'sent';
}
export interface CompletionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
