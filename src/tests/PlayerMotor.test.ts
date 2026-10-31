import { expect, it } from 'vitest';
import { createObject, LIBRARY } from '../editor/library';
import { MOVEMENT, PlayerMotor } from '../game/entities/player/PlayerMotor';
import type { InputFrame } from '../game/systems/input/ActionState';

const input = (values: Partial<InputFrame> = {}): InputFrame => ({
  direction: 0,
  jumpPressed: false,
  abilityPressed: false,
  restartPressed: false,
  glideHeld: false,
  element: undefined,
  ...values,
});

it('moves in either direction and stops on release, including in the air', () => {
  const motor = new PlayerMotor();
  expect(motor.step(input({ direction: -1 }), true, 0)).toMatchObject({
    vx: -MOVEMENT.speed,
    animation: 'run',
  });
  expect(motor.step(input({ direction: 1 }), false, 80).vx).toBe(
    MOVEMENT.speed,
  );
  expect(motor.step(input(), false, 80).vx).toBe(0);
});

it('Water jumps normally and cannot jump again in the air', () => {
  const motor = new PlayerMotor();
  expect(motor.step(input({ jumpPressed: true }), true, 0).vy).toBe(
    -MOVEMENT.jump,
  );
  expect(motor.step(input({ jumpPressed: true }), false, -200).vy).toBe(-200);
});

it('Air jumps higher than Water without gaining an extra air jump', () => {
  const water = new PlayerMotor().step(input({ jumpPressed: true }), true, 0);
  const motor = new PlayerMotor();
  const air = motor.step(input({ element: 'air', jumpPressed: true }), true, 0);
  const heightRatio =
    air.vy ** 2 / air.gravity / (water.vy ** 2 / water.gravity);
  expect(heightRatio).toBeGreaterThan(1.4);
  expect(heightRatio).toBeLessThan(1.6);
  expect(motor.step(input({ jumpPressed: true }), false, -200).vy).toBe(-200);
});

it('allows exactly one Fire air jump, including after walking off a platform', () => {
  const motor = new PlayerMotor();
  motor.step(input({ element: 'fire' }), true, 0);
  expect(motor.step(input({ jumpPressed: true }), false, 200).vy).toBe(
    -MOVEMENT.doubleJump,
  );
  expect(motor.step(input({ jumpPressed: true }), false, -100).vy).toBe(-100);
});

it('does not refill Fire air jump through element switches and refills only on landing', () => {
  const motor = new PlayerMotor();
  motor.step(input({ element: 'fire', jumpPressed: true }), true, 0);
  motor.step(input({ jumpPressed: true }), false, -100);
  motor.step(input({ element: 'air' }), false, 20);
  expect(
    motor.step(input({ element: 'fire', jumpPressed: true }), false, 20).vy,
  ).toBe(20);
  motor.step(input(), true, 0);
  motor.step(input({ jumpPressed: true }), true, 0);
  expect(motor.step(input({ jumpPressed: true }), false, -100).vy).toBe(
    -MOVEMENT.doubleJump,
  );
});

it('does not treat stale grounded flags as a new landing after takeoff', () => {
  const motor = new PlayerMotor();
  motor.step(input({ element: 'fire', jumpPressed: true }), true, 0);
  expect(motor.step(input({ jumpPressed: true }), true, -500).animation).toBe(
    'double_jump',
  );
  expect(motor.step(input({ jumpPressed: true }), true, -400).vy).toBe(-400);
});

it('glides only as descending Air while held, with immediate release and transformation exit', () => {
  const motor = new PlayerMotor();
  expect(
    motor.step(input({ element: 'air', glideHeld: true }), false, -80),
  ).toMatchObject({ vy: -80, gravity: MOVEMENT.gravity, animation: 'jump' });
  expect(motor.step(input({ glideHeld: true }), false, 600)).toMatchObject({
    vy: MOVEMENT.glideMaxFall,
    gravity: MOVEMENT.glideGravity,
    animation: 'glide_loop',
  });
  expect(motor.step(input(), false, 100).gravity).toBe(MOVEMENT.gravity);
  expect(
    motor.step(input({ element: 'water', glideHeld: true }), false, 100)
      .animation,
  ).toBe('fall');
});

it('Earth clears a heavy block with one jump and retains its heavier descent', () => {
  const motor = new PlayerMotor();
  const jump = motor.step(
    input({ element: 'earth', jumpPressed: true }),
    true,
    0,
  );
  expect(jump.vy).toBe(-MOVEMENT.earthJump);
  expect(Math.abs(jump.vy)).toBeGreaterThan(MOVEMENT.jump);
  expect(motor.step(input({ jumpPressed: true }), false, -200).vy).toBe(-200);
  expect(jump.gravity).toBe(MOVEMENT.gravity);
  expect(motor.step(input(), false, 1)).toMatchObject({
    gravity: MOVEMENT.earthFallGravity,
    maxFall: MOVEMENT.earthMaxFall,
    animation: 'fall',
  });
});

it('switches while rising without resetting vertical momentum', () => {
  const motor = new PlayerMotor();
  for (const element of ['water', 'fire', 'air', 'earth'] as const) {
    expect(
      motor.step(input({ element, direction: 1 }), false, -230),
    ).toMatchObject({ element, vy: -230, animation: 'jump' });
  }
});

it('Earth clears the default editor block with margin at different physics rates', () => {
  for (const hz of [30, 60, 120]) {
    const apex = (element: 'earth' | 'water') => {
      const motor = new PlayerMotor();
      let y = 0,
        vy = 0,
        peak = 0;
      for (let frame = 0; frame < hz * 2; frame++) {
        const motion = motor.step(
          input({ element, jumpPressed: frame === 0 }),
          frame === 0,
          vy,
        );
        vy = motion.vy + motion.gravity / hz;
        y += vy / hz;
        peak = Math.max(peak, -y);
        if (vy >= 0) return peak;
      }
      throw new Error('Jump never reached its apex');
    };
    const block = createObject(
      LIBRARY.find((item) => item.id === 'block')!,
      0,
      0,
      [],
    );
    expect(apex('earth')).toBeGreaterThan(
      Math.max(block.collider.height, block.height) + 12,
    );
    expect(apex('water')).toBeGreaterThan(160);
    expect(apex('water')).toBeLessThan(180);
  }
});
