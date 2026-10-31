import Phaser from 'phaser';
import { gameAudio } from '../../services/audio/gameAudio';
import { bindRunAudio } from '../../services/audio/runAudio';
import { observeAppActivity } from '../../services/lifecycle/observeAppActivity';
import { createGameConfig } from './GameConfig';
import type { GameOptions } from './GameOptions';

export interface GameHandle {
  destroy: () => void;
}

const activeContainers = new WeakSet<HTMLElement>();

/** React owns this handle; scenes never import React or the application store. */
export function createGame(
  parent: HTMLElement,
  onReady: () => void,
  options: GameOptions = {},
): GameHandle {
  if (activeContainers.has(parent)) {
    throw new Error('A Phaser game is already attached to this container.');
  }

  const audio = options.scene ? undefined : gameAudio.createScope('world');
  const disconnectAudio =
    !options.scene && options.run
      ? bindRunAudio(options.run, gameAudio)
      : undefined;
  let game: Phaser.Game;
  try {
    game = new Phaser.Game(
      createGameConfig(parent, onReady, window.devicePixelRatio, {
        ...options,
        ...(audio ? { audio } : {}),
      }),
    );
  } catch (error) {
    audio?.dispose();
    disconnectAudio?.();
    throw error;
  }
  activeContainers.add(parent);
  let disposed = false;
  let foreground = true;
  let paused = false;
  const syncPause = (): void => {
    if (disposed) return;
    const suspend = !foreground || (options.run?.suspended ?? false);
    audio?.setPaused(suspend);
    if (suspend) options.input?.reset();
    if (suspend === paused) return;
    paused = suspend;
    if (suspend) game.pause();
    else game.resume();
  };
  const disconnectRun = options.run?.subscribe(syncPause);
  const stopObservingActivity = observeAppActivity((active) => {
    foreground = active;
    options.run?.setForeground(active);
    syncPause();
  });
  const clearInput = (): void => options.input?.reset();
  const blur = (): void => {
    clearInput();
    options.run?.pause();
  };
  window.addEventListener('blur', blur);
  const observer = new ResizeObserver(() => {
    if (game.isBooted && !disposed) game.scale.refresh();
  });
  observer.observe(parent);

  return {
    destroy(): void {
      if (disposed) return;
      disposed = true;
      audio?.dispose();
      disconnectAudio?.();
      observer.disconnect();
      stopObservingActivity();
      window.removeEventListener('blur', blur);
      disconnectRun?.();
      clearInput();
      activeContainers.delete(parent);
      // Phaser finalizes destruction on its next frame. Detach immediately so
      // a remount cannot display the old canvas, and wake a sleeping loop.
      game.canvas?.remove();
      game.destroy(true, false);
      if (game.isRunning) game.loop.wake();
    },
  };
}
