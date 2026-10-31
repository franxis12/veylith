import { createRequire } from 'node:module';
import type Phaser from 'phaser';
import { expect, it, vi } from 'vitest';
import { createGameConfig } from '../game/core/GameConfig';
vi.mock('phaser', () => ({
  default: { AUTO: 0, Scale: { FIT: 3, CENTER_BOTH: 1 } },
}));
vi.mock('../game/scenes/BootScene', () => ({ BootScene: class {} }));
vi.mock('../game/scenes/MainScene', () => ({ MainScene: class {} }));
// Exercise the installed engine clock; no renderer or synthetic copy of its logic.
const TimeStep = createRequire(import.meta.url)(
  'phaser/src/core/TimeStep',
) as typeof Phaser.Core.TimeStep;
function clock() {
  const config = createGameConfig(document.createElement('div'), vi.fn(), 1);
  const loop = new TimeStep({} as Phaser.Game, config.fps!);
  loop.raf.start = vi.fn();
  const tick = vi.fn();
  loop.start(tick);
  return { loop, tick };
}
it.each([15, 30, 60, 120])(
  'advances real elapsed time from the first frame at %i Hz',
  (fps) => {
    const { loop, tick } = clock();
    let t = loop.lastTime;
    for (let i = 0; i < fps * 3; i++) {
      t += 1000 / fps;
      loop.step(t);
    }
    const deltas = tick.mock.calls.map((c) => c[1] as number);
    expect(deltas[0]).toBeCloseTo(1000 / fps);
    expect(deltas.reduce((a, b) => a + b, 0)).toBeCloseTo(3000);
    loop.destroy();
  },
);
it('does not reintroduce slow motion after focus returns, or simulate a long browser stall', () => {
  const { loop, tick } = clock();
  loop.step(loop.lastTime + 1000 / 30);
  loop.focus();
  loop.step(loop.lastTime + 1000 / 30);
  expect(tick.mock.calls.at(-1)![1]).toBeCloseTo(1000 / 30);
  loop.step(loop.lastTime + 5000);
  expect(tick.mock.calls.at(-1)![1]).toBeLessThanOrEqual(200);
  loop.destroy();
});
