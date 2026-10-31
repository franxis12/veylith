import { describe, expect, it } from 'vitest';
import { LEGACY_PUZZLES as FOREST_PUZZLES } from './fixtures/legacyElementPuzzles';
const LEGACY_IDS = [
  'forest-1',
  'forest-2',
  'forest-3',
  'forest-4',
  'forest-5',
] as const;
import {
  BLOCK,
  ForestPuzzleState,
} from '../game/levels/forestPuzzles/ForestPuzzleState';
import {
  CAMPAIGN,
  campaignLevel,
  nextCampaignLevel,
  rateTime,
} from '../game/levels/catalog';
import {
  completeLevel,
  decodeProgress,
  emptyProgress,
  isUnlocked,
} from '../services/progress/progress';
import { PlayerMotor, MOVEMENT } from '../game/entities/player/PlayerMotor';
import { GemState } from '../game/systems/gems/GemState';
import { projectileContact } from '../game/systems/powers/projectileCollision';
import { breakableStrikeContact } from '../game/systems/powers/breakableStrikeHit';
import type { Element } from '../game/types/character';
import { selectLevel } from '../game/levels/levelSelection';

const at = (
  x: number,
  element: Element = 'water',
  feetY = 650,
  grounded = true,
  gliding = false,
) => ({ x, feetY, grounded, element, gliding });
function cross(state: ForestPuzzleState) {
  const crossing = state.layout.crossing!;
  state.update(at((crossing.from + crossing.to) / 2, 'air', 450, false, true));
  state.update(at(crossing.to + 50, 'air'));
}
function dock(state: ForestPuzzleState) {
  const plate = state.layout.blocks[0]!.plateBounds!;
  state.observeBlock(
    state.layout.blocks[0]!.id,
    {
      left: plate.left,
      right: plate.right,
      top: plate.top - 56,
      bottom: plate.top,
      enable: true,
    },
    true,
  );
}
function solve(state: ForestPuzzleState) {
  for (const target of state.layout.targets)
    for (let i = 0; i < target.hits; i++)
      state.hitTarget(target.id, target.kind === 'tank' ? 'water' : 'fire');
  if (state.layout.crossing) cross(state);
  if (state.layout.blocks.length) dock(state);
  if (state.layout.wall) state.breakWall(state.layout.wall.id);
}

describe.each(LEGACY_IDS)('%s solution and reset', (id) => {
  const layout = FOREST_PUZZLES[id];
  it('requires every mechanism and a grounded exit; has no time-based defeat', () => {
    const state = new ForestPuzzleState(layout);
    state.update(at(layout.exit.x));
    expect(state.snapshot.phase).toBe('exploring');
    for (const target of layout.targets) {
      for (let i = 0; i < 10; i++)
        state.hitTarget(target.id, target.kind === 'tank' ? 'fire' : 'water');
      expect(state.targetHits(target.id)).toBe(0);
    }
    solve(state);
    for (const gate of layout.gates) expect(state.gateOpen(gate.id)).toBe(true);
    state.update(at(layout.exit.x, 'earth', 650, false));
    state.update(at(layout.exit.x, 'earth', 660));
    state.update(at(layout.exit.x + layout.exit.halfWidth + 1));
    expect(state.snapshot.phase).toBe('exploring');
    state.update(at(layout.exit.x, 'earth'));
    expect(state.snapshot.phase).toBe('complete');
    expect(state.update(at(0, 'water', 1100, false))).toBe(false);
    expect(rateTime(campaignLevel(id), 86400_000)).toBe(1);
  });
  it('restores all mechanisms and consumable gems on a fresh attempt', () => {
    const state = new ForestPuzzleState(layout);
    solve(state);
    const gems = new GemState(layout.gems);
    for (const gem of layout.gems) {
      const bounds = {
        left: gem.x - 20,
        right: gem.x + 20,
        top: gem.y - 40,
        bottom: gem.y + 40,
      };
      expect(gems.collect(bounds)).toHaveLength(1);
      expect(gems.collect(bounds)).toHaveLength(0);
      expect(new GemState(layout.gems).collect(bounds)).toHaveLength(1);
    }
    const reset = new ForestPuzzleState(layout);
    expect(reset.snapshot.solved).toBe(0);
    for (const block of layout.blocks)
      expect(reset.isBlockDocked(block.id)).toBe(false);
    for (const gate of layout.gates)
      expect(reset.gateOpen(gate.id)).toBe(false);
    expect(
      reset.update(at(layout.spawn.x, 'water', layout.fallLimit, false)),
    ).toBe(true);
  });
  it('preserves remembered selections with configured rewards and independent saved records', () => {
    expect(selectLevel(`?level=${id}`, false)).toBe(id);
    const remembered = { ...emptyProgress(), lastLevel: id };
    expect(isUnlocked(remembered, id)).toBe(true);
    expect(isUnlocked(emptyProgress(), id)).toBe(id === 'forest-1');
    const config = campaignLevel(id);
    expect(rateTime(config, config.threeStarsMs)).toBe(3);
    expect(rateTime(config, config.threeStarsMs + 1)).toBe(2);
    expect(rateTime(config, config.twoStarsMs)).toBe(2);
    const first = completeLevel(remembered, id, config.twoStarsMs + 1);
    const improved = completeLevel(first.progress, id, config.threeStarsMs);
    expect(improved.progress.coins).toBe(config.coins[3]);
    expect(
      completeLevel(improved.progress, id, config.threeStarsMs).result
        .earnedCoins,
    ).toBe(0);
    expect(decodeProgress(JSON.stringify(improved.progress))).toEqual(
      improved.progress,
    );
  });
});

