import { format } from 'prettier';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { createServer } from 'vite';
import { decodePng, cellHash, hash } from './asset-png.js';

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
const sourceFiles = (await filesAt('src')).filter(
  (p) => !p.startsWith('src/tests/') && /\.(ts|tsx|css|json)$/.test(p),
);
const sources = new Map(
  await Promise.all(
    sourceFiles.map(async (path) => [path, await readFile(path, 'utf8')]),
  ),
);
const sourceFingerprint = hash(
  [...sources].map(([p, s]) => `${p}\n${s}`).join('\n'),
);
const evidence = JSON.parse(
  await readFile('docs/asset-browser-evidence.json', 'utf8').catch(() => '{}'),
);
const evidenceCurrent =
  evidence.sourceFingerprint === sourceFingerprint && evidence.passed === true;
const observed = new Map();
if (evidenceCurrent)
  for (const item of evidence.assets ?? []) {
    const old = observed.get(item.path) ?? {
      frames: new Set(),
      animations: new Set(),
      contexts: new Set(),
    };
    (item.frames ?? []).forEach((frame) => old.frames.add(String(frame)));
    if (item.animation) old.animations.add(item.animation);
    if (item.context) old.contexts.add(item.context);
    observed.set(item.path, old);
  }
const reservations = JSON.parse(
  await readFile('scripts/asset-reservations.json', 'utf8'),
);
const registered = new Map();
const add = (
  path,
  consumer,
  event,
  animation = null,
  scope = 'runtime',
  action = 'Existing integration reviewed',
) => {
  const entry = registered.get(path) ?? {
    consumers: [],
    events: [],
    animation,
    scope,
    action,
  };
  entry.consumers = [...new Set([...entry.consumers, consumer])];
  entry.events = [...new Set([...entry.events, event])];
  registered.set(path, entry);
};
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
let world, forest, characters, ui, audio, illustratedResources;
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`);
  const { CHARACTER_ANIMATIONS } = await load(
    'game/systems/animation/animationRegistry.ts',
  );
  characters = CHARACTER_ANIMATIONS;
  for (const a of characters)
    add(
      a.path,
      'src/game/entities/player/PlayablePlayer.ts',
      a.action,
      {
        frames: a.frameCount,
        width: a.frameWidth,
        height: a.frameHeight,
        fps: a.fps,
        loop: a.loop,
      },
      ['land', 'glide_start'].includes(a.action) ? 'reserved' : 'runtime',
    );
  const { EFFECT_SHEETS, TRANSFORMATION_SHEETS } = await load(
    'game/assets/effectSheets.ts',
  );
  for (const [id, sheet] of Object.entries(EFFECT_SHEETS))
    add(sheet.path, 'src/game/systems/powers/PowerEffects.ts', id, sheet);
  for (const [id, sheet] of Object.entries(TRANSFORMATION_SHEETS))
    add(
      sheet.path,
      'src/game/systems/gems/TransformationEffect.ts',
      `gem pickup → ${id}`,
      sheet,
    );
  const { GEM_SHEETS } = await load('game/assets/gemSheets.ts');
  for (const sheet of GEM_SHEETS)
    add(
      sheet.path,
      'src/game/systems/gems/GemSystem.ts',
      `${sheet.element} ${sheet.action}`,
      sheet,
    );
  const { FOREST_ASSETS } = await load('game/assets/forestAssets.ts');
  forest = FOREST_ASSETS;
  for (const [id, asset] of Object.entries(forest))
    add(
      asset.path,
      'src/game/levels/schema/renderObject.ts',
      id,
      null,
      'runtime',
    );
  const { ENVIRONMENT_ASSETS } = await load(
    'game/assets/environmentCatalog.ts',
  );
  for (const [id, asset] of Object.entries(ENVIRONMENT_ASSETS))
    add(
      asset.path,
      'src/game/levels/schema/renderEnvironment.ts',
      `Placed environment object: ${id}`,
      null,
      'runtime',
      'Editor palette and canonical/playtest renderer; loaded only when placed, full original canvas retained.',
    );
  const { FOREST_ANIMATION_SHEETS, PORTAL_FRAME } = await load(
    'game/assets/forestAnimations.ts',
  );
  for (const [id, sheet] of Object.entries(FOREST_ANIMATION_SHEETS))
    add(
      sheet.path,
      'src/game/levels/forestPuzzles/ForestPuzzle.ts',
      {
        door: 'gate signal changes',
        water: 'tank solved by Water',
        torch: 'torch solved by Fire',
        portal: 'exit requirements solved',
      }[id],
      sheet,
      'runtime',
      'Connected to puzzle state; original prototype decoration retained',
    );
  add(
    PORTAL_FRAME.path,
    'src/game/levels/schema/renderObject.ts',
    'Legacy prototype portal frame (new puzzle exits use ancient_doorway_frame)',
  );
  const { EXIT_FRAME, EXIT_MASK, SEAL_SHEETS, SEAL_PREVIEW } = await load(
    'game/assets/exitAssets.ts',
  );
  add(
    EXIT_FRAME.path,
    'src/game/levels/schema/renderExit.ts',
    'Schema-v1 puzzle exit facade',
  );
  add(
    SEAL_PREVIEW.path,
    'src/editor/EditorScene.ts',
    'Static original seal preview, full animations load only in playtest',
  );
  add(
    EXIT_MASK.path,
    'src/game/assets/exitAssets.ts',
    'Source-coordinate seal alpha clipping, no collider',
  );
  for (const [id, sheet] of Object.entries(SEAL_SHEETS))
    add(
      sheet.path,
      'src/game/levels/schema/renderExit.ts',
      {
        idle: 'Blocked exit',
        break: 'Puzzle solved after camera approach',
        activate: 'Exit prerequisites revoked',
      }[id],
      sheet,
    );
  const { COIN_ASSET, COIN_SHEETS } = await load('game/assets/coinAsset.ts');
  add(
    COIN_ASSET.path,
    'src/game/levels/schema/renderObject.ts',
    'Coin editor image / missing-spin fallback',
  );
  for (const [id, sheet] of Object.entries(COIN_SHEETS))
    add(
      sheet.path,
      'src/game/systems/coins/CoinEffects.ts',
      id === 'spin' ? 'Uncollected world coin' : 'Confirmed coin overlap',
      sheet,
      'runtime',
      'Added world spin and bounded pickup burst',
    );
  const illustrated = await load('game/assets/illustratedCatalog.ts');
  illustratedResources = illustrated.illustratedResources;
  for (const [id, scene] of Object.entries(illustrated.ILLUSTRATED_SCENES)) {
    for (const layer of scene.layers)
      add(
        layer.path,
        'src/game/levels/schema/renderIllustration.ts',
        `${id}: layer ${layer.id}`,
        null,
        'runtime',
        'Original aligned layer; per-level browser proof is in illustrated-campaign-validation.json.',
      );
    for (const [name, a] of Object.entries(scene.animations))
      add(
        a.path,
        'src/game/levels/schema/renderIllustration.ts',
        `${id}: ambient ${name}`,
        {
          frames: a.frameCount,
          width: a.frameWidth,
          height: a.frameHeight,
          fps: a.fps,
          loop: a.loop,
        },
        'runtime',
        'Local sprite animation; original sheet and frame comparison audited separately.',
      );
  }
  world = await load('game/assets/worldAssets.ts');
  const functional = new Set([
    'mechanical_elevator',
    'wind_fan',
    'lava',
    'deep_water',
    'waterwheel',
    'steam_boiler',
    'retractable_bridge',
    'stone_wall',
    'interactive_lever',
    'timed_door',
    'disappearing_platform',
    'elemental_bounce_pad',
    'floating_wooden_block',
    'energy_barrier',
    'fire_switch',
  ]);
  for (const o of Object.values(world.WORLD_ART)) {
    add(
      o.thumbnail,
      'src/editor/library.ts',
      `Editor palette ${o.id}`,
      null,
      'editor',
    );
    for (const [state, art] of Object.entries(o.states))
      for (const path of art.layers ?? [])
        add(
          path,
          'src/game/systems/world/WorldSystem.ts',
          `${o.id}:${state}`,
          null,
          functional.has(o.id)
            ? state === 'extinguished'
              ? 'reserved'
              : 'runtime'
            : 'prop',
        );
  }
  for (const a of world.WORLD_ANIMATIONS) {
    const scope =
      a.id === 'lava_extinguishing'
        ? 'reserved'
        : functional.has(a.object)
          ? 'runtime'
          : 'prop';
    const animation = {
      frames: a.frames.length,
      width: a.frameWidth,
      height: a.frameHeight,
      fps: a.frameRate,
      loop: a.repeat === -1,
      next: a.next,
    };
    for (const path of [a.spritesheet, ...a.backLayers, ...a.frontLayers])
      add(
        path,
        'src/game/systems/world/WorldSystem.ts',
        a.id,
        path === a.spritesheet ? animation : null,
        scope,
        'Event transitions, full playback and optional-sheet fallback audited',
      );
  }
  ui = await load('components/ui/assets.ts');
  const uiSources = [...sources].filter(
    ([p]) => /src\/(components|app)\//.test(p) && !p.endsWith('/assets.ts'),
  );
  for (const [id, path] of Object.entries(ui.UI)) {
    const consumers = uiSources
      .filter(([, text]) => text.includes(`UI.${id}`))
      .map(([p]) => p);
    for (const consumer of consumers) add(path, consumer, `UI.${id}`);
  }
  for (const [kind, states] of Object.entries(ui.BUTTON_ART))
    for (const [i, path] of states.entries())
      add(
        path,
        'src/components/ui/Art.tsx',
        `${kind} ${['normal', 'pressed', 'disabled'][i]}`,
        null,
        i === 2 ? 'conditional' : 'runtime',
        'Connected normal/pressed/disabled skins; held touch state preserves pointer capture',
      );
  for (const [id, a] of Object.entries(ui.UI_ANIMATIONS))
    add(
      a.path,
      'src/components/ui/SpriteAnimation.tsx',
      `earned reward: ${id}`,
      {
        frames: a.frames,
        width: 256,
        height: 256,
        fps: (1000 * a.frames) / a.durationMs,
        loop: false,
      },
      'runtime',
      'Full frame duration, reduced-motion and error fallback',
    );
  audio = (await load('services/audio/catalog.ts')).SOUNDS;
  for (const [id, a] of Object.entries(audio)) {
    if (
      /^(water|fire|air|earth)_(jump|land|step)$/.test(id) ||
      /^(water|fire)_cast$/.test(id)
    )
      add(
        a.path,
        'src/game/systems/audio/MovementAudio.ts',
        'dynamic element cue from confirmed motor event',
        null,
        'audio',
      );
    const consumers = [...sources]
      .filter(
        ([p, text]) =>
          !p.endsWith('catalog.ts') &&
          !p.includes('/assets/') &&
          new RegExp(`['"\\x60]${id}['"\\x60]`).test(text),
      )
      .map(([p]) => p);
    for (const consumer of consumers) add(a.path, consumer, id, null, 'audio');
  }
} finally {
  await server.close();
}
// Some supplied advanced sheets are intentionally unused. Their metadata still
// defines the exact frame layout and source files; registration is not required
// to audit their pixels, nor does this make them implemented effects.
const declaredSheets = new Map();
for (const file of (await filesAt('public/assets/objects/advanced')).filter(
  (p) => p.endsWith('/metadata.json'),
)) {
  const metadata = JSON.parse(await readFile(file, 'utf8'));
  for (const a of metadata.animations ?? [])
    declaredSheets.set(a.spritesheet, a);
}
const mediaFiles = await filesAt('public/assets');
const records = [],
  images = new Map(),
  bytes = new Map();
