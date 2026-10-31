import type { Element } from '../types/character';

// Shared across every form and animation; feet remain the world-space anchor.
export const PLAYER_VISUAL_HEIGHT = 180;
export const PLAYER_BODY = { width: 55.8, height: 156.6 } as const;

/** All four audited idle poses are 455 visible pixels tall, with matching feet. */
export const ELEMENT_CONFIG = {
  water: {
    label: 'Water',
    color: '#6ac9ff',
    referenceHeight: 455,
    anchorX: 297,
  },
  fire: { label: 'Fire', color: '#ffb37d', referenceHeight: 455, anchorX: 297 },
  air: { label: 'Air', color: '#d5e1ef', referenceHeight: 455, anchorX: 297 },
  earth: {
    label: 'Earth',
    color: '#bfd28b',
    referenceHeight: 455,
    anchorX: 297,
  },
} as const satisfies Record<
  Element,
  {
    label: string;
    color: string;
    referenceHeight: number;
    anchorX: number;
  }
>;
