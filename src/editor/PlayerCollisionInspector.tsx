import type {
  LevelObject,
  PlayerCollisionFaces,
} from '../game/levels/schema/types';
import {
  hasPlayerSurface,
  playerCollisionFaces,
  PLATFORM_FACES,
  SOLID_FACES,
} from '../game/levels/schema/playerCollision';

export function PlayerCollisionInspector({
  object,
  update,
}: {
  object: LevelObject;
  update: (patch: Partial<LevelObject>) => void;
}) {
  if (!hasPlayerSurface(object)) return null;
  const faces = playerCollisionFaces(object);
  const set = (playerCollision: PlayerCollisionFaces) =>
    update({ collider: { ...object.collider, playerCollision } });
  return (
    <fieldset>
      <legend>Caras sólidas para el personaje</legend>
      <p>
        Marca las caras que deben detener al personaje. Las demás permiten
        atravesarlo.
      </p>
      <button type="button" onClick={() => set({ ...PLATFORM_FACES })}>
        Solo superficie
      </button>
      <button type="button" onClick={() => set({ ...SOLID_FACES })}>
        Pared sólida
      </button>
      {(
        [
          ['top', 'Arriba · apoyarse'],
          ['bottom', 'Abajo · detener la cabeza'],
          ['left', 'Lado izquierdo'],
          ['right', 'Lado derecho'],
        ] as const
      ).map(([face, label]) => (
        <label key={face}>
          <input
            type="checkbox"
            checked={faces[face]}
            onChange={(e) => set({ ...faces, [face]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <button
        type="button"
        disabled={!object.collider.playerCollision}
        onClick={() => {
          const collider = { ...object.collider };
          delete collider.playerCollision;
          update({ collider });
        }}
      >
        Restablecer caras
      </button>
      <small>
        Se guarda con el nivel. Los bloques y proyectiles mantienen sus propias
        colisiones.
      </small>
    </fieldset>
  );
}
