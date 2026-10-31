import { readFile, readdir, writeFile } from 'node:fs/promises';
import { hash } from './asset-png.js';
import { format } from 'prettier';
async function filesAt(directory) {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true }))
        .filter((e) => !e.name.startsWith('.'))
        .map((e) =>
          e.isDirectory()
            ? filesAt(`${directory}/${e.name}`)
            : `${directory}/${e.name}`,
        ),
    )
  )
    .flat()
    .sort();
}
const sources = (await filesAt('src')).filter(
  (p) => !p.startsWith('src/tests/') && /\.(ts|tsx|css|json)$/.test(p),
);
const sourceFingerprint = hash(
  (
    await Promise.all(
      sources.map(async (p) => `${p}\n${await readFile(p, 'utf8')}`),
    )
  ).join('\n'),
);
const reports = await Promise.all(
  process.argv.slice(2).map(async (path) => ({
    path,
    ...JSON.parse(await readFile(path, 'utf8')),
  })),
);
if (!reports.length || reports.some((r) => !r.passed))
  throw new Error('Only successful, current browser runs may supply evidence');
const report = {
  schemaVersion: 1,
  sourceFingerprint,
  passed: true,
  method:
    'Phaser camera intersection plus visible parent chain; DOM visibility plus CSS frame sampling. No loading/registry presence counted as rendered.',
  reports: reports.map((r) => ({
    path: r.path,
    checks: r.checks,
    resources: r.resources,
    levels: r.results,
  })),
  assets: reports.flatMap((r) => r.assets ?? []),
};
await writeFile(
  'docs/asset-browser-evidence.json',
  await format(JSON.stringify(report), { parser: 'json' }),
);
console.log(
  `${report.assets.length} browser observations collected. Run npm run audit:assets.`,
);
