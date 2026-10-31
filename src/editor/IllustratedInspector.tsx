import { illustratedScene } from '../game/assets/illustratedCatalog';
import type {
  IllustrationObject,
  IllustratedOverlay,
} from '../game/assets/illustratedCatalog';
function Numeric({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: (n: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        key={value}
        aria-label={label}
        type="number"
        step="any"
        defaultValue={Number(value.toFixed(4))}
        onBlur={(e) => {
          const n = e.currentTarget.valueAsNumber;
          if (Number.isFinite(n) && n !== value) change(n);
        }}
      />
    </label>
  );
}
export function IllustratedInspector({
  object,
  update,
}: {
  object: IllustrationObject;
  update: (patch: Partial<IllustrationObject>) => void;
}) {
  const scene = illustratedScene(object.sceneId);
  if (!scene) return <p>Escenario no registrado.</p>;
  const patch = (id: string, next: Partial<IllustratedOverlay>) =>
    update({
      overlays: object.overlays.map((o) =>
        o.id === id ? { ...o, ...next } : o,
      ),
    });
  return (
    <fieldset>
      <legend>Escenario ilustrado · {scene.title}</legend>
      <p>
        {scene.width} × {scene.height} px originales. Origen superior izquierdo;
        100 % = 1 píxel por unidad de mundo. Conserva la proporción.
      </p>
      <Numeric
        label="Escala del escenario (%)"
        value={(object.width / scene.width) * 100}
        change={(n) => {
          if (n > 0)
            update({
              width: (scene.width * n) / 100,
              height: (scene.height * n) / 100,
            });
        }}
      />
      <p>
        La escala mueve las capas y animaciones juntas. Los Box Colliders y
        mecanismos se editan por separado. Capa desplaza todo el orden: mundo
        detrás del jugador; primer plano delante.
      </p>
      {scene.warnings.map((warning) => (
        <p role="alert" key={warning}>
          {warning}
        </p>
      ))}
      {scene.layers.map((layer) => (
        <label key={layer.id}>
          <input
            type="checkbox"
            aria-label={`Capa ${layer.id}`}
            checked={object.layers.includes(layer.id)}
            onChange={(e) =>
              update({
                layers: e.target.checked
                  ? [...object.layers, layer.id]
                  : object.layers.filter((id) => id !== layer.id),
              })
            }
          />
          {layer.id} · z {layer.z}
        </label>
      ))}
      <h3>Animaciones ambientales</h3>
      <p>
        Posiciones y tamaños locales, antes de aplicar la escala del escenario.
        Los overlays sin coordenadas empiezan desactivados: colócalos y
        actívalos aquí.
      </p>
      {object.overlays.map((o) => (
        <details key={o.id}>
          <summary>
            {o.id} · {o.animation}
            {o.visible ? '' : ' · desactivado'}
          </summary>
          <label>
            <input
              type="checkbox"
              aria-label={`Mostrar ${o.id}`}
              checked={o.visible}
              onChange={(e) => patch(o.id, { visible: e.target.checked })}
            />
            Mostrar animación
          </label>
          {(
            [
              'x',
              'y',
              'width',
              'height',
              'z',
              'opacity',
              'phase',
              'fps',
            ] as const
          ).map((key, i) => (
            <Numeric
              key={key}
              label={`${o.id} · ${['X local', 'Y local', 'Ancho', 'Alto', 'Orden z', 'Opacidad (0–1)', 'Fotograma inicial', 'FPS'][i]}`}
              value={o[key]}
              change={(n) => patch(o.id, { [key]: n })}
            />
          ))}
          <Numeric
            label={`${o.id} · Escalar overlay (%)`}
            value={
              (o.width /
                (scene.overlays.find((original) => original.id === o.id)
                  ?.width ?? scene.animations[o.animation]!.frameWidth)) *
              100
            }
            change={(n) => {
              if (n > 0)
                patch(o.id, {
                  width:
                    ((scene.overlays.find((original) => original.id === o.id)
                      ?.width ?? scene.animations[o.animation]!.frameWidth) *
                      n) /
                    100,
                  height:
                    (o.height *
                      (((scene.overlays.find((original) => original.id === o.id)
                        ?.width ?? scene.animations[o.animation]!.frameWidth) *
                        n) /
                        100)) /
                    o.width,
                });
            }}
          />
          <button
            onClick={() =>
              update({
                overlays: object.overlays.filter((item) => item.id !== o.id),
              })
            }
          >
            Quitar overlay {o.id}
          </button>
        </details>
      ))}
      <label>
        Añadir animación
        <select
          aria-label="Añadir animación ambiental"
          value=""
          onChange={(e) => {
            const animation = e.target.value,
              a = scene.animations[animation];
            if (!a) return;
            let id = animation,
              n = 2;
            while (object.overlays.some((o) => o.id === id))
              id = `${animation}-${n++}`;
            update({
              overlays: [
                ...object.overlays,
                {
                  id,
                  animation,
                  x: 0,
                  y: 0,
                  width: a.frameWidth,
                  height: a.frameHeight,
                  z: 30,
                  opacity: 1,
                  phase: 0,
                  fps: a.fps,
                  visible: false,
                },
              ],
            });
          }}
        >
          <option value="">Seleccionar…</option>
          {Object.keys(scene.animations).map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <p>
        No se cargan previews, imágenes de alineación ni secciones alternativas.
        Añade superficies desde «Box Collider independiente» o «Dibujar
        collider».
      </p>
    </fieldset>
  );
}
