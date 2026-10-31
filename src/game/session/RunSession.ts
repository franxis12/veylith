import type { Element } from '../types/character';
import type { CompletionResult } from '../../services/progress/progress';

export type RunPhase = 'loading' | 'playing' | 'paused' | 'complete';
export interface RunSnapshot {
  readonly phase: RunPhase;
  readonly elapsedMs: number;
  readonly element: Element;
  readonly result: CompletionResult | null;
}

/** Application run metadata only. World state and movement stay in Phaser. */
export class RunSession {
  private elapsed = 0;
  private anchor: number | null = null;
  private loaded = false;
  private foreground = true;
  private manualPause = false;
  private finished = false;
  private presentation = false;
  private snapshot: RunSnapshot = {
    phase: 'loading',
    elapsedMs: 0,
    element: 'water',
    result: null,
  };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly onComplete?: (
      elapsedMs: number,
      collectedCoinIds: readonly string[],
    ) => CompletionResult,
    private readonly now: () => number = () => performance.now(),
  ) {}

  getSnapshot = (): RunSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  get suspended(): boolean {
    return !this.foreground || this.manualPause || this.finished;
  }

  private sample(): void {
    const now = this.now();
    if (this.anchor !== null) this.elapsed += Math.max(0, now - this.anchor);
    this.anchor =
      this.loaded && !this.suspended && !this.presentation ? now : null;
  }
  private publish(element = this.snapshot.element, force = false): void {
    const phase: RunPhase = this.finished
      ? 'complete'
      : this.suspended
        ? 'paused'
        : this.loaded
          ? 'playing'
          : 'loading';
    if (
      !force &&
      phase === this.snapshot.phase &&
      element === this.snapshot.element &&
      Math.floor(this.elapsed / 100) ===
        Math.floor(this.snapshot.elapsedMs / 100)
    )
      return;
    this.snapshot = {
      ...this.snapshot,
      phase,
      elapsedMs: this.elapsed,
      element,
    };
    this.listeners.forEach((listener) => listener());
  }
  setPresentation(active: boolean): void {
    if (active === this.presentation) return;
    this.sample();
    this.presentation = active;
    this.anchor = null;
    this.sample();
    this.publish();
  }
  start(element: Element): void {
    this.elapsed = 0;
    this.anchor = null;
    this.loaded = true;
    this.finished = false;
    this.presentation = false;
    this.snapshot = { ...this.snapshot, result: null };
    this.sample();
    this.publish(element, true);
  }
  tick(element: Element): void {
    this.sample();
    this.publish(element);
  }
  pause(): void {
    this.sample();
    this.manualPause = true;
    this.anchor = null;
    this.publish();
  }
  resume(): void {
    this.manualPause = false;
    this.sample();
    this.publish();
  }
  setForeground(active: boolean): void {
    this.sample();
    this.foreground = active;
    // Returning from another app requires an explicit resume.
    if (!active && this.loaded && !this.finished) this.manualPause = true;
    this.anchor = null;
    this.sample();
    this.publish();
  }
  retry(): void {
    this.elapsed = 0;
    this.anchor = null;
    this.loaded = false;
    this.manualPause = false;
    this.finished = false;
    this.presentation = false;
    this.snapshot = { ...this.snapshot, result: null };
    this.publish('water', true);
  }
  complete(collectedCoinIds: readonly string[] = []): void {
    if (!this.loaded || this.finished || this.suspended || this.presentation)
      return;
    this.sample();
    this.finished = true;
    this.anchor = null;
    this.snapshot = {
      ...this.snapshot,
      result: this.onComplete?.(this.elapsed, [...collectedCoinIds]) ?? null,
    };
    this.publish(this.snapshot.element, true);
  }
  dispose(): void {
    this.loaded = false;
    this.anchor = null;
    this.listeners.clear();
  }
}
