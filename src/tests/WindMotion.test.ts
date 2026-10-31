import { describe, expect, it } from 'vitest';
import { WindMotion, type WindContact } from '../game/systems/world/WindMotion';

const fan: WindContact = { id: 'fan', direction: 1, strength: 600 };

describe('gradual fan push', () => {
  it.each(['water', 'fire', 'air'] as const)(
    'lets %s enter before smoothly reversing its movement',
    (element) => {
      const wind = new WindMotion();
      let x = 0;
      const velocities: number[] = [];
      const positions: number[] = [];
      for (let frame = 0; frame < 60; frame++) {
        const vx = wind.step(-300, element, [fan], 1000 / 60);
        x += vx / 60;
        velocities.push(vx);
        positions.push(x);
      }
      expect(velocities[0]).toBeLessThan(-250);
      expect(Math.min(...positions)).toBeLessThan(-20);
      expect(x).toBeGreaterThan(150);
      expect(velocities.at(-1)).toBeGreaterThan(450);
      expect(
        Math.max(
          ...velocities.slice(1).map((v, i) => Math.abs(v - velocities[i]!)),
        ),
      ).toBeLessThan(40);
    },
  );

  it.each([30, 60, 120])(
    'keeps visible, slow retreats at the zone edge at %i fps',
    (fps) => {
      const wind = new WindMotion();
      let x = 50,
        previousVx = -300;
      const positions: number[] = [],
        turns: number[] = [];
      for (let frame = 0; frame < fps * 8; frame++) {
        const vx = wind.step(-300, 'water', x < 0 ? [fan] : [], 1000 / fps);
        if (Math.sign(vx) !== Math.sign(previousVx)) turns.push(frame / fps);
        previousVx = vx;
        x += vx / fps;
        positions.push(x);
      }
      expect(Math.min(...positions)).toBeLessThan(-18);
      // Continuous input must produce readable retreats, not converge on a wall.
      expect(Math.max(...positions.slice(fps * 4))).toBeGreaterThan(50);
      expect(Math.min(...positions.slice(fps * 4))).toBeLessThan(-15);
      expect(turns.length).toBeGreaterThan(4);
      expect(turns.length).toBeLessThan(22);
      expect(
        Math.min(...turns.slice(1).map((t, i) => t - turns[i]!)),
      ).toBeGreaterThan(0.25);
    },
  );

  it('integrates the same elapsed time independently of frame rate', () => {
    const finalVelocity = (fps: number) => {
      const wind = new WindMotion();
      let vx = 0;
      for (let i = 0; i < fps; i++)
        vx = wind.step(-300, 'water', [fan], 1000 / fps);
      // Include the coast-to-release transition inside a frame.
      for (let i = 0; i < fps / 2; i++)
        vx = wind.step(-300, 'water', [], 1000 / fps);
      return vx;
    };
    expect(finalVelocity(30)).toBeCloseTo(finalVelocity(120), 8);
    expect(finalVelocity(60)).toBeCloseTo(finalVelocity(120), 8);
  });

  it('lets Earth resist immediately, including momentum from a previous element', () => {
    const wind = new WindMotion();
    for (let i = 0; i < 60; i++) wind.step(-300, 'water', [fan], 1000 / 60);
    expect(wind.step(-245, 'earth', [fan], 1000 / 60)).toBe(-245);
    expect(wind.step(-300, 'water', [], 1000 / 60)).toBe(-300);
  });

  it('decays after leaving or switching the fan off and resets with the attempt', () => {
    const wind = new WindMotion();
    let vx = 0;
    for (let i = 0; i < 60; i++)
      vx = wind.step(-300, 'water', [fan], 1000 / 60);
    const beforeExit = vx;
    vx = wind.step(-300, 'water', [], 1000 / 60);
    expect(Math.abs(vx - beforeExit)).toBeLessThan(10);
    for (let i = 0; i < 180; i++) vx = wind.step(-300, 'water', [], 1000 / 60);
    expect(vx).toBe(-300);
    expect(new WindMotion().step(-300, 'water', [], 1000 / 60)).toBe(-300);
  });

  it('opposes an Air dash without instantly reversing it', () => {
    const wind = new WindMotion();
    expect(wind.step(-820, 'air', [fan], 1000 / 60)).toBeLessThan(-700);
    for (let i = 0; i < 60; i++) wind.step(-820, 'air', [fan], 1000 / 60);
    expect(wind.step(-820, 'air', [fan], 1000 / 60)).toBeGreaterThan(400);
  });

  it('mirrors both directions and avoids multiplying overlapping fans', () => {
    const right = new WindMotion(),
      left = new WindMotion(),
      duplicate = new WindMotion();
    for (let i = 0; i < 60; i++) {
      const vx = right.step(-300, 'fire', [fan], 1000 / 60);
      expect(
        left.step(300, 'fire', [{ ...fan, direction: -1 }], 1000 / 60),
      ).toBe(-vx);
      expect(
        duplicate.step(-300, 'fire', [fan, { ...fan, id: 'copy' }], 1000 / 60),
      ).toBe(vx);
    }
  });

  it('passes normal movement through without wind and ignores suspended time spikes', () => {
    expect(new WindMotion().step(300, 'water', [], 16)).toBe(300);
    expect(new WindMotion().step(-300, 'water', [fan], 0)).toBe(-300);
    expect(new WindMotion().step(-300, 'water', [fan], 5000)).toBeLessThan(
      -200,
    );
  });
});
