import type { ActionState } from './ActionState';
type Side = 'left' | 'right';
type Gesture = {
  side: Side;
  x: number;
  y: number;
  started: number;
  maxDistance: number;
  jumped: boolean;
  direction: -1 | 0 | 1;
};
/** CSS-pixel thresholds; independent fingers dispatch the same actions as the keyboard. */
export class TouchGestures {
  private readonly pointers = new Map<number, Gesture>();
  constructor(private readonly actions: ActionState) {}
  down(id: number, side: Side, x: number, y: number, time: number): boolean {
    if ([...this.pointers.values()].some((p) => p.side === side)) return false;
    this.pointers.set(id, {
      side,
      x,
      y,
      started: time,
      maxDistance: 0,
      jumped: false,
      direction: 0,
    });
    return true;
  }
  move(id: number, x: number, y: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    const dx = x - p.x,
      dy = y - p.y;
    p.maxDistance = Math.max(p.maxDistance, Math.hypot(dx, dy));
    const source = `gesture:${id}`;
    if (p.side === 'left') {
      const direction = Math.abs(dx) >= 18 ? (dx < 0 ? -1 : 1) : 0;
      if (direction !== p.direction) {
        this.actions.dispatch(
          {
            type: 'move_left',
            phase: direction === -1 ? 'pressed' : 'released',
          },
          source,
        );
        this.actions.dispatch(
          {
            type: 'move_right',
            phase: direction === 1 ? 'pressed' : 'released',
          },
          source,
        );
        p.direction = direction;
      }
    } else if (!p.jumped && dy <= -28 && -dy > Math.abs(dx) * 1.2) {
      p.jumped = true;
      this.actions.dispatch({ type: 'jump', phase: 'pressed' }, source);
    }
  }
  up(id: number, x: number, y: number, time: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    this.move(id, x, y);
    if (
      p.side === 'right' &&
      !p.jumped &&
      p.maxDistance <= 12 &&
      time - p.started <= 350
    ) {
      this.actions.dispatch(
        { type: 'use_ability', phase: 'pressed' },
        `gesture:${id}`,
      );
    }
    this.cancel(id);
  }
  cancel(id: number): void {
    if (!this.pointers.delete(id)) return;
    for (const type of [
      'move_left',
      'move_right',
      'jump',
      'use_ability',
    ] as const)
      this.actions.dispatch({ type, phase: 'released' }, `gesture:${id}`);
  }
  cancelAll(): void {
    for (const id of this.pointers.keys()) this.cancel(id);
  }
}
