import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [solutionPath, negativePath, editorPath] = process.argv.slice(2);
assert(
  solutionPath && negativePath && editorPath,
  'Usage: node scripts/collect-illustrated-evidence.js solutions/results.json negative/results.json editor/results.json',
);
const parse = (p) => JSON.parse(readFileSync(p, 'utf8'));
const solutions = parse(solutionPath),
  negative = parse(negativePath),
  editor = parse(editorPath);
for (const r of [solutions, negative, editor]) {
  assert.equal(r.passed, true);
  assert.equal(r.results.length, 10);
  assert.deepEqual(r.errors, []);
}
const hash = (v) => createHash('sha256').update(v).digest('hex');
for (const r of solutions.results) {
  const doc = parse('src/game/levels/data/' + r.id + '.json');
  assert.equal(r.sha256, hash(JSON.stringify(doc)));
  assert.equal(
    negative.results.find((n) => n.id === r.id).documentSha256,
    r.sha256,
  );
  assert(editor.results.some((e) => e.id === r.id && e.passed));
  assert(
    r.passed && r.restartVerified && r.element === 'earth' && r.attempts === 1,
  );
}
const sourceHashes = {};
for (const file of readdirSync('src', { recursive: true })
  .filter((p) => !p.startsWith('tests/') && /\.(ts|tsx|css|json)$/.test(p))
  .sort())
  sourceHashes['src/' + file] = hash(readFileSync('src/' + file));
const report = {
  version: 1,
  verifiedAt: new Date().toISOString(),
  passed: true,
  methodology:
    'Real Chrome / Phaser Arcade, normal movement/jump/power input only; no teleport, solved-signal injection or speed changes. Isolated remembered v1 selection allows each level entry. Editor copies are disposable. This is automated solvability evidence, not human difficulty certification.',
  sourceHashes,
  scripts: Object.fromEntries(
    [
      'scripts/illustrated-campaign-smoke.js',
      'scripts/earth-puzzle-negative-smoke.js',
      'scripts/illustrated-campaign-editor-smoke.js',
      'scripts/illustrated-routes.json',
    ].map((p) => [p, hash(readFileSync(p))]),
  ),
  solutions: solutions.results,
  negative: negative.results,
  editor: editor.results,
};
writeFileSync(
  'docs/illustrated-campaign-validation.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  'Recorded ten verified solutions, twenty rejected naive routes, ten editor round trips and post-victory resets.',
);
