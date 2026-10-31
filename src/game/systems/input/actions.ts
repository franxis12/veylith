import type { Element } from '../../types/character';

export type InputPhase = 'pressed' | 'released';
export type GameInputAction =
  | {
      type: 'move_left' | 'move_right' | 'jump' | 'use_ability' | 'pause';
      phase: InputPhase;
    }
  | { type: 'switch_element'; phase: 'pressed'; element: Element }
  | { type: 'restart_level'; phase: 'pressed' }
  | { type: 'aim_reflector'; phase: 'pressed'; angle: number }
  | { type: 'turn_reflector'; phase: 'pressed'; degrees: number }
  | { type: 'close_reflector'; phase: 'pressed' };

export type InputSink = (action: GameInputAction) => void;

/** Future keyboard and touch adapters must emit the same device-independent actions. */
export interface InputSource {
  connect: (sink: InputSink) => () => void;
}
