import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { format } from 'prettier';
import { decodePng, hash } from './asset-png.js';

// Explicit build-time inventory. Never run a filesystem scan in the game/editor.
const root = resolve(import.meta.dirname, '..');
const assets = {},
  platforms = {},
  audit = [];
const layers = {
  background: -90,
  behind_gameplay: -20,
  behind_platforms: -10,
  behind_platform: -10,
  behind_platform_glow: -6,
  platform: -5,
  terrain_detail: -4,
  world_decoration: -2,
  behind_platforms_effects: -3,
  foreground: 20,
};
const categories = {
  architecture: 'Bosque · Arquitectura',
  background_overlays: 'Bosque · Capas de fondo',
  foreground: 'Bosque · Primer plano',
  magical_supports: 'Bosque · Magia estática',
  structural_supports: 'Bosque · Soportes',
  terrain_expansion: 'Bosque · Detalles de terreno',
  vegetation: 'Bosque · Vegetación y rocas',
};
const names = {
  ancient_stone: 'Piedra antigua',
  ceremonial_stone: 'Piedra ceremonial',
  crystal: 'Cristal',
  grass_earth: 'Tierra con hierba',
  metal: 'Metal',
  mushroom: 'Hongos',
  stairs: 'Escalinata',
  stone_bridge: 'Puente de piedra',
  suspended: 'Suspendida',
  tree_branch: 'Rama',
  weathered_stone: 'Piedra erosionada',
  wood: 'Madera',
};
for (const base of ['platforms', 'ancient_forest']) {
  const directory = resolve(root, 'public/assets/environments', base);
  for (const folder of (await readdir(directory)).sort()) {
    const file = resolve(directory, folder, 'manifest.json');
    let source;
    try {
      source = await readFile(file);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
      throw error;
    }
    const manifest = JSON.parse(source);
    assert(Array.isArray(manifest.assets));
    for (const a of manifest.assets) {
      assert(!Object.hasOwn(assets, a.id), `Duplicate asset ${a.id}`);
      assert.equal(dirname(a.file), `assets/environments/${base}/${folder}`);
      const png = await readFile(resolve(root, 'public', a.file));
      const measured = decodePng(png);
      const width = a.width ?? a.dimensions[0],
        height = a.height ?? a.dimensions[1];
      assert.equal(measured.width, width, a.file);
      assert.equal(measured.height, height, a.file);
      assert(measured.alphaBounds, `Empty image ${a.file}`);
      const layer = layers[a.intended_layer ?? a.layer];
      assert(Number.isFinite(layer), `Unknown layer ${a.id}`);
      const collision = a.collision
        ? {
            x: a.collision.x,
            y: a.collision.y,
            width: a.collision.width,
            height: a.collision.height,
          }
        : null;
      assets[a.id] = {
        path: a.file,
        width,
        height,
        anchor: a.anchor_px,
        layer,
        category: categories[folder] ?? 'Plataformas · Piezas y soportes',
        repeat: a.repeat?.axes ?? a.repeat_axes ?? [],
        step: a.repeat?.step_px ?? a.repeat_step_px ?? [width, height],
        underlay: a.requires_underlay ?? false,
        collision,
      };
      audit.push({
        id: a.id,
        path: a.file,
        manifest: file.slice(root.length + 1),
        sha256: hash(png),
        manifestSha256: hash(source),
        width,
        height,
        alphaBounds: measured.alphaBounds,
      });
    }
    if (base === 'platforms') {
      const part = (role) => {
        const a = manifest.assets.find((a) => a.role === role);
        assert(a, `Missing ${role} in ${folder}`);
        return a;
      };
      const left = part('end_cap_left'),
        center = part('repeatable_center'),
        right = part('end_cap_right');
      assert.equal(manifest.top_surface_y, 32);
      assert.deepEqual(manifest.tile_dimensions, [128, 128]);
      platforms[center.id] = {
        name: `Plataforma · ${names[folder]}`,
        left: left.id,
        right: right.id,
      };
    }
  }
}
const outputs = {
  'src/game/assets/environmentManifest.json': { assets, platforms },
  'docs/asset-environment-expansion-audit.json': {
    assets: audit,
    pngCount: audit.length,
    platformFamilies: Object.keys(platforms).length,
    decodedBytes: audit.reduce((sum, a) => sum + a.width * a.height * 4, 0),
  },
};
for (const [path, data] of Object.entries(outputs)) {
  const content = await format(JSON.stringify(data), { parser: 'json' });
  const target = resolve(root, path);
  if (process.argv.includes('--check'))
    assert.equal(await readFile(target, 'utf8'), content, `Stale ${path}`);
  else await writeFile(target, content);
}
console.log(
  `Verified ${audit.length} original PNGs and ${Object.keys(platforms).length} platform families.`,
);