for (const file of mediaFiles) {
  const path = file.slice(7),
    buffer = await readFile(file),
    extension = extname(file);
  const record = {
    path,
    category: path.split('/')[1],
    extension,
    bytes: buffer.length,
    sha256: hash(buffer),
    dimensions: null,
    layout: null,
    transparency: null,
    duplicateOf: [],
    packedIn: [],
    references: [...sources]
      .filter(([, text]) => text.includes(path))
      .map(([p]) => p),
    ...registered.get(path),
    ...(!registered.get(path)?.animation && declaredSheets.has(path)
      ? {
          animation: {
            frames: declaredSheets.get(path).frames.length,
            width: declaredSheets.get(path).frameWidth,
            height: declaredSheets.get(path).frameHeight,
            fps: declaredSheets.get(path).frameRate,
            loop: declaredSheets.get(path).repeat === -1,
          },
        }
      : {}),
  };
  try {
    if (extension === '.png') {
      const img = decodePng(buffer);
      record.dimensions = { width: img.width, height: img.height };
      record.transparency = {
        mode: img.mode,
        bounds: img.alphaBounds,
        transparentPixels: img.transparentPixels,
        partialAlphaPixels: img.partialAlphaPixels,
      };
      record.pixelHash = img.pixelHash;
      images.set(path, {
        width: img.width,
        height: img.height,
        pixelHash: img.pixelHash,
      });
    } else if (extension === '.wav') {
      if (
        buffer.toString('ascii', 0, 4) !== 'RIFF' ||
        buffer.toString('ascii', 8, 12) !== 'WAVE'
      )
        throw new Error('Invalid WAV');
      let fmt, data;
      for (let offset = 12; offset + 8 <= buffer.length;) {
        const tag = buffer.toString('ascii', offset, offset + 4),
          n = buffer.readUInt32LE(offset + 4);
        if (tag === 'fmt ')
          fmt = {
            format: buffer.readUInt16LE(offset + 8),
            channels: buffer.readUInt16LE(offset + 10),
            sampleRate: buffer.readUInt32LE(offset + 12),
            byteRate: buffer.readUInt32LE(offset + 16),
            bits: buffer.readUInt16LE(offset + 22),
          };
        if (tag === 'data') data = n;
        offset += 8 + n + (n % 2);
      }
      if (!fmt || data === undefined) throw new Error('Incomplete WAV');
      record.audio = { ...fmt, durationSeconds: data / fmt.byteRate };
    } else if (extension === '.json') JSON.parse(buffer.toString());
  } catch (error) {
    record.error = String(error);
  }
  const duplicates = bytes.get(record.sha256) ?? [];
  record.duplicateOf = [...duplicates];
  duplicates.push(path);
  bytes.set(record.sha256, duplicates);
  records.push(record);
}
const byPath = new Map(records.map((r) => [r.path, r]));
for (const record of records.filter((r) =>
  r.path.endsWith('_spritesheet.png'),
)) {
  const prefix = record.path.replace('_spritesheet.png', '');
  const declared = declaredSheets.get(record.path);
  const frames = declared
    ? declared.frames.map((path) => byPath.get(path))
    : records
        .filter(
          (r) => r.path.startsWith(`${prefix}_`) && /_\d+\.png$/.test(r.path),
        )
        .sort((a, b) => a.path.localeCompare(b.path));
  if (frames.some((f) => !f)) {
    record.error = 'Missing declared source frame';
    continue;
  }
  const first = frames[0]?.dimensions;
  const width = first?.width ?? record.animation?.width,
    height = first?.height ?? record.animation?.height;
  if (!width || !height || !record.dimensions) {
    record.error = 'Unknown frame layout';
    continue;
  }
  const columns = record.dimensions.width / width,
    rows = record.dimensions.height / height;
  if (!Number.isInteger(columns) || !Number.isInteger(rows)) {
    record.error = 'Nonintegral frame layout';
    continue;
  }
  record.layout = {
    frameWidth: width,
    frameHeight: height,
    columns,
    rows,
    frames: frames.length || record.animation?.frames,
    order: 'row-major',
    individualFramesMatch: true,
  };
  if (
    record.animation &&
    (record.animation.width !== width ||
      record.animation.height !== height ||
      record.animation.frames !== record.layout.frames)
  )
    record.error = 'Registry does not match measured frame layout';
  const image = decodePng(await readFile(`public/${record.path}`));
  for (const [i, frame] of frames.entries()) {
    if (
      i >= columns * rows ||
      cellHash(
        image,
        (i % columns) * width,
        Math.floor(i / columns) * height,
        width,
        height,
      ) !== frame.pixelHash
    ) {
      record.layout.individualFramesMatch = false;
      record.error = 'Spritesheet cell differs from individual frame';
    } else frame.packedIn.push({ path: record.path, frame: i });
  }
}
const pixelGroups = new Map();
for (const record of records)
  if (record.pixelHash) {
    const key = `${record.dimensions.width}x${record.dimensions.height}:${record.pixelHash}`;
    const siblings = pixelGroups.get(key) ?? [];
    record.pixelDuplicateOf = [...siblings];
    siblings.push(record.path);
    pixelGroups.set(key, siblings);
  }