it('only opens the water door after three actual hits and latches after changing element', () => {
  const state = new ForestPuzzleState(FOREST_PUZZLES['forest-1']);
  for (let i = 0; i < 2; i++) {
    state.hitTarget('tank', 'water');
    expect(state.gateOpen('water-door')).toBe(false);
  }
  state.hitTarget('tank', 'water');
  state.hitTarget('tank', 'fire');
  expect(state.gateOpen('water-door')).toBe(true);
  expect(state.targetHits('tank')).toBe(3);
});
it.each([
  ['torch-1', 'torch-2'],
  ['torch-2', 'torch-1'],
])('requires distinct torches in either order: %s then %s', (first, second) => {
  const state = new ForestPuzzleState(FOREST_PUZZLES['forest-2']);
  for (let i = 0; i < 8; i++) state.hitTarget(first, 'fire');
  expect(state.gateOpen('fire-door')).toBe(false);
  state.hitTarget(second, 'fire');
  expect(state.gateOpen('fire-door')).toBe(true);
});
it('requires airborne gliding and a landing on the far bank, cancelling abandoned crossings', () => {
  const state = new ForestPuzzleState(FOREST_PUZZLES['forest-3']);
  const { from, to } = state.layout.crossing!;
  state.update(at(to + 100, 'air'));
  expect(state.isSolved('crossing')).toBe(false);
  state.update(at(from + 200, 'air', 450, false, true));
  state.update(at(from - 100, 'air'));
  state.update(at(to + 100, 'air'));
  expect(state.isSolved('crossing')).toBe(false);
  cross(state);
  expect(state.isSolved('crossing')).toBe(true);
});
it('latches a plate only after real supported contact, and keeps it solved afterward', () => {
  const state = new ForestPuzzleState(FOREST_PUZZLES['forest-4']);
  const p = state.layout.blocks[0]!.plateBounds!;
  const block = {
    left: p.left,
    right: p.right,
    top: p.top - 56,
    bottom: p.top,
    enable: true,
  };
  state.observeBlock(
    state.layout.blocks[0]!.id,
    { ...block, top: block.top - 100, bottom: block.bottom - 100 },
    true,
  );
  state.observeBlock(state.layout.blocks[0]!.id, block, false);
  expect(state.isSolved('plate')).toBe(false);
  dock(state);
  state.observeBlock(
    state.layout.blocks[0]!.id,
    { ...block, left: 0, right: 64 },
    false,
  );
  expect(state.isSolved('plate')).toBe(true);
  expect(state.isSolved('wall')).toBe(false);
});
it('makes the four-element sequence safe: each replacement lies behind the preceding mechanism gate', () => {
  const layout = FOREST_PUZZLES['forest-5'];
  const state = new ForestPuzzleState(layout);
  for (const [gemId, gateId] of [
    ['fire', 'water-door'],
    ['air', 'fire-door'],
    ['earth', 'wind-door'],
  ]) {
    const gem = layout.gems.find((entry) => entry.id === gemId)!;
    const gate = layout.gates.find((entry) => entry.id === gateId)!;
    expect(gem.x - 22).toBeGreaterThan(gate.x + 46 + 62);
    expect(state.gateOpen(gate.id)).toBe(false);
  }
  for (const missing of layout.objectives) {
    const attempt = new ForestPuzzleState(layout);
    for (const target of layout.targets)
      if (target.id !== missing.id)
        for (let i = 0; i < target.hits; i++)
          attempt.hitTarget(
            target.id,
            target.kind === 'tank' ? 'water' : 'fire',
          );
    if (missing.id !== 'crossing') cross(attempt);
    if (missing.id !== 'plate') dock(attempt);
    if (missing.id !== 'wall') attempt.breakWall('wall');
    attempt.update(at(layout.exit.x));
    expect(attempt.snapshot.phase).toBe('exploring');
    expect(attempt.gateOpen('final-door')).toBe(false);
  }
});

