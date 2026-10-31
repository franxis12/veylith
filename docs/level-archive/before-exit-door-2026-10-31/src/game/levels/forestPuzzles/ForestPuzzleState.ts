import type { ReflectorSnapshot } from '../../systems/world/ReflectorInteraction';
import { blockPressesPlate } from './heavyBlockRules';
import { CoinState } from '../../systems/coins/CoinState';
import type { PickupBounds } from '../../systems/gems/GemState';
import type { SolidBounds } from '../../systems/powers/projectileCollision';
export { BLOCK } from './heavyBlockRules';
import type { Element } from '../../types/character';
import type { ForestPuzzleLayout } from './layouts';

export interface ForestPuzzleSnapshot {
  readonly kind: 'forest-puzzle';
  readonly phase: 'exploring' | 'complete';
  readonly hint: string;
  readonly hints?: readonly string[];
  readonly reflector?: ReflectorSnapshot | null;
  readonly solved: number;
  readonly total: number;
  readonly coinValue: number;
  readonly coinTotal: number;
}
export interface PuzzlePlayer {
  readonly x: number;
  readonly feetY: number;
  readonly grounded: boolean;
  readonly element: Element;
  readonly gliding: boolean;
}

/** Attempt-local, latched mechanisms. Restart reconstructs this state and every gem. */
export class ForestPuzzleState {
  private readonly solved = new Set<string>();
  private readonly hits = new Map<string, number>();
  private crossedWithAir = false;
  private complete = false;
  private readonly dockedBlocks = new Set<string>();
  readonly coins: CoinState;

  constructor(readonly layout: ForestPuzzleLayout) {
    this.coins = new CoinState(
      layout.document.objects.filter((o) => o.type === 'coin'),
    );
  }
  collectCoins(bounds: PickupBounds) {
    return this.complete ? [] : this.coins.collect(bounds);
  }
  isSolved(id: string): boolean {
    return this.solved.has(id);
  }
  setWorldSignal(id: string, active: boolean): void {
    if (this.complete) return;
    if (active) this.solved.add(id);
    else this.solved.delete(id);
  }
  targetHits(id: string): number {
    return this.hits.get(id) ?? 0;
  }
  gateOpen(id: string): boolean {
    const gate = this.layout.gates.find((entry) => entry.id === id);
    return (
      !!gate &&
      (gate.initiallyOpen ||
        gate.requires.every((required) => this.isSolved(required)))
    );
  }
  hitTarget(id: string, element: Element): void {
    if (this.complete || this.isSolved(id)) return;
    const target = this.layout.targets.find((entry) => entry.id === id);
    if (!target || element !== (target.kind === 'tank' ? 'water' : 'fire'))
      return;
    const hits = this.targetHits(id) + 1;
    this.hits.set(id, hits);
    if (hits >= target.hits) this.solved.add(id);
  }
  breakWall(id: string): void {
    if (!this.complete && id === this.layout.wall?.id) this.solved.add(id);
  }
  isBlockDocked(id: string): boolean {
    return this.dockedBlocks.has(id);
  }
  /** Latch only the contacting block, even when several share a destination plate. */
  observeBlock(id: string, bounds: SolidBounds, supported: boolean): void {
    const block = this.layout.blocks.find((entry) => entry.id === id);
    if (!block?.plateBounds || this.complete || this.isBlockDocked(id)) return;
    if (blockPressesPlate(bounds, block.plateBounds, supported)) {
      this.solved.add(block.plateId);
      this.dockedBlocks.add(id);
    }
  }
  update(player: PuzzlePlayer): boolean {
    if (this.complete) return false;
    if (player.feetY >= this.layout.fallLimit) return true;
    const crossing = this.layout.crossing;
    if (crossing) {
      if (
        player.x > crossing.from &&
        player.x < crossing.to &&
        player.element === 'air' &&
        player.gliding
      )
        this.crossedWithAir = true;
      // A cancelled crossing must not credit a later jump with another element.
      if (player.grounded && player.x <= crossing.from)
        this.crossedWithAir = false;
      if (
        this.crossedWithAir &&
        player.grounded &&
        player.element === 'air' &&
        player.x >= crossing.to &&
        Math.abs(player.feetY - crossing.landingY) < 3
      )
        this.solved.add(crossing.id);
    }
    this.complete = this.layout.exits.some(
      (exit) =>
        exit.requires.every((id) => this.isSolved(id)) &&
        player.grounded &&
        Math.abs(player.x - exit.x) <= exit.halfWidth &&
        Math.abs(player.feetY - exit.feetY) < exit.tolerance,
    );
    return false;
  }
  get snapshot(): ForestPuzzleSnapshot {
    const next = this.layout.objectives.find(
      (objective) => !this.isSolved(objective.id),
    );
    const target = this.layout.targets.find((entry) => entry.id === next?.id);
    return {
      kind: 'forest-puzzle',
      phase: this.complete ? 'complete' : 'exploring',
      solved: this.solved.size,
      total: this.layout.objectives.length,
      coinValue: this.coins.value,
      coinTotal: this.coins.totalValue,
      ...(this.layout.document.puzzle
        ? { hints: this.layout.document.puzzle.hints }
        : {}),
      hint:
        this.layout.document.puzzle?.brief ??
        (next
          ? `${next.hint}${target?.kind === 'tank' ? ` (${this.targetHits(target.id)}/${target.hits})` : ''}`
          : 'Mecanismos resueltos. Entra en el portal de salida.'),
    };
  }
}
