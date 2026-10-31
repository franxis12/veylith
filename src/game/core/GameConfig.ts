import {
  FOREST_PUZZLES,
  isForestPuzzle,
} from '../levels/forestPuzzles/layouts';
import Phaser from 'phaser';
import { GAME_SETTINGS, getRenderScale } from '../config/settings';
import { BootScene } from '../scenes/BootScene';
import { MainScene } from '../scenes/MainScene';
import type { GameOptions } from './GameOptions';
import { environmentNames } from '../assets/environmentCatalog';

export function createGameConfig(
  parent: HTMLElement,
  onReady: () => void,
  devicePixelRatio = window.devicePixelRatio,
  options: GameOptions = {},
): Phaser.Types.Core.GameConfig {
  const renderScale = getRenderScale(devicePixelRatio);
  const document =
    options.document ??
    (isForestPuzzle(options.level)
      ? FOREST_PUZZLES[options.level].document
      : undefined);

  return {
    type: Phaser.AUTO,
    // Direct image loading reuses the browser cache and avoids repeated blob copies
    // when editor playtests remount large illustrated scenes.
    loader: { imageLoadType: 'HTMLImageElement', maxParallelDownloads: 8 },
    parent,
    backgroundColor: GAME_SETTINGS.backgroundColor,
    banner: false,
    // Preserve elapsed time from the first frame, including on 30 Hz devices.
    // Keep Phaser's large-delta/tab-loss protection, without its 120-frame clamp.
    fps: { smoothStep: true, panicMax: 0, deltaHistory: 1 },
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_SETTINGS.width * renderScale,
      height: GAME_SETTINGS.height * renderScale,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { ...GAME_SETTINGS.gravity }, debug: false },
    },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scene: [
      new BootScene(
        options.scene?.key,
        options.scene?.assets,
        options.onError,
        !options.scene &&
          ((options.level ?? 'forest') === 'forest' ||
            isForestPuzzle(options.level) ||
            !!options.document),
        document?.objects
          .filter((o) => o.type === 'world')
          .map((o) => o.kind) ?? [],
        environmentNames(document?.objects ?? []),
        document?.objects ?? [],
      ),
      options.scene?.create(renderScale, onReady) ??
        new MainScene(
          renderScale,
          onReady,
          options.input,
          options.progress,
          options.level,
          options.run,
          options.document,
          options.audio,
        ),
    ],
  };
}