const canonical = (await filesAt('src/game/levels/data')).filter((p) =>
  /forest-\d+\.json$/.test(p),
);
const levels = await Promise.all(
  canonical.map(async (p) => JSON.parse(await readFile(p, 'utf8'))),
);
for (const r of records) {
  r.duplicateOf = (bytes.get(r.sha256) ?? []).filter((p) => p !== r.path);
  if (r.pixelHash)
    r.pixelDuplicateOf = (
      pixelGroups.get(
        `${r.dimensions.width}x${r.dimensions.height}:${r.pixelHash}`,
      ) ?? []
    ).filter((p) => p !== r.path);
  const seen = observed.get(r.path);
  r.verification = seen
    ? {
        kind: 'browser-rendered',
        frames: [...seen.frames],
        animations: [...seen.animations],
        contexts: [...seen.contexts],
        completeFrameCycle: r.layout
          ? Array.from({ length: r.layout.frames }, (_, i) => String(i)).every(
              (f) => seen.frames.has(f),
            )
          : null,
      }
    : { kind: 'static-only' };
  r.consumers ??= [];
  r.events ??= [];
  r.action ??= 'No artwork changed';
  r.scope ??= 'none';
  r.reason = '';
  r.previousStatus =
    /(?:fan_starting|fan_stopping|elevator_activated)_spritesheet/.test(r.path)
      ? 'registered-never-used'
      : /(?:wall_cracking|boiler_heating)_spritesheet/.test(r.path)
        ? 'used-without-animation (last frame only)'
        : /(?:torch_flame_loop|coin_collect_sparkle)_spritesheet/.test(r.path)
          ? 'unreferenced'
          : r.path.endsWith('coin_spin_spritesheet.png')
            ? 'UI only; world coin static'
            : r.path.endsWith('mechanical_door_open_spritesheet.png')
              ? 'Prototype decoration; canonical gates static'
              : r.path.endsWith('water_fill_loop_spritesheet.png')
                ? 'Prototype decoration; canonical tanks static'
                : r.category === 'ui' && r.path.endsWith('_disabled.png')
                  ? 'unreferenced by ButtonSkin'
                  : 'existing/reviewed';

  if (r.error) {
    r.status = 'broken-incompatible';
    r.reason = r.error;
  } else if (seen && !['reserved', 'prop'].includes(r.scope))
    r.status = 'used-functional';
  else if (r.scope === 'reserved') {
    r.status = 'intentionally-reserved';
    r.reason =
      r.category === 'characters'
        ? 'Land/glide-start remain development lab only to preserve the bounded 24-sheet gameplay budget.'
        : 'Extinguishing lava has no supported trigger; matching element traverses it without extinguishing.';
  } else if (r.scope === 'prop') {
    r.status = 'intentionally-reserved';
    r.reason =
      'Editor-selectable decorative state only. No corresponding reactive mechanic. Do not count as functional gameplay.';
  } else if (
    r.packedIn.length ||
    r.duplicateOf.length ||
    r.pixelDuplicateOf?.length
  ) {
    r.status = 'duplicate';
    r.reason = r.packedIn.length
      ? 'Individual source frame verified pixel-for-pixel in spritesheet; runtime loads packed form.'
      : 'Exact byte/pixel duplicate; original retained.';
  } else if (r.scope === 'conditional') {
    r.status = 'registered-never-used';
    r.reason =
      'Disabled skin wired to native disabled state, but no observed disabled instance in current application flow.';
  } else if (r.consumers.length) {
    r.status = 'connected-unverified';
    r.reason =
      r.scope === 'audio'
        ? 'Cue has an event consumer; this audit does not certify audible playback of every cue.'
        : 'Reviewed runtime/editor consumer; no current browser visibility evidence for this file.';
  } else if (r.extension === '.json') {
    r.status = 'intentionally-reserved';
    r.reason =
      'Original object metadata; runtime uses the consolidated worldManifest. Retained as source documentation.';
  } else if (reservations[r.path]) {
    r.status = 'intentionally-reserved';
    r.reason = reservations[r.path];
  } else if (r.references.length) {
    r.status = 'registered-never-used';
    r.reason =
      'Source/registry reference only; no reviewed runtime event consumer.';
  } else {
    r.status = 'unreferenced';
    r.reason =
      'No source or reviewed runtime consumer; retained, not declared implemented.';
  }
  r.campaignLevels = levels
    .filter((d) =>
      d.objects.some(
        (o) =>
          (o.asset && forest[o.asset]?.path === r.path) ||
          (o.type === 'illustration' &&
            illustratedResources([o]).some((a) => a.path === r.path)) ||
          (o.type === 'world' &&
            r.path.startsWith(world.WORLD_ART[o.kind].directory + '/')),
      ),
    )
    .map((d) => d.id);
}
const categories = {};
for (const record of records) {
  const c = (categories[record.category] ??= {
    total: 0,
    statuses: {},
    browserVerified: 0,
    fullAnimationCycles: 0,
  });
  c.total++;
  c.statuses[record.status] = (c.statuses[record.status] ?? 0) + 1;
  if (record.status === 'used-functional') c.browserVerified++;
  if (record.verification.completeFrameCycle) c.fullAnimationCycles++;
}
const errors = records
  .filter((r) => r.error)
  .map((r) => `${r.path}: ${r.error}`);
