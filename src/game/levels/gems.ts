import type { LevelObject } from './schema/types';
import type { Element } from '../types/character';

export interface GemPlacement {
  readonly id: string;
  readonly element: Element;
  readonly view?: LevelObject;
  /** World-space center, independent of transparent artwork margins. */
  readonly x: number;
  readonly y: number;
}

export interface GemLevel {
  readonly initialElement: Element;
  readonly gems: readonly GemPlacement[];
}
