import type { GameInputAction } from '../systems/input/actions';
import type {
  AnimationAction,
  Element,
  Facing,
  PlaybackMode,
} from '../types/character';

export interface PreviewSnapshot {
  readonly element: Element;
  readonly animation: AnimationAction;
  readonly facing: Facing;
  readonly mode: PlaybackMode;
  readonly afterOnce: 'hold' | 'idle';
  readonly paused: boolean;
  readonly completed: boolean;
  readonly error: string | null;
}

export type PreviewCommand =
  | { type: 'input'; action: GameInputAction }
  | { type: 'animation'; action: AnimationAction }
  | { type: 'mode'; mode: PlaybackMode }
  | { type: 'after_once'; value: 'hold' | 'idle' }
  | { type: 'facing'; facing: Facing }
  | { type: 'pause_animation'; paused: boolean }
  | { type: 'replay' };

/** Per-canvas, discrete command/state boundary. Never publishes animation frames. */
export class PreviewBridge {
  private snapshot: PreviewSnapshot | null = null;
  private handler: ((command: PreviewCommand) => void) | undefined;
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): PreviewSnapshot | null => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  connect(handler: (command: PreviewCommand) => void): () => void {
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = undefined;
    };
  }

  send(command: PreviewCommand): void {
    this.handler?.(command);
  }

  publish(snapshot: PreviewSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  dispose(): void {
    this.handler = undefined;
    this.listeners.clear();
    this.snapshot = null;
  }
}