for (const path of registered.keys())
  if (!byPath.has(path)) errors.push(`Missing referenced asset: ${path}`);
const report = {
  schemaVersion: 1,
  sourceFingerprint,
  evidenceCurrent,
  assetRoot: 'public/assets',
  sourceFilesScanned: sourceFiles.length,
  total: records.length,
  categories,
  errors,
  assets: records,
};
await mkdir('docs', { recursive: true });
await writeFile(
  'docs/asset-coverage.json',
  JSON.stringify(report, null, 2) + '\n',
);
const headers = [
  'path',
  'category',
  'status',
  'previousStatus',
  'scope',
  'dimensions',
  'layout',
  'transparency',
  'consumers',
  'events',
  'animation',
  'campaignLevels',
  'reason',
  'action',
  'verification',
  'duplicateOf',
  'packedIn',
  'sha256',
];
const quote = (v) =>
  `"${(typeof v === 'string' ? v : JSON.stringify(v ?? null)).replaceAll('"', '""')}"`;
await writeFile(
  'docs/asset-coverage.csv',
  [
    headers.join(','),
    ...records.map((r) => headers.map((h) => quote(r[h])).join(',')),
  ].join('\n') + '\n',
);
const table = Object.entries(categories)
  .map(
    ([k, c]) =>
      `| ${k} | ${c.total} | ${c.browserVerified} | ${c.statuses['connected-unverified'] ?? 0} | ${c.statuses.duplicate ?? 0} | ${c.statuses['intentionally-reserved'] ?? 0} | ${c.statuses['registered-never-used'] ?? 0} | ${c.statuses.unreferenced ?? 0} | ${c.statuses['broken-incompatible'] ?? 0} |`,
  )
  .join('\n');
