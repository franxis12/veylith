import { ANCIENT_FOREST } from './layout';

export type ForestSection = 'arrival' | 'fire' | 'glide' | 'ruins';
export interface ForestSnapshot {
  readonly kind: 'forest';
  readonly phase: 'exploring' | 'complete';
  readonly section: ForestSection;
}

/** Only discrete hints and completion leave Phaser; there is no saved progression. */
export class ForestState {
  private complete = false;
  private section: ForestSection = 'arrival';

  get snapshot(): ForestSnapshot {
    return {
      kind: 'forest',
      phase: this.complete ? 'complete' : 'exploring',
      section: this.section,
    };
  }

  update(player: { x: number; feetY: number; grounded: boolean }): boolean {
    if (this.complete) return false;
    if (player.feetY >= ANCIENT_FOREST.fallLimit) return true;
    this.section =
      player.x >= 4096
        ? 'ruins'
        : player.x >= 2530
          ? 'glide'
          : player.x >= 1408
            ? 'fire'
            : 'arrival';
    const exit = ANCIENT_FOREST.exit;
    this.complete =
      player.grounded &&
      Math.abs(player.x - exit.x) <= exit.halfWidth &&
      Math.abs(player.feetY - exit.feetY) <= 2;
    return false;
  }
}
