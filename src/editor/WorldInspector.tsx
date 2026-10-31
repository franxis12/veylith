import type { LevelDocument } from '../game/levels/schema/types';
import type { WorldObject, WorldBehavior } from '../game/systems/world/types';
import { WORLD_ART } from '../game/assets/worldAssets';
import { isMechanism } from '../game/levels/schema/validate';
import { STAGE_ONE_KINDS } from '../game/systems/world/types';
import { worldPreset } from '../game/systems/world/presets';
import { AdvancedInspector } from './AdvancedInspector';
import { StageOneInspector } from './StageOneInspector';
import { LeverInspector } from './LeverInspector';
export function WorldInspector({
  object,
  document,
  update,
}: {
  object: WorldObject;
  document: LevelDocument;
  update: (patch: Partial<WorldObject>) => void;
}) {
  const b = object.behavior;
  const behavior = (patch: Partial<WorldBehavior>) =>
    update({ behavior: { ...b, ...patch } as WorldBehavior });
  const number = (
    label: string,
    value: number,
    change: (n: number) => void,
  ) => (
    <label key={label}>
      {label}
      <input
        aria-label={label}
        type="number"
        step="any"
        key={value}
        defaultValue={value}
        onBlur={(e) => {
          if (Number.isFinite(e.currentTarget.valueAsNumber))
            change(e.currentTarget.valueAsNumber);
        }}
      />
    </label>
  );
  return (
    <>
      <p>{object.hint}</p>
      {b.kind === 'prop' && STAGE_ONE_KINDS.includes(object.kind) && (
        <button
          type="button"
          onClick={() => {
            const preset = worldPreset(object.kind);
            update({
              behavior: preset.behavior,
              hint: preset.hint,
              collider: {
                ...object.collider,
                enabled: preset.collider.enabled,
              },
              effect: { ...object.effect, enabled: preset.effect.enabled },
            });
          }}
        >
          Convertir en mecanismo funcional
        </button>
      )}
      {b.kind === 'prop' ? (
        <>
          <p>
            Visual colocable. La animación no activa mecánicas. Su collider, si
            lo habilitas, es un rectángulo sólido fijo.
          </p>
          <label>
            Estado visual
            <select
              aria-label="Estado visual"
              value={object.state}
              onChange={(e) => update({ state: e.target.value })}
            >
              {Object.keys(WORLD_ART[object.kind].states).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p>
          El estado visual sigue la mecánica durante la prueba. Reiniciar
          restaura el estado inicial.
        </p>
      )}
      {[
        'fan',
        'heat',
        'lake',
        'lever',
        'waterwheel',
        'boiler',
        'switch',
        'receiver',
        'beamEmitter',
      ].includes(b.kind) && (
        <fieldset>
          <legend>Zona de efecto independiente</legend>
          <label>
            <input
              type="checkbox"
              checked={object.effect.enabled}
              onChange={(e) =>
                update({
                  effect: { ...object.effect, enabled: e.target.checked },
                })
              }
            />
            Efecto activo
          </label>
          {(['x', 'y', 'width', 'height'] as const).map((k, i) =>
            number(
              [
                'Offset efecto X',
                'Offset efecto Y',
                'Ancho efecto',
                'Alto efecto',
              ][i]!,
              object.effect[k],
              (n) => update({ effect: { ...object.effect, [k]: n } }),
            ),
          )}
          <small>
            Contorno violeta. No cambia al redimensionar el arte ni el collider.
          </small>
        </fieldset>
      )}
      {'requires' in b && (
        <fieldset>
          <legend>Activación por IDs (todos)</legend>
          <label>
            <input
              type="checkbox"
              checked={b.autostart}
              onChange={(e) => behavior({ autostart: e.target.checked })}
            />
            Activo sin conexiones
          </label>
          {document.objects.filter(isMechanism).map((o) => (
            <label key={o.id}>
              <input
                type="checkbox"
                checked={b.requires.includes(o.id)}
                onChange={(e) =>
                  behavior({
                    requires: e.target.checked
                      ? [...b.requires, o.id]
                      : b.requires.filter((id) => id !== o.id),
                  })
                }
              />
              {o.id}
            </label>
          ))}
          {b.requires
            .filter((id) => !document.objects.some((o) => o.id === id))
            .map((id) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    behavior({
                      requires: b.requires.filter((ref) => ref !== id),
                    })
                  }
                />
                {id} (falta)
              </label>
            ))}
          <small>
            Con conexiones, todos los IDs deben estar activos. Una palanca puede
            apagarlos; rueda, caldera y pared mantienen su señal hasta
            reiniciar.
          </small>
        </fieldset>
      )}
      {b.kind === 'elevator' && (
        <fieldset>
          <legend>Recorrido del ascensor</legend>
          {number('Desplazamiento X', b.travelX, (n) =>
            behavior({ travelX: n }),
          )}
          {number('Desplazamiento Y', b.travelY, (n) =>
            behavior({ travelY: n }),
          )}
          {number('Velocidad del ascensor', b.speed, (n) =>
            behavior({ speed: n }),
          )}
          <label>
            Recorrido
            <select
              aria-label="Recorrido"
              value={b.mode}
              onChange={(e) =>
                behavior({
                  mode: e.target.value as 'once' | 'pingpong' | 'controlled',
                })
              }
            >
              <option value="controlled">Ida y regreso por palanca</option>
              <option value="pingpong">Ida y vuelta automática</option>
              <option value="once">Solo ida</option>
            </select>
          </label>
          <small>
            Desplazamiento relativo a su posición. Transporta al jugador. Se
            detiene ante terreno u obstáculos; no aplasta.{' '}
            {b.mode === 'controlled'
              ? 'Activa: va al destino. Inactiva: regresa al inicio. Cada pulsación puede invertir el recorrido, incluso a mitad de camino.'
              : 'Sin señal, queda en su posición actual.'}
          </small>
        </fieldset>
      )}
      {b.kind === 'fan' && (
        <>
          <label>
            Dirección del viento
            <select
              aria-label="Dirección del viento"
              value={b.direction}
              onChange={(e) =>
                behavior({ direction: Number(e.target.value) as -1 | 1 })
              }
            >
              <option value={1}>Derecha</option>
              <option value={-1}>Izquierda</option>
            </select>
          </label>
          {number('Velocidad del viento', b.strength, (n) =>
            behavior({ strength: n }),
          )}
          <p>
            Tierra resiste. Los demás avanzan un poco contra el viento antes de
            ser empujados hacia atrás. El empuje aumenta gradualmente y conserva
            un breve impulso al salir de la zona.
          </p>
        </>
      )}
      {(b.kind === 'heat' || b.kind === 'lake') && (
        <p>
          La zona reinicia el intento al tocarla con otro elemento.{' '}
          {b.kind === 'heat' ? 'Fuego' : 'Agua'} puede avanzar sobre la
          superficie horizontal del efecto. No cambia de elemento. El collider
          del dibujo no se usa para líquidos.
        </p>
      )}
      {b.kind === 'waterwheel' &&
        number('Impactos de Agua', b.hits, (n) => behavior({ hits: n }))}
      {b.kind === 'boiler' && (
        <>
          {number('Impactos de Agua', b.waterHits, (n) =>
            behavior({ waterHits: n }),
          )}
          {number('Impactos de Fuego', b.fireHits, (n) =>
            behavior({ fireHits: n }),
          )}
          <p>
            Acumula ambos elementos en cualquier orden. Activa su salida solo al
            completar los dos.
          </p>
        </>
      )}
      {b.kind === 'bridge' && (
        <>
          {number('Duración del puente (ms)', b.duration, (n) =>
            behavior({ duration: n }),
          )}
          <p>
            Colisión disponible al extenderse por completo; se desactiva al
            comenzar a retraerse.
          </p>
        </>
      )}
      {b.kind === 'breakable' &&
        number('Golpes de Tierra', b.strikes, (n) => behavior({ strikes: n }))}
      <LeverInspector object={object} document={document} change={behavior} />
      <AdvancedInspector object={object} document={document} update={update} />
      <StageOneInspector
        object={object}
        document={document}
        change={behavior}
      />
    </>
  );
}
