import { FOREST_PUZZLE_IDS } from '../src/game/levels/campaignOrder';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { parseLevel, serializeLevel } from '../src/game/levels/schema/validate';
import { LEVEL_ID } from '../src/game/levels/schema/types';
import type { LevelDocument } from '../src/game/levels/schema/types';
export class RepositoryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const protectedIds = new Set<string>(FOREST_PUZZLE_IDS);
const etag = (text: string) =>
  `"${createHash('sha256').update(text).digest('hex')}"`;
/** Only regular <slug>.json files under one verified real directory are reachable. */
export class LevelRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}
  private async file(id: string): Promise<string> {
    if (!LEVEL_ID.test(id))
      throw new RepositoryError(400, 'ID de nivel no válido.');
    await mkdir(this.directory, { recursive: true });
    if ((await realpath(this.directory)) !== resolve(this.directory))
      throw new RepositoryError(
        403,
        'El directorio de niveles no puede ser un enlace simbólico.',
      );
    const path = join(this.directory, `${id}.json`);
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new RepositoryError(
          403,
          'Solo se permiten archivos JSON regulares.',
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return path;
  }
  async list(): Promise<
    { id: string; name: string; protected: boolean; error?: string }[]
  > {
    await this.file('directory-check');
    const files = await readdir(this.directory, { withFileTypes: true });
    return Promise.all(
      files
        .filter(
          (f) =>
            f.isFile() &&
            f.name.endsWith('.json') &&
            LEVEL_ID.test(f.name.slice(0, -5)),
        )
        .map(async (file) => {
          const id = file.name.slice(0, -5);
          try {
            return {
              id,
              name: (await this.read(id)).document.name,
              protected: protectedIds.has(id),
            };
          } catch {
            return {
              id,
              name: id,
              protected: protectedIds.has(id),
              error:
                'Este archivo no supera la validación; se conserva sin cambios.',
            };
          }
        }),
    );
  }
  async read(id: string): Promise<{ document: LevelDocument; etag: string }> {
    try {
      const text = await readFile(await this.file(id), 'utf8');
      return { document: parseLevel(JSON.parse(text)), etag: etag(text) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new RepositoryError(404, 'El nivel no existe.');
      throw error;
    }
  }
  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
  save(
    id: string,
    value: unknown,
    expected: string | undefined,
  ): Promise<{ document: LevelDocument; etag: string }> {
    return this.serialized(async () => {
      const doc = parseLevel(value);
      if (doc.id !== id)
        throw new RepositoryError(
          400,
          'El ID del archivo y del nivel deben coincidir.',
        );
      const path = await this.file(id);
      let current: string | undefined;
      try {
        current = await readFile(path, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (expected !== (current === undefined ? '*' : etag(current)))
        throw new RepositoryError(
          409,
          'El archivo cambió o ya existe. Abre de nuevo o usa Guardar como con otro ID.',
        );
      const text = serializeLevel(doc),
        temporary = join(this.directory, `.write-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, text, { flag: 'wx' });
        await this.file(id);
        await rename(temporary, path);
      } finally {
        await unlink(temporary).catch(() => undefined);
      }
      return { document: doc, etag: etag(text) };
    });
  }
  delete(id: string, expected: string | undefined): Promise<void> {
    return this.serialized(async () => {
      if (protectedIds.has(id))
        throw new RepositoryError(
          403,
          'Los niveles de campaña se conservan. Puedes duplicarlos y eliminar sus copias.',
        );
      const existing = await this.read(id);
      if (existing.etag !== expected)
        throw new RepositoryError(
          409,
          'El archivo cambió; vuelve a abrirlo antes de eliminar.',
        );
      await unlink(await this.file(id));
    });
  }
}
