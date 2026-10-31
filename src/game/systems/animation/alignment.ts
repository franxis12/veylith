import { ELEMENT_CONFIG, PLAYER_VISUAL_HEIGHT } from '../../config/elements';
import type { CharacterAnimation } from './animationRegistry';
import type { Facing } from '../../types/character';

export function frameAlignment(
  clip: CharacterAnimation,
  frame: number,
  facing: Facing,
) {
  const config = ELEMENT_CONFIG[clip.element];
  const footY = clip.footY[frame];
  if (footY === undefined)
    throw new Error(`Missing alignment: ${clip.id} frame ${frame}`);
  const originX = config.anchorX / clip.frameWidth;
  return {
    // Phaser flips the texture inside its quad; mirror the off-center pivot too.
    originX: facing === 'left' ? 1 - originX : originX,
    originY: footY / clip.frameHeight,
    scale: PLAYER_VISUAL_HEIGHT / config.referenceHeight,
  };
}
