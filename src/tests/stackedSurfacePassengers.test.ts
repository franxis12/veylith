import { expect, it } from 'vitest';
import { supportedPassengers } from '../game/systems/world/mechanismPhysics';
const platform = { left: 100, right: 180, top: 400, bottom: 420 };
const lower = {
  left: 110,
  right: 160,
  top: 220,
  bottom: 400,
  velocity: { y: 0 },
  blocked: { down: true },
  touching: { down: true },
  immovable: false,
};
const upper = {
  left: 110,
  right: 160,
  top: 115.25,
  bottom: 220.25,
  velocity: { y: 15 },
  blocked: { down: false },
  touching: { down: false },
  immovable: false,
};
it('counts cargo settling on a confirmed passenger before Arcade stack reconciliation', () => {
  expect(supportedPassengers(platform, [upper, lower])).toEqual([lower, upper]);
  expect(supportedPassengers(platform, [lower, upper])).toEqual([lower, upper]);
});
it('does not capture flying, distant, rising, side-contact or fixed cargo', () => {
  for (const bad of [
    { ...upper, velocity: { y: 120 } },
    { ...upper, bottom: 223 },
    { ...upper, velocity: { y: -10 } },
    { ...upper, left: 161, right: 211 },
    { ...upper, immovable: true },
  ]) {
    expect(supportedPassengers(platform, [lower, bad])).toEqual([lower]);
  }
  expect(supportedPassengers(platform, [upper])).toEqual([]);
});
