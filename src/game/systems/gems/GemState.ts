import { colliderBounds } from '../../levels/schema/types';
import type { GemPlacement } from '../../levels/gems';

export const GEM_HITBOX = { width: 44, height: 80 } as const;
export interface PickupBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Attempt-local consumption. Visual completion never controls pickup eligibility. */
export class GemState {
  private readonly collected = new Set<string>();

  constructor(readonly placements: readonly GemPlacement[]) {
    if (new Set(placements.map((gem) => gem.id)).size !== placements.length)
      throw new Error('Gem IDs must be unique within a level.');
  }

  isCollected(id: string): boolean {
    return this.collected.has(id);
  }

  collect(bounds: PickupBounds): readonly GemPlacement[] {
    return this.placements.filter((gem) => {
      const box = gem.view
        ? colliderBounds(gem.view)
        : {
            left: gem.x - GEM_HITBOX.width / 2,
            right: gem.x + GEM_HITBOX.width / 2,
            top: gem.y - GEM_HITBOX.height / 2,
            bottom: gem.y + GEM_HITBOX.height / 2,
            enable: true,
          };
      if (!box.enable) return false;
      if (
        this.collected.has(gem.id) ||
        bounds.right <= box.left ||
        bounds.left >= box.right ||
        bounds.bottom <= box.top ||
        bounds.top >= box.bottom
      )
        return false;
      this.collected.add(gem.id);
      return true;
    });
  }
}
