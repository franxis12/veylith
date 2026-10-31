import type { ForestPuzzleSnapshot } from './forestPuzzles/ForestPuzzleState';
import type { ForestSnapshot } from './ancientForest/ForestState';
import type { PuzzleSnapshot } from './firstPuzzle/FirstPuzzleState';

export type LevelSnapshot =
  PuzzleSnapshot | ForestSnapshot | ForestPuzzleSnapshot;

/** Discrete per-canvas UI snapshots; level rules stay in Phaser. */
export class LevelProgress {
  private snapshot: LevelSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): LevelSnapshot | null => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  publish(snapshot: LevelSnapshot | null): void {
    const old = this.snapshot;
    // Snapshots are small flat records and only publish on a discrete change.
    if (old === snapshot || JSON.stringify(old) === JSON.stringify(snapshot))
      return;
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
