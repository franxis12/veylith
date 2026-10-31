import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { LevelRepository, RepositoryError } from './levelRepository';
const PREFIX = '/__veylith_editor';
const MAX_BYTES = 2 * 1024 * 1024;
export function allowedEditorRequest(
  req: Pick<IncomingMessage, 'headers' | 'socket'>,
): boolean {
  const address = req.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? ''))
    return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  try {
    const host = req.headers.host;
    if (!host) return false;
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(`http://${host}`).hostname,
      )
    )
      return false;
    return !req.headers.origin || new URL(req.headers.origin).host === host;
  } catch {
    return false;
  }
}
async function body(req: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_BYTES)
      throw new RepositoryError(413, 'El archivo excede 2 MiB.');
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new RepositoryError(
      400,
      `JSON no válido: ${error instanceof Error ? error.message : 'error'}`,
    );
  }
}
export function levelEditorPlugin(): Plugin {
  return {
    name: 'veylith-local-level-editor',
    apply: 'serve',
    config: () => ({
      server: { watch: { ignored: ['**/src/game/levels/data/**'] } },
    }),
    configureServer(server) {
      if (server.config.mode === 'production') return;
      const repository = new LevelRepository(
        resolve(server.config.root, 'src/game/levels/data'),
      );
      const token = randomBytes(32).toString('hex');
      // Explicit saves update disk. Avoid an HTML/HMR reload destroying a dirty editor document.
      server.watcher.unwatch(
        resolve(server.config.root, 'src/game/levels/data'),
      );
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]!;
        if (!path.startsWith(PREFIX)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const send = (status: number, value: unknown) => {
          res.statusCode = status;
          res.end(JSON.stringify(value));
        };
        if (!allowedEditorRequest(req)) {
          send(403, {
            error:
              'El editor de archivos solo acepta solicitudes locales del mismo origen.',
          });
          return;
        }
        try {
          if (path === `${PREFIX}/session` && req.method === 'GET') {
            send(200, { token });
            return;
          }
          const supplied = String(req.headers['x-veylith-editor'] ?? '');
          if (
            supplied.length !== token.length ||
            !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
          )
            throw new RepositoryError(
              403,
              'Sesión de editor no válida. Recarga el editor.',
            );
          if (path === `${PREFIX}/levels` && req.method === 'GET') {
            send(200, await repository.list());
            return;
          }
          const match =
            /^\/__veylith_editor\/levels\/([a-z][a-z0-9-]{0,63})$/.exec(path);
          if (!match)
            throw new RepositoryError(400, 'Ruta de nivel no válida.');
          const id = match[1]!;
          if (req.method === 'GET') {
            send(200, await repository.read(id));
            return;
          }
          const expected =
            typeof req.headers['if-match'] === 'string'
              ? req.headers['if-match']
              : undefined;
          if (req.method === 'PUT') {
            if (!req.headers['content-type']?.startsWith('application/json'))
              throw new RepositoryError(415, 'Se requiere JSON.');
            const result = await repository.save(id, await body(req), expected);
            // Re-import saved JSON on the next campaign reload without broadcasting into the editor.
            const modules = server.moduleGraph.getModulesByFile(
              resolve(server.config.root, `src/game/levels/data/${id}.json`),
            );
            modules?.forEach((module) =>
              server.moduleGraph.invalidateModule(module),
            );
            send(200, result);
            return;
          }
          if (req.method === 'DELETE') {
            await repository.delete(id, expected);
            send(200, { deleted: id });
            return;
          }
          throw new RepositoryError(405, 'Método no permitido.');
        } catch (error) {
          send(error instanceof RepositoryError ? error.status : 400, {
            error:
              error instanceof Error
                ? error.message
                : 'No se pudo completar la operación.',
          });
        }
      });
    },
  };
}
