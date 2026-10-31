import type { LevelDocument } from '../game/levels/schema/types';
import { parseLevel } from '../game/levels/schema/validate';
export interface LevelListing {
  id: string;
  name: string;
  protected: boolean;
  error?: string;
}
export interface OpenLevel {
  document: LevelDocument;
  etag: string;
}
let token: Promise<string> | undefined;
async function session(): Promise<string> {
  token ??= fetch('/__veylith_editor/session')
    .then(async (r) => {
      if (!r.ok)
        throw new Error(
          'El guardado local requiere el servidor de desarrollo en localhost.',
        );
      return ((await r.json()) as { token: string }).token;
    })
    .catch((error) => {
      token = undefined;
      throw error;
    });
  return token;
}
async function request<T>(
  path: string,
  method = 'GET',
  value?: LevelDocument,
  etag?: string,
): Promise<T> {
  const response = await fetch(`/__veylith_editor${path}`, {
    method,
    headers: {
      'X-Veylith-Editor': await session(),
      ...(value ? { 'Content-Type': 'application/json' } : {}),
      ...(etag ? { 'If-Match': etag } : {}),
    },
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error ?? 'No se pudo completar la operación.');
  return result;
}
export const levelApi = {
  list: () => request<LevelListing[]>('/levels'),
  async open(id: string): Promise<OpenLevel> {
    const result = await request<OpenLevel>(
      `/levels/${encodeURIComponent(id)}`,
    );
    return { ...result, document: parseLevel(result.document) };
  },
  save: (doc: LevelDocument, etag: string) =>
    request<OpenLevel>(
      `/levels/${encodeURIComponent(doc.id)}`,
      'PUT',
      doc,
      etag,
    ),
  delete: (id: string, etag: string) =>
    request(`/levels/${encodeURIComponent(id)}`, 'DELETE', undefined, etag),
};
