import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const visited = new Set();
const sections = [];
const licenseNames = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'license',
  'license.md',
];

function resolvePackage(name, from) {
  let directory = from;
  while (true) {
    const candidate = path.join(directory, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory)
      throw new Error(`Missing installed runtime package: ${name}`);
    directory = parent;
  }
}

function collect(name, from = root) {
  const directory = resolvePackage(name, from);
  if (visited.has(directory)) return;
  visited.add(directory);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8'),
  );
  const licenseName = licenseNames.find((candidate) =>
    fs.existsSync(path.join(directory, candidate)),
  );
  if (!licenseName) throw new Error(`Missing runtime license: ${name}`);
  const license = fs.readFileSync(path.join(directory, licenseName), 'utf8');
  sections.push(
    `${name} ${metadata.version}\nSource: ${path.relative(root, directory)}/${licenseName}\n\n${license.trim()}`,
  );
  for (const noticeName of [
    'NOTICE',
    'NOTICE.txt',
    'CopyrightNotice.txt',
    'COPYRIGHT',
  ]) {
    const noticePath = path.join(directory, noticeName);
    if (fs.existsSync(noticePath)) {
      sections.push(
        `${name} ${metadata.version} — ${noticeName}\nSource: ${path.relative(root, noticePath)}\n\n${fs.readFileSync(noticePath, 'utf8').trim()}`,
      );
    }
  }
  for (const dependency of Object.keys(metadata.dependencies ?? {}).sort())
    collect(dependency, directory);
}

for (const name of Object.keys(project.dependencies).sort()) collect(name);
const matterSource = 'node_modules/phaser/src/physics/matter-js/lib/license.js';
sections.push(
  `Matter.js bundled with Phaser\nSource: ${matterSource}\n\n${fs.readFileSync(path.join(root, matterSource), 'utf8').trim()}`,
);

const cordovaSource =
  'node_modules/@capacitor/ios/CapacitorCordova/CapacitorCordova/Classes/Public/CDVPlugin.h';
const cordovaHeader = fs
  .readFileSync(path.join(root, cordovaSource), 'utf8')
  .match(/^\/\*([\s\S]*?)\*\//)?.[1];
if (!cordovaHeader) throw new Error('Missing CapacitorCordova license header');
const apache = fs.readFileSync(
  path.join(root, 'scripts/vendor-licenses/apache-2.0.txt'),
  'utf8',
);
sections.push(
  `Apache Cordova compatibility code bundled with Capacitor iOS\nSource: ${cordovaSource}\n\n${cordovaHeader.trim()}\n\n${apache.trim()}`,
);
const heading =
  'Veylith — Third-party software notices\n\nThis file preserves license text from the installed runtime packages and the Apache-licensed Cordova compatibility source. It does not license Veylith artwork or determine ownership of game assets. Regenerate after dependency changes and review the final native archive for additional components.\n';
// Preserve all legal wording while making package-supplied CRLF and whitespace
// consistent with the repository's text-file conventions.
const output =
  `${heading}\n${sections.join('\n\n' + '='.repeat(72) + '\n\n')}\n`
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '');
fs.writeFileSync(path.join(root, 'public/third-party-notices.txt'), output);
console.log(
  `Wrote notices for ${visited.size} runtime packages and Cordova compatibility code.`,
);
