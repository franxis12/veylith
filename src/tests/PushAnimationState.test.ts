import { expect, it } from 'vitest';
import { PushAnimationState } from '../game/entities/player/PushAnimationState';

it('plays entry once, loops while in contact, then finishes before returning to locomotion', () => {
  const s = new PushAnimationState();
  expect(s.step('earth', 'run', false, 16)).toBe('run');
  expect(s.step('earth', 'run', true, 16)).toBe('push_start');
  expect(s.step('earth', 'run', true, 350)).toBe('push_start');
  expect(s.step('earth', 'run', true, 60)).toBe('push_loop');
  expect(s.step('earth', 'run', true, 5000)).toBe('push_loop');
  expect(s.step('earth', 'idle', false, 16)).toBe('push_end');
  expect(s.step('earth', 'idle', false, 150)).toBe('push_end');
  expect(s.step('earth', 'idle', false, 160)).toBe('idle');
});
it('never masks a jump, fall, power or transformation, and allows pushing again after interruption', () => {
  for (const base of ['jump', 'fall', 'smash'] as const) {
    const s = new PushAnimationState();
    s.step('earth', 'run', true, 16);
    expect(s.step('earth', base, true, 16)).toBe(base);
    expect(s.step('earth', 'run', true, 16)).toBe('push_start');
    expect(s.step('water', 'run', true, 16)).toBe('run');
  }
});
it('can release early and resume during the end animation without getting stuck or restarting every frame', () => {
  const s = new PushAnimationState();
  expect(s.step('earth', 'run', true, 16)).toBe('push_start');
  expect(s.step('earth', 'idle', false, 16)).toBe('push_end');
  expect(s.step('earth', 'run', true, 16)).toBe('push_start');
  for (let n = 0; n < 30; n++) s.step('earth', 'run', true, 16);
  expect(s.step('earth', 'run', true, 16)).toBe('push_loop');
  s.reset();
  expect(s.step('earth', 'idle', false, 16)).toBe('idle');
});
