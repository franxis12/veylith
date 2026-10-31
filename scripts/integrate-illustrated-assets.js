import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { format } from 'prettier';
import { decodePng, hash, cellHash } from './asset-png.js';

const root = resolve('public/assets/environments/illustrated_levels');
const catalog = {},
  audit = {};
// Legacy scene remains available; campaign v2 is a separate catalog namespace.
const manifests = readdirSync(root, { recursive: true })
  .filter((p) => p.endsWith('manifest.json'))
  .filter((p) =>
    [
      'veylith-illustrated-environment',
      'veylith-level-environment-art',
    ].includes(JSON.parse(readFileSync(resolve(root, p))).format),
  )
  .sort();
for (const manifest of manifests) {
  const manifestPath = resolve(root, manifest),
    dir = dirname(manifestPath);
  const raw = readFileSync(manifestPath),
    original = JSON.parse(raw);
  const v2 = original.format === 'veylith-level-environment-art';
  assert.equal(original.version, v2 ? 2 : 1);
  // v2 reserves depth 20 for foreground; v1/runtime place gameplay at z=25.
  const normalizeDepth = (depth) => (depth >= 20 ? depth + 10 : depth);
  const m = v2
    ? {
        ...original,
        level: 'campaign_' + original.levelId,
        title: original.levelName,
        layerOrder: original.layers.map((l) => ({
          ...l,
          z: normalizeDepth(l.depth),
          position: l.worldPosition,
        })),
        instances: original.instances.map((i) => ({
          ...i,
          z: normalizeDepth(i.depth),
        })),
      }
    : original;
  assert.equal(m.canvas.origin, 'top-left');
  assert.equal(m.canvas.xDirection, 'right');
  assert.equal(m.canvas.yDirection, 'down');
  assert.equal(m.canvas.units, 'pixels');
  assert.match(m.level, /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
  assert(!Object.hasOwn(catalog, m.level), 'Duplicate scene ID');
  const images = new Map(),
    files = [];
  const png = (file) => {
    assert(
      typeof file === 'string' &&
        !file.startsWith('/') &&
        !relative(root, resolve(dir, file)).startsWith('..'),
      'Unsafe asset path',
    );
    if (images.has(file)) return images.get(file);
    const bytes = readFileSync(resolve(dir, file));
    const { rgba, ...info } = decodePng(bytes);
    images.set(file, { ...info, rgba });
    files.push({ file, bytes: bytes.length, sha256: hash(bytes), ...info });
    return images.get(file);
  };
  for (const file of readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.png') && (v2 || !f.startsWith('blueprint_v2/')))
    .sort())
    png(file);
  const path = (file) =>
    relative(resolve('public'), resolve(dir, file)).replaceAll('\\', '/');
  const texture = (file, width, height) => {
    const image = png(file);
    assert.equal(image.width, width, file);
    assert.equal(image.height, height, file);
    assert(
      width <= 4096 && height <= 4096,
      `${file}: split oversized artwork before registering`,
    );
    return path(file);
  };
  assert(
    Number.isFinite(m.canvas.width) &&
      m.canvas.width > 0 &&
      m.canvas.width <= 32768,
  );
  assert(
    Number.isFinite(m.canvas.height) &&
      m.canvas.height > 0 &&
      m.canvas.height <= 32768,
  );
  assert(m.layerOrder.length <= 16);
  assert.equal(
    new Set(m.layerOrder.map((l) => l.id)).size,
    m.layerOrder.length,
  );
  const warnings = [];
  if (m.separation?.waterBakedIntoStaticLayers !== false)
    warnings.push(
      'El manifiesto no confirma capas sin agua pintada: revisa duplicados antes de activar overlays.',
    );
  const layers = m.layerOrder
    .filter((l) => l.file)
    .map((l) => {
      assert(Number.isFinite(l.z));
      const hasPosition =
        Number.isFinite(l.position?.x) && Number.isFinite(l.position?.y);
      if (!hasPosition)
        warnings.push(
          `${l.id}: sin posición; importado en el origen del escenario.`,
        );
      return {
        id: l.id,
        path: texture(l.file, l.width, l.height),
        width: l.width,
        height: l.height,
        x: hasPosition ? l.position.x : 0,
        y: hasPosition ? l.position.y : 0,
        z: l.z,
      };
    });
  const animations = {},
    frameComparisons = {};
  for (const [id, a] of Object.entries(m.animations ?? {})) {
    assert.match(id, /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
    assert.equal(a.order, 'row-major');
    assert(
      Number.isInteger(a.frameCount) && a.frameCount > 0 && a.frameCount <= 256,
    );
    assert.equal(a.atlasWidth, a.columns * a.frameWidth);
    assert.equal(a.atlasHeight, a.rows * a.frameHeight);
    assert(a.frameCount <= a.columns * a.rows);
    assert(a.fps >= 1 && a.fps <= 60 && typeof a.loop === 'boolean');
    const sheetPath = texture(a.atlas, a.atlasWidth, a.atlasHeight);
    assert.equal(a.frames.length, a.frameCount);
    for (const [i, frame] of a.frames.entries()) {
      const x = (i % a.columns) * a.frameWidth,
        y = Math.floor(i / a.columns) * a.frameHeight;
      assert.equal(frame.index, i);
      assert.deepEqual(frame.atlasRect, {
        x,
        y,
        width: a.frameWidth,
        height: a.frameHeight,
      });
      const frameImage = png(frame.file);
      assert.equal(frameImage.width, a.frameWidth);
      assert.equal(frameImage.height, a.frameHeight);
      const sheet = png(a.atlas);
      let changedRgbChannels = 0,
        maxRgbDelta = 0;
      for (let row = 0; row < a.frameHeight; row++)
        for (let column = 0; column < a.frameWidth; column++) {
          const p = (row * a.frameWidth + column) * 4,
            q = ((y + row) * sheet.width + x + column) * 4;
          assert.equal(
            frameImage.rgba[p + 3],
            sheet.rgba[q + 3],
            `${frame.file}: alpha mismatch`,
          );
          for (let c = 0; c < 3; c++) {
            const delta = Math.abs(frameImage.rgba[p + c] - sheet.rgba[q + c]);
            if (delta) changedRgbChannels++;
            maxRgbDelta = Math.max(maxRgbDelta, delta);
          }
        }
      // Supplied sheets have RGB rounding of one 8-bit step; alpha is exact.
      assert(
        maxRgbDelta <= 1,
        `${frame.file}: sheet pixels differ beyond export rounding`,
      );
      frameComparisons[frame.file] = {
        changedRgbChannels,
        maxRgbDelta,
        alphaExact: true,
      };
    }
    animations[id] = {
      path: sheetPath,
      frameWidth: a.frameWidth,
      frameHeight: a.frameHeight,
      frameCount: a.frameCount,
      fps: a.fps,
      loop: a.loop,
    };
  }
  const overlays = (m.instances ?? []).map((i) => {
    const a = animations[i.animation];
    assert(a, `Unknown animation ${i.animation}`);
    const positioned = ['x', 'y', 'width', 'height', 'z'].every((k) =>
      Number.isFinite(i[k]),
    );
    if (!positioned)
      warnings.push(
        `${i.id}: sin coordenadas completas; overlay desactivado, colócalo en el inspector.`,
      );
    return {
      id: i.id,
      animation: i.animation,
      x: i.x ?? 0,
      y: i.y ?? 0,
      width: i.width ?? a.frameWidth,
      height: i.height ?? a.frameHeight,
      z: i.z ?? 30,
      opacity: i.opacity ?? 1,
      phase: i.phase ?? 0,
      fps: a.fps,
      visible: positioned && m.separation?.waterBakedIntoStaticLayers === false,
    };
  });
  for (const [id, a] of Object.entries(animations)) {
    if (overlays.some((o) => o.animation === id)) continue;
    warnings.push(
      `${id}: sin instancia; añade el overlay y define su posición en el inspector.`,
    );
    overlays.push({
      id,
      animation: id,
      x: 0,
      y: 0,
      width: a.frameWidth,
      height: a.frameHeight,
      z: 30,
      opacity: 1,
      phase: 0,
      fps: a.fps,
      visible: false,
    });
  }
  // Verify alternatives losslessly but never register both full layers and sections.
  for (const section of m.sectionExport?.sections ?? [])
    for (const [key, id] of [
      ['background', 'background'],
      ['staticWorld', 'static_world'],
      ['foreground', 'foreground'],
    ]) {
      if (!section[key]) continue;
      const layer = m.layerOrder.find((l) => l.id === id && l.file);
      assert(layer);
      const tile = png(section[key]);
      assert.equal(
        tile.pixelHash,
        cellHash(
          png(layer.file),
          section.position.x,
          section.position.y,
          tile.width,
          tile.height,
        ),
      );
    }
  catalog[m.level] = {
    title: m.title,
    width: m.canvas.width,
    height: m.canvas.height,
    layers,
    animations,
    overlays,
    warnings,
  };
  const runtime = [
    ...layers.map((l) => l.path),
    ...Object.values(animations).map((a) => a.path),
  ];
  audit[m.level] = {
    manifest: relative(resolve('public'), manifestPath),
    manifestSha256: hash(raw),
    files,
    frameComparisons,
    warnings,
    runtimeTextures: runtime.length,
    runtimeRgbaBytes: files
      .filter((f) => runtime.includes(path(f.file)))
      .reduce((n, f) => n + f.width * f.height * 4, 0),
    separation: m.separation,
    ignored: [
      'alignment aids',
      'individual frames',
      'alternative sections',
      'preview composites',
      'GIF/WebP previews',
    ],
  };
}
for (const [file, data] of [
  ['src/game/assets/illustratedManifest.json', catalog],
  ['docs/asset-illustrated-audit.json', audit],
]) {
  if (process.argv.includes('--check'))
    assert.deepEqual(
      JSON.parse(readFileSync(file, 'utf8')),
      data,
      `${file} is out of date`,
    );
  else
    writeFileSync(file, await format(JSON.stringify(data), { parser: 'json' }));
}
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(audit).map(([id, a]) => [
        id,
        {
          pngs: a.files.length,
          runtimeTextures: a.runtimeTextures,
          runtimeMiB: a.runtimeRgbaBytes / 1048576,
          warnings: a.warnings,
        },
      ]),
    ),
  ),
);
