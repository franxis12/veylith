import { expect, it } from 'vitest';
import { ExitReveal, EXIT_REVEAL } from '../game/systems/exit/ExitReveal';
import { RunSession } from '../game/session/RunSession';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { FOREST_PUZZLES } from '../game/levels/forestPuzzles/layouts';

it('pans before breaking once, holds the full break, and restores the exact camera pose', () => {
  const origin = { x: 670, y: 450, zoom: 1.5 },
    target = { x: 2200, y: 380, zoom: 1.5 * EXIT_REVEAL.zoom };
  const reveal = new ExitReveal('exit', origin, target);
  for (let i = 0; i < 5; i++) expect(reveal.update(100).breakSeal).toBe(false);
  expect(reveal.update(100)).toEqual({
    pose: target,
    breakSeal: true,
    done: false,
  });
  for (let i = 0; i < 12; i++)
    expect(reveal.update(100)).toEqual({
      pose: target,
      breakSeal: false,
      done: false,
    });
  for (let i = 0; i < 5; i++) expect(reveal.update(100).done).toBe(false);
  expect(reveal.update(100)).toEqual({
    pose: origin,
    breakSeal: false,
    done: true,
  });
  expect(new ExitReveal('exit', origin, target).done).toBe(false);
});
it('does not skip the animation after an inactive tab or a long frame', () => {
  const r = new ExitReveal(
    'exit',
    { x: 0, y: 0, zoom: 1 },
    { x: 100, y: 100, zoom: 1.14 },
  );
  expect(r.update(30000).breakSeal).toBe(false);
  expect(r.done).toBe(false);
});
it('excludes presentation time without suspending updates; pause and restart stay independent', () => {
  let now = 0;
  const run = new RunSession(undefined, () => now);
  run.start('earth');
  now = 500;
  run.setPresentation(true);
  now = 1500;
  run.tick('earth');
  expect(run.suspended).toBe(false);
  expect(run.getSnapshot().elapsedMs).toBe(500);
  run.complete();
  expect(run.getSnapshot().phase).toBe('playing');
  run.pause();
  now = 5000;
  run.resume();
  now = 6000;
  run.setPresentation(false);
  now = 6500;
  run.tick('earth');
  expect(run.getSnapshot().elapsedMs).toBe(1000);
  run.setPresentation(true);
  run.retry();
  run.start('earth');
  now = 6600;
  run.tick('earth');
  expect(run.getSnapshot().elapsedMs).toBe(100);
});
it('cannot win during the reveal, even at a solved exit, and still detects falls', () => {
  const layout = FOREST_PUZZLES['forest-2'],
    state = new ForestPuzzleState(layout);
  const player = {
    x: layout.exit.x,
    feetY: layout.exit.feetY,
    grounded: true,
    element: 'earth' as const,
    gliding: false,
  };
  state.update(player);
  expect(state.snapshot.phase).toBe('exploring');
  for (const id of layout.exits[0]!.requires) state.setWorldSignal(id, true);
  state.update(player, false);
  expect(state.snapshot.phase).toBe('exploring');
  expect(state.update({ ...player, feetY: layout.fallLimit }, false)).toBe(
    true,
  );
  state.update(player);
  expect(state.snapshot.phase).toBe('complete');
  expect(new ForestPuzzleState(layout).snapshot.phase).toBe('exploring');
});
