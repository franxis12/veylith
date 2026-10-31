// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import {
  FOREST_PUZZLE_IDS,
  LEVEL_DOCUMENTS,
} from '../game/levels/forestPuzzles/layouts';
import { auditEarthPuzzle } from '../game/levels/earthValidation';
import { compileLevel } from '../game/levels/schema/compile';
import {
  parseLevel,
  serializeLevel,
  validateLevel,
} from '../game/levels/schema/validate';
import { ForestPuzzleState } from '../game/levels/forestPuzzles/ForestPuzzleState';
import { WorldState } from '../game/systems/world/WorldState';
import {
  nextCampaignLevel,
  rateTime,
  campaignLevel,
} from '../game/levels/catalog';
import {
  completeLevel,
  emptyProgress,
  decodeProgress,
  isUnlocked,
} from '../services/progress/progress';
import {
  illustratedScene,
  illustratedResources,
} from '../game/assets/illustratedCatalog';
import { EditorModel } from '../editor/model';
import { LevelRepository } from '../../server/levelRepository';
import type { LevelDocument } from '../game/levels/schema/types';
const archive = 'docs/level-archive/before-illustrated-campaign-2026-10-26';
const original = (id: string) =>
  JSON.parse(readFileSync(`${archive}/${id}.json`, 'utf8')) as LevelDocument;
