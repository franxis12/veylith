import { expect, it } from 'vitest';
import { breakableStrikeHit } from '../game/systems/powers/breakableStrikeHit';

const target = {
  left: 155,
  right: 175,
  top: 530,
  bottom: 590,
  enable: true,
  breakable: true,
};

it('requires reachable breakable contact at fist height', () => {
  expect(breakableStrikeHit(100, 170, 560, 12, [])).toBeUndefined();
  expect(
    breakableStrikeHit(100, 170, 560, 12, [{ ...target, breakable: false }]),
  ).toBeUndefined();
  expect(
    breakableStrikeHit(100, 170, 560, 12, [
      { ...target, left: 200, right: 220 },
    ]),
  ).toBeUndefined();
  expect(
    breakableStrikeHit(100, 170, 560, 12, [
      { ...target, top: 650, bottom: 720 },
    ]),
  ).toBeUndefined();
  expect(breakableStrikeHit(100, 170, 560, 12, [target])).toBe(143);
});

it('supports the opposite facing and rejects a target behind the player', () => {
  const left = { ...target, left: 25, right: 45 };
  expect(breakableStrikeHit(100, 30, 560, 12, [left])).toBe(57);
  expect(breakableStrikeHit(100, 170, 560, 12, [left])).toBeUndefined();
});

it('does not hit a breakable through a nearer solid, regardless of list order', () => {
  const blocker = { ...target, left: 130, right: 140, breakable: false };
  expect(
    breakableStrikeHit(100, 170, 560, 12, [target, blocker]),
  ).toBeUndefined();
  expect(
    breakableStrikeHit(100, 170, 560, 12, [blocker, target]),
  ).toBeUndefined();
  expect(
    breakableStrikeHit(100, 170, 560, 12, [
      target,
      { ...target, breakable: false },
    ]),
  ).toBeUndefined();
});

it('ignores disabled objects and checks current breakability at the moment of contact', () => {
  expect(
    breakableStrikeHit(100, 170, 560, 12, [{ ...target, enable: false }]),
  ).toBeUndefined();
  const blocker = {
    ...target,
    left: 130,
    right: 140,
    breakable: false,
    enable: false,
  };
  expect(breakableStrikeHit(100, 170, 560, 12, [blocker, target])).toBe(143);
});
