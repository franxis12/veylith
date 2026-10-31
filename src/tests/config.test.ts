import { describe, expect, it, vi } from 'vitest';
import capacitorConfig from '../../capacitor.config';
import { APP_CONFIG } from '../app/config';
import { GAME_SETTINGS, getRenderScale } from '../game/config/settings';
import { createGameConfig } from '../game/core/GameConfig';

vi.mock('phaser', () => ({
  default: { AUTO: 0, Scale: { FIT: 3, CENTER_BOTH: 1 } },
}));
vi.mock('../game/scenes/BootScene', () => ({ BootScene: class {} }));
vi.mock('../game/scenes/MainScene', () => ({ MainScene: class {} }));

describe('application configuration', () => {
  it('keeps native identity and built web assets aligned', () => {
    expect(capacitorConfig.appName).toBe(APP_CONFIG.name);
    expect(capacitorConfig.appId).toBe(APP_CONFIG.id);
    expect(APP_CONFIG.id).toMatch(/^[a-z][\w]*(\.[a-z][\w]*){2,}$/);
    expect(capacitorConfig.webDir).toBe('dist');
    expect(APP_CONFIG.orientation).toBe('landscape');
  });

  it('lets CSS own safe areas without native scrolling or a development server', () => {
    expect(capacitorConfig.ios).toMatchObject({
      contentInset: 'never',
      scrollEnabled: false,
    });
    expect(capacitorConfig.backgroundColor).toBe(GAME_SETTINGS.backgroundColor);
    expect(capacitorConfig.server).toBeUndefined();
  });
});

describe('game configuration', () => {
  it('uses FIT with centering and Arcade Physics, leaving device input to action adapters', () => {
    const parent = document.createElement('div');
    const config = createGameConfig(parent, vi.fn(), 1);
    expect(config.parent).toBe(parent);
    expect(config.scale).toMatchObject({
      mode: 3,
      autoCenter: 1,
      width: 1280,
      height: 720,
    });
    expect(config.physics).toMatchObject({
      default: 'arcade',
      arcade: { debug: false },
    });
    expect(config.input).toEqual({
      keyboard: false,
      mouse: false,
      touch: false,
      gamepad: false,
    });
    expect(config.scene).toHaveLength(2);
  });

  it('caps the Retina backing buffer while preserving the virtual aspect ratio', () => {
    const config = createGameConfig(document.createElement('div'), vi.fn(), 3);
    expect(config.scale).toMatchObject({ width: 2560, height: 1440 });
    expect(GAME_SETTINGS.width / GAME_SETTINGS.height).toBe(16 / 9);
    expect(GAME_SETTINGS.width).toBe(1280);
    expect(GAME_SETTINGS.height).toBe(720);
  });

  it.each([
    [1, 1],
    [1.25, 2],
    [2, 2],
    [3, 2],
    [0.75, 1],
    [0, 1],
    [-1, 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
  ])('uses a bounded render scale for DPR %s', (input, expected) => {
    expect(getRenderScale(input)).toBe(expected);
  });
});