describe.each(FOREST_PUZZLE_IDS)('%s illustrated campaign', (id) => {
  const d = LEVEL_DOCUMENTS[id],
    layout = compileLevel(d);
  it('has safe supported endpoints, Earth-only mechanisms, valid links and gradual optional hints', () => {
    expect(auditEarthPuzzle(d)).toEqual([]);
    expect(d.objects.some((o) => o.type === 'gem')).toBe(false);
    expect(d.puzzle?.hints.length).toBeGreaterThanOrEqual(2);
    const art = d.objects.filter((o) => o.type === 'illustration');
    expect(art).toHaveLength(1);
    const scene = illustratedScene(art[0]!.sceneId)!;
    expect(art[0]!.layers).toEqual(scene.layers.map((l) => l.id));
    expect(art[0]!.overlays).toEqual(scene.overlays);
    expect(art[0]!.width / scene.width).toBe(art[0]!.height / scene.height);
    expect(illustratedResources(d.objects).length).toBeGreaterThanOrEqual(7);
  });
  it('saves, loads, undoes and compiles the same editable document without mutating its source', async () => {
    const dir = realpathSync(
      mkdtempSync(join(tmpdir(), 'illustrated-campaign-')),
    );
    try {
      const model = new EditorModel(d);
      const art = d.objects.find((o) => o.type === 'illustration')!;
      model.update(art.id, { x: 25 });
      model.undo();
      expect(model.getSnapshot().document).toEqual(d);
      const repository = new LevelRepository(dir);
      const saved = await repository.save(id, d, '*');
      const loaded = await repository.read(id);
      expect(loaded.etag).toBe(saved.etag);
      expect(compileLevel(loaded.document)).toEqual(layout);
      expect(parseLevel(JSON.parse(serializeLevel(d)))).toEqual(d);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('requires every prerequisite plus grounded portal contact; restart clears progress and coins', () => {
    const e = layout.exits[0]!,
      arrival = {
        x: e.x,
        feetY: e.feetY,
        grounded: true,
        element: 'earth' as const,
        gliding: false,
      };
    expect(e.requires.length).toBeGreaterThan(0);
    // State injection checks ONLY the victory contract. Browser input replays prove spatial solutions.
    for (const missing of [undefined, ...e.requires]) {
      const state = new ForestPuzzleState(layout);
      for (const source of e.requires)
        if (source !== missing) state.setWorldSignal(source, true);
      state.update({ ...arrival, grounded: false });
      expect(state.snapshot.phase).toBe('exploring');
      state.update(arrival);
      expect(state.snapshot.phase).toBe(missing ? 'exploring' : 'complete');
    }
    const reset = new ForestPuzzleState(layout);
    reset.update(arrival);
    expect(reset.snapshot.phase).toBe('exploring');
    expect(reset.coins.value).toBe(0);
    for (const b of layout.blocks)
      expect(reset.isBlockDocked(b.id)).toBe(false);
    const broken = structuredClone(d);
    broken.objects = broken.objects.filter((o) => o.id !== e.requires[0]);
    expect(validateLevel(broken).length).toBeGreaterThan(0);
  });
  it('keeps existing coin IDs and values and pays no duplicate victory reward', () => {
    const prior = original(id).objects.filter((o) => o.type === 'coin');
    for (const c of prior)
      expect(d.objects.find((o) => o.id === c.id)).toMatchObject({
        type: 'coin',
        value: c.value,
      });
    const coins = d.objects.filter((o) => o.type === 'coin').map((o) => o.id);
    expect(coins.length).toBeGreaterThan(0);
    const unlocked = { ...emptyProgress(), lastLevel: id };
    const first = completeLevel(unlocked, id, 1, coins);
    expect(completeLevel(first.progress, id, 1, coins).result.earnedCoins).toBe(
      0,
    );
    expect(decodeProgress(JSON.stringify(first.progress))).toEqual(
      first.progress,
    );
    const config = campaignLevel(id);
    expect(rateTime(config, config.threeStarsMs)).toBe(3);
    expect(rateTime(config, config.threeStarsMs + 1)).toBe(2);
    expect(rateTime(config, config.twoStarsMs + 1)).toBe(1);
  });
});
it('unlocks one new campaign entry per victory and preserves remembered v1 access and records', () => {
  let p = emptyProgress();
  for (let i = 0; i < FOREST_PUZZLE_IDS.length; i++) {
    const id = FOREST_PUZZLE_IDS[i]!;
    expect(isUnlocked(p, id)).toBe(true);
    if (i + 1 < FOREST_PUZZLE_IDS.length)
      expect(isUnlocked(p, FOREST_PUZZLE_IDS[i + 1]!)).toBe(false);
    p = completeLevel(p, id, 999999).progress;
    expect(nextCampaignLevel(id)?.id).toBe(FOREST_PUZZLE_IDS[i + 1]);
  }
  const old = {
    ...emptyProgress(),
    coins: 107,
    lastLevel: 'forest-5' as const,
    levels: {
      'forest-1': {
        bestTimeMs: 5000,
        stars: 3 as const,
        awardedCoins: 100,
        collectedCoins: { 'earlier-user-coin': 7 },
      },
    },
  };
  expect(decodeProgress(JSON.stringify(old))).toEqual(old);
  expect(completeLevel(old, 'forest-1', 10000).result.earnedCoins).toBe(0);
  for (const id of FOREST_PUZZLE_IDS) expect(isUnlocked(old, id)).toBe(true);
});
it('preserves the archived documents and all original illustration-package content files byte for byte', () => {
  const backup = JSON.parse(readFileSync(`${archive}/manifest.json`, 'utf8'));
  for (const [file, hash] of Object.entries(backup.sha256))
    expect(
      createHash('sha256')
        .update(readFileSync(`${archive}/${file}`))
        .digest('hex'),
    ).toBe(hash);
  const assets = JSON.parse(
    readFileSync(`${archive}/illustrated-assets-sha256.json`, 'utf8'),
  );
  // Finder metadata is not game content and changes when a folder is moved.
  for (const [file, hash] of Object.entries(assets).filter(
    ([file]) => !file.endsWith('.DS_Store'),
  ))
    expect(
      createHash('sha256')
        .update(
          readFileSync(`public/assets/environments/illustrated_levels/${file}`),
        )
        .digest('hex'),
    ).toBe(hash);
});
it('preserves regressions for the previous selector and timed-door puzzle designs', () => {
  const state = new WorldState(
    original('forest-4').objects.filter((o) => o.type === 'world'),
  );
  state.advance(0, () => false);
  expect(state.get('west-barrier').active).toBe(true);
  state.trigger('selector');
  state.advance(300, () => false);
  expect(state.get('west-barrier').active).toBe(false);
  expect(state.get('east-barrier').active).toBe(true);
  const clock = new WorldState(
    original('forest-10').objects.filter((o) => o.type === 'world'),
  );
  clock.trigger('clock-start');
  expect(clock.get('clock-door').active).toBe(true);
  clock.advance(6100, () => false);
  expect(clock.get('clock-door').active).toBe(false);
  clock.trigger('far-seal');
  expect(clock.get('clock-door').active).toBe(true);
});
it('audits blocked lift tracks and unsupported exits in the illustrated geometry', () => {
  const d = structuredClone(LEVEL_DOCUMENTS['forest-3']);
  const lift = d.objects.find((o) => o.id === 'first-lift')!;
  lift.x = 100;
  expect(auditEarthPuzzle(d).join(' ')).toContain('corridor');
  const e = d.objects.find((o) => o.type === 'exit')!;
  e.y -= 100;
  expect(auditEarthPuzzle(d).join(' ')).toContain('support');
});