function flight(element: Element, glide: boolean) {
  const motor = new PlayerMotor();
  motor.transform(element);
  let y = 0,
    x = 0,
    vy = 0,
    peak = 0;
  for (let frame = 0; frame < 1500; frame++) {
    const motion = motor.step(
      {
        direction: 1,
        jumpPressed: frame === 0,
        glideHeld: glide,
        abilityPressed: false,
        restartPressed: false,
        element: undefined,
      },
      frame === 0,
      vy,
    );
    vy = Math.min(motion.maxFall, motion.vy + motion.gravity / 120);
    y += vy / 120;
    x += motion.vx / 120;
    peak = Math.max(peak, -y);
    if (frame > 0 && y >= 0) return { range: x, peak };
  }
  throw new Error('Flight never landed');
}
it('has conservative physics margins: Air glide crosses both gaps, ordinary jumps do not; Earth clears the docked block', () => {
  const air = flight('air', true),
    normal = flight('air', false),
    earth = flight('earth', false);
  for (const layout of Object.values(FOREST_PUZZLES))
    if (layout.crossing) {
      const gap = layout.crossing.to - layout.crossing.from;
      expect(air.range).toBeGreaterThan(gap + 120);
      expect(normal.range).toBeLessThan(gap - 120);
    }
  expect(earth.peak).toBeGreaterThan(BLOCK.height + 6);
  // Even Air cannot return to the decoy after collecting the mandatory gem below.
  expect(MOVEMENT.airJump ** 2 / (2 * MOVEMENT.gravity)).toBeLessThan(
    650 - 370,
  );
  const decoy = FOREST_PUZZLES['forest-3'].gems[0]!,
    airGem = FOREST_PUZZLES['forest-3'].gems[1]!;
  expect(decoy.y + 40).toBeLessThan(370 - 174); // requires an optional jump
  expect(airGem.x).toBeGreaterThan(768 + 62);
});
it('keeps projectile targets occluded by nearer solids, including muzzle collisions, and strikes only the first breakable', () => {
  const door = { left: 100, right: 140, top: 32, bottom: 650, enable: true };
  const target = { ...door, left: 200, right: 250 };
  expect(projectileContact(70, 132, 550, 10, [door, target])).toEqual({
    x: 90,
    index: 0,
  });
  expect(projectileContact(0, 600, 550, 10, [door, target])?.index).toBe(0);
  expect(
    projectileContact(0, 600, 550, 10, [{ ...door, enable: false }, target])
      ?.index,
  ).toBe(1);
  expect(
    breakableStrikeContact(70, 250, 550, 12, [
      { ...door, breakable: false },
      { ...target, breakable: true },
    ]),
  ).toBeUndefined();
  expect(
    breakableStrikeContact(170, 230, 550, 12, [{ ...target, breakable: true }])
      ?.index,
  ).toBe(0);
});
it('preserves version-1 legacy saves while starting fresh players at the new campaign', () => {
  expect(emptyProgress().lastLevel).toBe('forest-1');
  const old = {
    version: 1,
    coins: 100,
    lastLevel: 'puzzle',
    levels: { forest: { bestTimeMs: 45000, stars: 3, awardedCoins: 100 } },
  };
  expect(decodeProgress(JSON.stringify(old))).toEqual(old);
  expect(nextCampaignLevel('forest-5')).toBeUndefined();
  expect(nextCampaignLevel('forest')?.id).toBe('puzzle');
  expect(CAMPAIGN).toHaveLength(12);
});
