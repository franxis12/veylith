import { expect, it } from 'vitest';
import { projectileHit } from '../game/systems/powers/projectileCollision';
const wall = { left: 200, right: 228, top: 0, bottom: 720, enable: true };
it('hits the nearest solid in both directions, even across a long frame', () => {
  const far = { ...wall, left: 400, right: 420 };
  expect(projectileHit(0, 600, 400, 10, [far, wall])).toBe(190);
  expect(projectileHit(600, 0, 400, 10, [wall, far])).toBe(430);
});
it('passes through open doors and above or below platforms', () => {
  expect(
    projectileHit(0, 600, 400, 10, [{ ...wall, enable: false }]),
  ).toBeUndefined();
  expect(projectileHit(0, 600, -20, 10, [wall])).toBeUndefined();
  expect(projectileHit(0, 600, 740, 10, [wall])).toBeUndefined();
});
it('catches a wall at the muzzle and an overlapping or stationary shot', () => {
  expect(projectileHit(160, 222, 400, 10, [wall])).toBe(190);
  expect(projectileHit(210, 210, 400, 10, [wall])).toBe(210);
  expect(projectileHit(0, 50, 400, 10, [wall])).toBeUndefined();
});
