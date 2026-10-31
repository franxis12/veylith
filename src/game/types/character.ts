export const ELEMENTS = ['water', 'fire', 'air', 'earth'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ANIMATION_ACTIONS = [
  'idle',
  'run',
  'jump',
  'fall',
  'land',
  'attack',
  'double_jump',
  'glide_start',
  'glide_loop',
  'push_start',
  'push_loop',
  'push_end',
  'smash',
] as const;
export type AnimationAction = (typeof ANIMATION_ACTIONS)[number];
export type Facing = 'left' | 'right';
export type PlaybackMode = 'default' | 'loop' | 'once';

export function isElement(value: string): value is Element {
  return ELEMENTS.some((element) => element === value);
}

export function isAnimationAction(value: string): value is AnimationAction {
  return ANIMATION_ACTIONS.some((action) => action === value);
}
