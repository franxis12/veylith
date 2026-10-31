import { expect, it } from 'vitest';
import { planPlatformMotion } from '../game/systems/world/PlatformMotion';
const platform = { left: 768, right: 1088, top: 720, bottom: 734 };
const rider = {
  left: 897,
  right: 959,
  top: 546,
  bottom: 720,
  grounded: true,
  velocityY: 0,
};
const move = (dx: number, dy: number) => ({
  left: platform.left + dx,
  right: platform.right + dx,
  top: platform.top + dy,
  bottom: platform.bottom + dy,
});
it('carries actual foot contact equally in both directions and through vertical turnarounds', () => {
  for (const [dx, dy] of [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [2, -2],
  ]) {
    const step = planPlatformMotion(platform, move(dx!, dy!), rider, []);
    expect(step).toEqual({ riding: true, blocked: false, dx, dy });
  }
});
it('does not latch a jumping, falling-nearby, underside or departed player', () => {
  for (const change of [
    { velocityY: -355 },
    { grounded: false },
    { top: 544, bottom: 718 },
    { top: 725, bottom: 899 },
    { left: 1088, right: 1150 },
  ])
    expect(
      planPlatformMotion(platform, move(2, 0), { ...rider, ...change }, [])
        .riding,
    ).toBe(false);
});
it('stops before a ceiling crush or platform obstruction without moving the rider', () => {
  expect(
    planPlatformMotion(platform, move(0, -10), rider, [
      { left: 850, right: 1000, top: 500, bottom: 540 },
    ]),
  ).toEqual({ riding: true, blocked: true, dx: 0, dy: 0 });
  expect(
    planPlatformMotion(platform, move(10, 0), rider, [
      { left: 1090, right: 1200, top: 700, bottom: 900 },
    ]).blocked,
  ).toBe(true);
});
it('reaches a flush dock despite roundoff but does not ignore real overlap', () => {
  const dock = { left: 0, right: 768, top: 720, bottom: 1400 };
  expect(
    planPlatformMotion(platform, move(-1e-10, 0), rider, [dock]).blocked,
  ).toBe(false);
  expect(planPlatformMotion(platform, move(-1, 0), rider, [dock]).blocked).toBe(
    true,
  );
});
