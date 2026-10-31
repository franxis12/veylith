import type Phaser from 'phaser';
import { ELEMENTS } from '../types/character';
import type { Element } from '../types/character';
import { queueOptionalSheet, registerOptionalSheet } from './optionalSheet';
import type { OptionalSheet } from './optionalSheet';

export const GEM_ACTIONS = ['idle', 'spawn', 'collect'] as const;
export type GemAction = (typeof GEM_ACTIONS)[number];
export const gemKey = (element: Element, action: GemAction): string =>
  `gem:${element}:${action}`;

/** All 12 paths and dimensions verified against the supplied horizontal RGBA strips. */
export const GEM_SHEETS = ELEMENTS.flatMap((element) =>
  GEM_ACTIONS.map(
    (action) =>
      ({
        element,
        action,
        key: gemKey(element, action),
        path: `assets/items/gems/${element}/${action}/${element}_gem_${action}_spritesheet.png`,
        width: 256,
        height: 256,
        frames: action === 'idle' ? 8 : 6,
        fps: action === 'idle' ? 10 : 16,
        loop: action === 'idle',
      }) satisfies OptionalSheet & {
        element: Element;
        action: GemAction;
        key: string;
      },
  ),
);

export function queueGemAssets(scene: Phaser.Scene): void {
  for (const sheet of GEM_SHEETS) queueOptionalSheet(scene, sheet.key, sheet);
}

export function registerGemAnimations(scene: Phaser.Scene): void {
  for (const sheet of GEM_SHEETS)
    registerOptionalSheet(scene, sheet.key, sheet);
}
