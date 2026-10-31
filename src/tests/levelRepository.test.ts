// @vitest-environment node
import {
  mkdtemp,
  realpath,
  readFile,
  rm,
  symlink,
  writeFile,
  mkdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { LevelRepository } from '../../server/levelRepository';
import {
  allowedEditorRequest,
  levelEditorPlugin,
} from '../../server/editorPlugin';
import { FOREST_PUZZLE_IDS } from '../game/levels/campaignOrder';
import { newLevel } from '../editor/library';
import type { IncomingMessage } from 'node:http';
let directory: string, repo: LevelRepository;
beforeEach(async () => {
  directory = await realpath(
    await mkdtemp(join(tmpdir(), 'veylith-editor-test-')),
  );
  repo = new LevelRepository(join(directory, 'levels'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
it('writes only on save, round trips, detects conflicts, serializes competing saves and deletes a custom level', async () => {
  const doc = newLevel('custom-puzzle');
  expect(await repo.list()).toEqual([]);
  const saved = await repo.save(doc.id, doc, '*');
  expect((await repo.read(doc.id)).document).toEqual(doc);
  expect(
    await readFile(join(directory, 'levels/custom-puzzle.json'), 'utf8'),
  ).toContain('"version": 1');
  await expect(repo.save(doc.id, doc, '*')).rejects.toMatchObject({
    status: 409,
  });
  const first = { ...doc, name: 'First' },
    second = { ...doc, name: 'Second' };
  const outcomes = await Promise.allSettled([
    repo.save(doc.id, first, saved.etag),
    repo.save(doc.id, second, saved.etag),
  ]);
  expect(outcomes.map((o) => o.status)).toEqual(['fulfilled', 'rejected']);
  const latest = await repo.read(doc.id);
  await expect(repo.delete(doc.id, saved.etag)).rejects.toMatchObject({
    status: 409,
  });
  await repo.delete(doc.id, latest.etag);
  expect(await repo.list()).toEqual([]);
});
it('rejects traversal, invalid schemas, mismatched IDs and symlink escapes, leaving originals intact', async () => {
  await expect(repo.read('../outside')).rejects.toMatchObject({ status: 400 });
  const doc = newLevel('custom');
  await expect(repo.save('other', doc, '*')).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    repo.save('custom', { ...doc, objects: [] }, '*'),
  ).rejects.toThrow('inicio');
  await mkdir(join(directory, 'levels'), { recursive: true });
  const outside = join(directory, 'outside.json');
  await writeFile(outside, 'keep');
  await symlink(outside, join(directory, 'levels/escape.json'));
  await expect(repo.read('escape')).rejects.toMatchObject({ status: 403 });
  await expect(
    repo.save('escape', newLevel('escape'), '*'),
  ).rejects.toMatchObject({ status: 403 });
  expect(await readFile(outside, 'utf8')).toBe('keep');
});
it('protects all campaign levels from deletion and rejects symlink directories', async () => {
  for (const id of FOREST_PUZZLE_IDS)
    await expect(repo.delete(id, '*')).rejects.toMatchObject({ status: 403 });
  await mkdir(join(directory, 'real'));
  await symlink(join(directory, 'real'), join(directory, 'linked'));
  await expect(
    new LevelRepository(join(directory, 'linked')).list(),
  ).rejects.toMatchObject({ status: 403 });
});
it('keeps the endpoint development-only and blocks nonlocal origins and DNS rebinding', () => {
  expect(levelEditorPlugin().apply).toBe('serve');
  const req = (host: string, origin?: string, remoteAddress = '127.0.0.1') =>
    ({
      headers: { host, ...(origin ? { origin } : {}) },
      socket: { remoteAddress },
    }) as Pick<IncomingMessage, 'headers' | 'socket'>;
  expect(
    allowedEditorRequest(req('localhost:5178', 'http://localhost:5178')),
  ).toBe(true);
  expect(
    allowedEditorRequest(req('127.0.0.1:5178', 'http://evil.example')),
  ).toBe(false);
  expect(allowedEditorRequest(req('evil.example:5178'))).toBe(false);
  expect(
    allowedEditorRequest(req('localhost:5178', undefined, '192.168.1.25')),
  ).toBe(false);
});
