// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import evidence from '../../docs/illustrated-campaign-validation.json';
import {
  FOREST_PUZZLE_IDS,
  LEVEL_DOCUMENTS,
} from '../game/levels/forestPuzzles/layouts';
import { nextCampaignLevel } from '../game/levels/catalog';
const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');
describe('recorded real-browser solutions (rerun browser scripts to refresh)', () => {
  it('matches the current simulation, illustration renderer and replay inputs', () => {
    expect(evidence.passed).toBe(true);
    expect(evidence.solutions).toHaveLength(10);
    for (const [file, digest] of Object.entries(evidence.sourceHashes))
      if (
        /^src\/game\/(entities\/player|levels\/(forestPuzzles|schema)|systems\/world|assets\/illustrated)/.test(
          file,
        )
      )
        expect(hash(readFileSync(file)), file).toBe(digest);
    expect(hash(readFileSync('scripts/illustrated-routes.json'))).toBe(
      evidence.scripts['scripts/illustrated-routes.json'],
    );
  });
  it.each(FOREST_PUZZLE_IDS)(
    '%s has a current victory, complete reset, two rejected naive policies and editor round trip',
    (id) => {
      const doc = LEVEL_DOCUMENTS[id],
        digest = hash(JSON.stringify(doc));
      const solved = evidence.solutions.find((r) => r.id === id)!;
      expect(solved.sha256).toBe(digest);
      expect(solved).toMatchObject({
        passed: true,
        attempts: 1,
        element: 'earth',
        restartVerified: true,
      });
      expect(solved.victory.level).toBe(id);
      expect(solved.nextRememberedLevel).toBe(nextCampaignLevel(id)?.id ?? id);
      expect(solved.elapsedMs).toBeGreaterThan(0);
      expect(solved.collectedCoinValue).toBeLessThanOrEqual(
        doc.objects
          .filter((o) => o.type === 'coin')
          .reduce((n, o) => n + o.value, 0),
      );
      const failed = evidence.negative.find((r) => r.id === id)!;
      expect(failed.documentSha256).toBe(digest);
      expect(failed.restart).toBe(true);
      expect(failed.policies.map((p) => [p.policy, p.won])).toEqual([
        ['walk-right', false],
        ['right-jump-power', false],
      ]);
      expect(evidence.editor.find((r) => r.id === id)).toMatchObject({
        passed: true,
        roundTrip: true,
        playtest: true,
        restart: true,
        oneCanvas: true,
        campaignSaveUnchanged: true,
      });
    },
  );
});
