import { expect, it } from 'vitest';
import { PlayerPowers, POWERS } from '../game/entities/player/PlayerPowers';

it('requires a fresh press and respects the projectile cooldown', () => {
  const powers = new PlayerPowers();
  expect(powers.step(0, 'water', true, true, 1).cast).toBe('water');
  expect(powers.step(100, 'water', true, true, 1).cast).toBeUndefined();
  expect(powers.step(500, 'water', false, true, 1).cast).toBeUndefined();
  expect(powers.step(0, 'water', true, true, -1).cast).toBe('water');
});

it('retains independent cooldowns when transforming', () => {
  const powers = new PlayerPowers();
  powers.step(0, 'water', true, true, 1);
  expect(powers.step(0, 'fire', true, true, 1).cast).toBe('fire');
  expect(powers.step(0, 'water', true, true, 1).cast).toBeUndefined();
  expect(powers.cooldownFraction).toBe(1);
  expect(powers.step(POWERS.cooldown.water, 'water', true, true, 1).cast).toBe(
    'water',
  );
});

it('dash keeps its launch facing, expires, and cannot recharge midair through transformation', () => {
  const powers = new PlayerPowers();
  expect(powers.step(0, 'air', true, false, -1).dashDirection).toBe(-1);
  expect(powers.step(50, 'air', false, false, 1).dashDirection).toBe(-1);
  expect(powers.step(200, 'air', false, false, 1).dashDirection).toBe(0);
  powers.step(1000, 'water', false, false, 1);
  expect(powers.step(0, 'air', true, false, 1).cast).toBeUndefined();
  powers.step(0, 'air', false, true, 1);
  expect(powers.step(0, 'air', true, false, 1).cast).toBe('air');
});

it('does not refill a dash during grounded fixed steps before it carries the player off a ledge', () => {
  const powers = new PlayerPowers();
  powers.step(0, 'air', true, true, 1);
  powers.step(16, 'air', false, true, 1);
  expect(powers.step(1000, 'air', true, false, 1).cast).toBeUndefined();
});

it('Earth plunges from the air and emits exactly one impact on landing', () => {
  const powers = new PlayerPowers();
  expect(powers.step(0, 'earth', true, false, 1)).toMatchObject({
    plunging: true,
    slamImpact: false,
  });
  expect(powers.step(1000, 'earth', true, false, 1).cast).toBeUndefined();
  expect(powers.step(16, 'earth', false, true, 1)).toMatchObject({
    plunging: false,
    slamImpact: true,
    animation: 'smash',
  });
  expect(powers.step(16, 'earth', false, true, 1).slamImpact).toBe(false);
});

it('Earth can smash on the ground, and transforming cancels a plunge or dash without teleporting', () => {
  const powers = new PlayerPowers();
  expect(powers.step(0, 'earth', true, true, 1)).toMatchObject({
    slamImpact: true,
    plunging: false,
  });
  powers.step(1000, 'earth', true, false, 1);
  expect(powers.step(0, 'water', false, false, 1)).toMatchObject({
    plunging: false,
    slamImpact: false,
    animation: undefined,
  });
  powers.step(0, 'air', true, false, 1);
  expect(powers.step(0, 'fire', false, false, 1).dashDirection).toBe(0);
});

it('returns from a power pose and starts each retry with fresh cooldowns', () => {
  const powers = new PlayerPowers();
  expect(powers.step(0, 'fire', true, true, 1).animation).toBe('attack');
  expect(powers.step(600, 'fire', false, true, 1).animation).toBeUndefined();
  expect(new PlayerPowers().step(0, 'fire', true, true, 1).cast).toBe('fire');
});

it('completion cancels active motion without recharging powers', () => {
  const powers = new PlayerPowers();
  powers.step(0, 'air', true, false, 1);
  powers.cancelMotion();
  expect(powers.step(0, 'air', false, false, 1).dashDirection).toBe(0);
  expect(powers.cooldownFraction).toBe(1);
});
