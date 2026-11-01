import { Capacitor, registerPlugin } from '@capacitor/core';
import { GameCenterController } from './controller';
import type { GameCenterPlugin } from './types';

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
const native =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
export const gameCenter = new GameCenterController(
  native ? registerPlugin<GameCenterPlugin>('VeylithGameCenter') : null,
  storage(),
);
