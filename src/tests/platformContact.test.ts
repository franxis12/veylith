import { expect, it } from 'vitest';
import { overlaps } from '../game/systems/world/WorldState';

it('lets a returning platform reach a flush dock despite accumulated position roundoff', () => {
  const dock = { left: 0, right: 768, top: 720, bottom: 1400 };
  const atDock = { left: 768 - 1e-10, right: 1088, top: 720, bottom: 734 };
  expect(overlaps(atDock, dock)).toBe(true);
  expect(overlaps(atDock, dock, 0.01)).toBe(false);
  expect(overlaps({ ...atDock, left: 767 }, dock, 0.01)).toBe(true);
});
it('still blocks a rider hitting a ceiling or wall, while hazards keep exact bounds', () => {
  const rider = { left: 100, right: 162, top: 200, bottom: 374 };
  expect(
    overlaps(rider, { left: 0, right: 300, top: 150, bottom: 201 }, 0.01),
  ).toBe(true);
  expect(
    overlaps(rider, { left: 161, right: 220, top: 200, bottom: 400 }, 0.01),
  ).toBe(true);
  expect(
    overlaps(rider, { left: 162 - 0.001, right: 220, top: 200, bottom: 400 }),
  ).toBe(true);
});
