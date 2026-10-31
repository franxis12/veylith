import type Phaser from 'phaser';
import { CHARACTER_ANIMATIONS } from '../systems/animation/animationRegistry';
import type { CharacterAnimation } from '../systems/animation/animationRegistry';

export type CharacterLoadScope = 'idle' | 'gameplay' | 'all';

/** 24 original character sheets / 146 MiB decoded RGBA. Effects have their own manifest. */
const GAMEPLAY_ACTIONS = new Set([
  'idle',
  'run',
  'jump',
  'fall',
  'double_jump',
  'glide_loop',
  'attack',
  'smash',
  'push_start',
  'push_loop',
  'push_end',
]);

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function queueCharacterAssets(
  scene: Phaser.Scene,
  scope: CharacterLoadScope,
): readonly CharacterAnimation[] {
  const clips = CHARACTER_ANIMATIONS.filter(
    (clip) =>
      scope === 'all' ||
      (scope === 'gameplay'
        ? GAMEPLAY_ACTIONS.has(clip.action)
        : clip.action === 'idle'),
  );
  for (const clip of clips) {
    if (scene.textures.exists(clip.texture)) continue;
    scene.load.spritesheet(clip.texture, assetUrl(clip.path), {
      frameWidth: clip.frameWidth,
      frameHeight: clip.frameHeight,
      endFrame: clip.frameCount - 1,
    });
  }
  return clips;
}

export function failedCharacterAssets(
  textures: Phaser.Textures.TextureManager,
  clips: readonly CharacterAnimation[],
): string[] {
  return clips
    .filter(
      (clip) =>
        !textures.exists(clip.texture) ||
        textures.get(clip.texture).getFrameNames().length !== clip.frameCount,
    )
    .map((clip) => clip.path);
}
