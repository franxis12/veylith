import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { EFFECT_SHEETS } from '../game/assets/effectSheets';

it('matches the real RGBA sheet headers and keeps the unique effect load below 28 MiB', () => {
  let bytes = 0;
  for (const sheet of Object.values(EFFECT_SHEETS)) {
    const png = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../public',
        sheet.path,
      ),
    );
    expect(png.readUInt32BE(16)).toBe(sheet.width * sheet.frames);
    expect(png.readUInt32BE(20)).toBe(sheet.height);
    expect(png[25]).toBe(6);
    bytes += sheet.width * sheet.height * sheet.frames * 4;
  }
  expect(bytes).toBeLessThan(28 * 1024 * 1024);
  expect(
    Object.values(EFFECT_SHEETS).some((sheet) =>
      sheet.path.includes('landing_impact/'),
    ),
  ).toBe(false);
});