await writeFile(
  'docs/asset-coverage.md',
  `# Auditoría y remediación de assets — Veylith\n\nGenerado por \`npm run audit:assets\`. Fuente: \`public/assets\`; ${records.length} archivos (${records.filter((r) => r.extension === '.png').length} PNG, ${records.filter((r) => r.extension === '.wav').length} WAV y ${records.filter((r) => r.extension === '.json').length} JSON). Se recorrieron ${sourceFiles.length} archivos de código, estilos y datos, además de las pruebas. Los originales no se modifican. \`dist\`, dependencias y copias nativas generadas no se cuentan otra vez.\n\n## Cobertura comprobada\n\nUna referencia o registro **no prueba integración**. “Visible” exige evidencia del navegador con la misma huella del código; “conectado” indica revisión estática sin comprobación visual individual. Las variantes fuente de un spritesheet se contabilizan como duplicados, no como integraciones adicionales. Los visuales del editor sin mecánica se reservan aunque puedan reproducirse allí. Evidencia vigente: **${evidenceCurrent ? 'sí' : 'no'}**.\n\n| Categoría | Total | Visible/funcional | Conectado sin verificar | Duplicados | Reservados | Solo registro/condicional | Sin referencia | Incompatible |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\nEl detalle por ruta, dimensiones, transparencia, hash, layout, coincidencia de frames, consumidores, eventos, exclusión, acción y verificación está en [JSON](asset-coverage.json) y [CSV](asset-coverage.csv). ${errors.length} incompatibilidades o referencias faltantes.\n\n## Remediación implementada\n\n- UI: skins normal/presionado/deshabilitado, botón sostenido por captura táctil/teclado, logo Veylith, panel e iconos de opciones, cierre, cronómetro, récord y continuación. Nodos de niveles distinguen actual/disponible/completado/bloqueado; las estrellas del mapa usan su arte propio y los prototipos se etiquetan P1/P2. Los textos, cifras y traducciones siguen siendo dinámicos.\n- Recompensas: todos los frames CSS tienen duración efectiva, incluido el último; se conservan fallback, semántica accesible y movimiento reducido.\n- Monedas: giro en el mundo y destello de seis frames tras recogida confirmada; máximo 16 efectos, vida por tiempo de juego y limpieza al salir/reiniciar. No se toca el abono de monedas.\n- Puertas canónicas: apertura/cierre real de ocho frames, sin esperar la animación para actualizar la colisión. Salidas de puzzles con marco antiguo y sello mágico: ruptura al resolver, enfoque de cámara y fotograma original estático en el editor. El portal anterior queda en los prototipos.\n- Depósitos y antorchas: agua y llama originales animadas al resolver el receptor; estados estáticos conservados como fallback.\n- Pack funcional: arranque/parada del ventilador, activación del ascensor, calentamiento completo de caldera y agrietado completo por golpe. Las animaciones ya no saltan directamente al último frame; calentar no produce vapor antes de cumplir la mecánica y agrietar no destruye anticipadamente. Puente avanza por los frames de su progreso físico, sin recrear por cada porcentaje. Agua/lava componen burbujas/partículas y el contacto seguro con agua produce splash independiente.\n- Las animaciones opcionales inválidas usan arte estático/miniatura, sin impedir la simulación. La primera etapa añade colisiones y seis laboratorios separados; conserva gemas, campaña canónica, save v1 y el servicio de archivos del editor.\n- Campaña ilustrada: diez escenarios con capas y overlays observados en navegador; ver [inventario, soluciones y límites](illustrated-campaign.md) y su evidencia específica. La evidencia global antigua mantiene su propia huella y no se renueva por registrar assets.\n- Entorno nuevo: 155 PNG y 12 familias de plataformas conectados al catálogo buscable y al renderer compartido. La carga depende de los objetos colocados; las decoraciones conservan el lienzo completo y las plataformas tienen colliders independientes. Medidas y hashes en [auditoría de expansión](asset-environment-expansion-audit.json); pruebas y límites en [verificación de integración](asset-environment-integration-verification.json).\n\n## Exclusiones y límites reales\n\nSolo existen diez niveles canónicos, todos de Tierra. Los prototipos multielemento siguen separados y compatibles con sus saves. Los capítulos 11–20 Agua, 21–30 Fuego y 31+ Aire aún no existen; esta auditoría no inventa niveles ni añade botones de transformación. Las gemas conservan la transformación inmediata.\n\nLand de los cuatro personajes y glide_start siguen reservados al laboratorio conforme al presupuesto de 24 hojas de gameplay. Quedan cinco familias visuales del pack. La primera etapa incorpora puerta temporizada, desaparición, rebote, flotabilidad, barrera e interruptor configurable: ver [mecánicas y pruebas](stage-one-mechanics.md). Los objetos antiguos guardados como prop conservan su comportamiento hasta conversión explícita. Crecimiento, molino, engranaje, túnel de viento y vapor siguen siendo visuales. Los estados de lava apagada tampoco tienen disparador. Los botones de pistas/compra y layouts alternativos quedan fuera del alcance. La placa y la pared antigua tienen estados estáticos reales, no una secuencia exportada; no se inventan frames.\n\n## Repetición y evidencia\n\n1. Ejecutar \`npm run audit:assets\`: comprueba todos los PNG/WAV/JSON, dimensiones, alpha, duplicados y coincidencia de cada celda con su frame fuente. Sale con error ante archivos incompatibles o referencias revisadas faltantes. Un asset nuevo sin consumidor aparece como sin referencia; no se aprueba automáticamente.\n2. Ejecutar \`npm run typecheck\`, \`npm run lint\`, \`npm test\`, \`npm run build\`, \`npm run format:check\`.\n3. Con Vite y Playwright disponible externamente, ejecutar \`scripts/asset-coverage-smoke.js\`, \`scripts/world-smoke.js\` y \`scripts/earth-campaign-smoke.js\`. Admiten \`PLAYWRIGHT_MODULE\`, \`VEYLITH_URL\` y \`SMOKE_OUTPUT\`. El harness es de desarrollo y usa entradas reales de movimiento/poder; no se importa al juego de producción.\n4. La evidencia del navegador se conserva en \`docs/asset-browser-evidence.json\`; si cambia la huella del código, el auditor deja de contar esa evidencia como vigente. La reproducción completa solo se afirma para secuencias con todos los índices observados.\n\nLas pruebas de Chrome no certifican consumo de memoria ni rendimiento de GPU en iPhone físico. Se informa memoria de texturas calculada y estabilidad de recursos en reinicios, no memoria total del dispositivo. El audio dispone de consumidores existentes; no se declara escuchado cada WAV individualmente.\n\nHuella del código: \`${sourceFingerprint}\`.\n`,
);
console.log(
  JSON.stringify(
    { total: records.length, categories, errors, evidenceCurrent },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;

for (const [file, parser] of [
  ['docs/asset-coverage.json', 'json'],
  ['docs/asset-coverage.md', 'markdown'],
])
  await writeFile(
    file,
    await format(await readFile(file, 'utf8'), {
      parser,
      singleQuote: true,
      trailingComma: 'all',
    }),
  );
