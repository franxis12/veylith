import { colliderBounds } from '../../levels/schema/types';
import type { LevelObject } from '../../levels/schema/types';
import type { PickupBounds } from '../gems/GemState';

export type CoinObject = Extract<LevelObject, { type: 'coin' }>;

/** Pickups belong to one attempt. Only successful completion can bank them. */
export class CoinState {
  private readonly collected = new Set<string>();
  private collectedValue = 0;
  readonly totalValue: number;
  constructor(readonly placements: readonly CoinObject[]) {
    this.totalValue = placements.reduce(
      (n, c) => n + (c.collider.enabled ? c.value : 0),
      0,
    );
  }
  get value(): number {
    return this.collectedValue;
  }
  get ids(): readonly string[] {
    return [...this.collected];
  }
  collect(bounds: PickupBounds): readonly CoinObject[] {
    return this.placements.filter((coin) => {
      const box = colliderBounds(coin);
      if (
        !box.enable ||
        this.collected.has(coin.id) ||
        bounds.right <= box.left ||
        bounds.left >= box.right ||
        bounds.bottom <= box.top ||
        bounds.top >= box.bottom
      )
        return false;
      this.collected.add(coin.id);
      this.collectedValue += coin.value;
      return true;
    });
  }
}
