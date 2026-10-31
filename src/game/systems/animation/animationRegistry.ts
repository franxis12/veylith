import type Phaser from 'phaser';
import { CHARACTER_SHEETS } from '../../assets/characterSheets';
import type { CharacterSheet } from '../../assets/characterSheets';
import { ANIMATION_ACTIONS, ELEMENTS } from '../../types/character';
import type { AnimationAction, Element } from '../../types/character';

export type AnimationFor<E extends Element> =
  keyof (typeof CHARACTER_SHEETS)[E] & AnimationAction;
export type AnimationId = {
  [E in Element]: `${E}:${AnimationFor<E>}`;
}[Element];

export const ANIMATION_TIMING = {
  idle: { fps: 8, loop: true },
  run: { fps: 12, loop: true },
  jump: { fps: 12, loop: false },
  fall: { fps: 8, loop: true },
  land: { fps: 12, loop: false },
  attack: { fps: 12, loop: false },
  double_jump: { fps: 12, loop: false },
  glide_start: { fps: 10, loop: false },
  glide_loop: { fps: 8, loop: true },
  push_start: { fps: 10, loop: false },
  push_loop: { fps: 10, loop: true },
  push_end: { fps: 10, loop: false },
  smash: { fps: 12, loop: false },
} as const satisfies Record<AnimationAction, { fps: number; loop: boolean }>;

export interface CharacterAnimation extends CharacterSheet {
  readonly id: AnimationId;
  readonly texture: `character:${AnimationId}`;
  readonly element: Element;
  readonly action: AnimationAction;
  readonly fps: number;
  readonly loop: boolean;
}

export function getCharacterAnimation(
  element: Element,
  action: AnimationAction,
): CharacterAnimation | undefined {
  const sheet: CharacterSheet | undefined = (
    CHARACTER_SHEETS[element] as Partial<
      Record<AnimationAction, CharacterSheet>
    >
  )[action];
  if (!sheet) return undefined;
  const id = `${element}:${action}` as AnimationId;
  return {
    ...sheet,
    id,
    texture: `character:${id}`,
    element,
    action,
    ...ANIMATION_TIMING[action],
  };
}

export function availableAnimations(element: Element): AnimationAction[] {
  return ANIMATION_ACTIONS.filter(
    (action) => action in CHARACTER_SHEETS[element],
  );
}

export const CHARACTER_ANIMATIONS: readonly CharacterAnimation[] =
  ELEMENTS.flatMap((element) =>
    availableAnimations(element).flatMap((action) => {
      const animation = getCharacterAnimation(element, action);
      return animation ? [animation] : [];
    }),
  );

/** Register only verified sequences whose textures have actually loaded. */
export function registerCharacterAnimations(
  anims: Phaser.Animations.AnimationManager,
  textures: Phaser.Textures.TextureManager,
): void {
  for (const clip of CHARACTER_ANIMATIONS) {
    if (!textures.exists(clip.texture) || anims.exists(clip.id)) continue;
    anims.create({
      key: clip.id,
      frames: anims.generateFrameNumbers(clip.texture, {
        start: 0,
        end: clip.frameCount - 1,
      }),
      frameRate: clip.fps,
      repeat: clip.loop ? -1 : 0,
    });
  }
}
