import {
  MIRROR_ANGLES,
  normalizeAngle,
  reflectorAngle,
} from '../game/systems/world/reflectorAngles';
import type { WorldObject, WorldBehavior } from '../game/systems/world/types';
import type { LevelDocument } from '../game/levels/schema/types';
import type {
  BeamDirection,
  MirrorOrientation,
} from '../game/systems/world/advancedTypes';

export function AdvancedInspector({
  object,
  document,
  update,
}: {
  object: WorldObject;
  document: LevelDocument;
  update: (p: Partial<WorldObject>) => void;
}) {
  const b = object.behavior;
  const change = (p: Partial<WorldBehavior>) =>
    update({ behavior: { ...b, ...p } as WorldBehavior });
  const number = (name: string, value: number, fn: (n: number) => void) => (
    <label>
      {name}
      <input
        aria-label={name}
        type="number"
        step="any"
        key={value}
        defaultValue={value}
        onBlur={(e) => {
          if (Number.isFinite(e.currentTarget.valueAsNumber))
            fn(e.currentTarget.valueAsNumber);
        }}
      />
    </label>
  );
  return (
    <>
      {b.kind === 'reflector' && (
        <>
          <label>
            Orientación del espejo
            <select
              aria-label="Orientación del espejo"
              value={b.orientation}
              onChange={(e) =>
                change({
                  orientation: e.target.value as MirrorOrientation,
                  angle: MIRROR_ANGLES[e.target.value as MirrorOrientation],
                })
              }
            >
              {['nw', 'ne', 'se', 'sw'].map((v) => (
                <option key={v} value={v}>
                  {v.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={b.pushable}
              onChange={(e) => change({ pushable: e.target.checked })}
            />
            Empujable por Tierra
          </label>
          {number('Ángulo inicial de la cara (°)', reflectorAngle(b), (angle) =>
            change({ angle: normalizeAngle(angle) }),
          )}
          <label>
            <input
              type="checkbox"
              checked={b.rotatable !== false}
              onChange={(e) => change({ rotatable: e.target.checked })}
            />
            Permitir giro con Acción
          </label>
          <small>
            Mantén Acción cerca del espejo para girar; suelta para terminar. La
            base y su collider no giran. El reverso absorbe la luz.
          </small>
        </>
      )}
      {b.kind === 'beamEmitter' && (
        <>
          <label>
            Dirección del haz
            <select
              aria-label="Dirección del haz"
              value={b.direction}
              onChange={(e) =>
                change({ direction: e.target.value as BeamDirection })
              }
            >
              {[
                ['right', 'Derecha'],
                ['down', 'Abajo'],
                ['left', 'Izquierda'],
                ['up', 'Arriba'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {number('Alcance total del haz', b.range, (n) =>
            change({ range: n }),
          )}
          {number('Máximo de reflexiones', b.maxBounces, (n) =>
            change({ maxBounces: n }),
          )}
        </>
      )}
      {b.kind === 'receiver' && (
        <label>
          <input
            type="checkbox"
            checked={b.latch}
            onChange={(e) => change({ latch: e.target.checked })}
          />
          Mantener señal hasta reiniciar
        </label>
      )}
      {b.kind === 'pulley' && (
        <>
          <label>
            Contrapeso enlazado
            <select
              aria-label="Contrapeso enlazado"
              value={b.counterweightId}
              onChange={(e) => change({ counterweightId: e.target.value })}
            >
              <option value="">Sin enlace (inmóvil)</option>
              {document.objects
                .filter(
                  (o) =>
                    o.type === 'world' && o.behavior.kind === 'pulleyWeight',
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}
                  </option>
                ))}
              {b.counterweightId &&
                !document.objects.some((o) => o.id === b.counterweightId) && (
                  <option value={b.counterweightId}>
                    {b.counterweightId} (falta)
                  </option>
                )}
            </select>
          </label>
          <label>
            Control de polea
            <select
              aria-label="Control de polea"
              value={b.mode}
              onChange={(e) =>
                change({ mode: e.target.value as 'weight' | 'signal' })
              }
            >
              <option value="weight">Peso sobre las piezas</option>
              <option value="signal">Activación por señal</option>
            </select>
          </label>
          {number('Recorrido vertical de polea', b.travelY, (n) =>
            change({ travelY: n }),
          )}
          {number('Velocidad de polea', b.speed, (n) => change({ speed: n }))}
          {number('Diferencia de peso requerida', b.threshold, (n) =>
            change({ threshold: n }),
          )}
          <small>
            Tierra pesa 2; otros elementos 1; bloques y espejos 3. Se suma la
            masa del contrapeso al umbral. Sin señal vuelve al origen. Ambos
            cuerpos se detienen ante obstáculos.
          </small>
        </>
      )}
      {b.kind === 'pulleyWeight' &&
        number('Masa del contrapeso', b.mass, (n) => change({ mass: n }))}
      {(b.kind === 'conveyor' || b.kind === 'directionalGate') && (
        <label>
          Dirección permitida
          <select
            aria-label="Dirección permitida"
            value={b.direction}
            onChange={(e) =>
              change({ direction: Number(e.target.value) as -1 | 1 })
            }
          >
            <option value={1}>Derecha</option>
            <option value={-1}>Izquierda</option>
          </select>
        </label>
      )}
      {b.kind === 'conveyor' && (
        <>
          {number('Velocidad de cinta', b.speed, (n) => change({ speed: n }))}
          {number('Segmentos centrales', b.segments, (n) => {
            if (!Number.isInteger(n) || n < 1 || n > 32) return;
            const tile = object.width / (b.segments + 2),
              width = tile * (n + 2);
            update({
              width,
              collider: {
                ...object.collider,
                width: Math.max(
                  1,
                  object.collider.width + width - object.width,
                ),
              },
              behavior: { ...b, segments: n },
            });
          })}
          <small>
            Cambiar los segmentos extiende el dibujo y el collider conservando
            los extremos. El resto de ajustes visuales mantienen el collider
            independiente.
          </small>
        </>
      )}
      {b.kind === 'directionalGate' && (
        <small>
          Activo significa desbloqueado. El bloqueo espera a que termine cada
          cruce autorizado. El collider debe cubrir todo el paso; añade suelo y
          techo si el puzzle impide saltarlo.
        </small>
      )}
    </>
  );
}
