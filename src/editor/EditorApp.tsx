import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { EditorModel } from './model';
import { EDITOR_ZOOM, clampEditorZoom } from './geometry';
import { GAME_CAMERA_ZOOM } from '../game/config/settings';
import { newLevel } from './library';
import { AssetLibrary } from './AssetLibrary';
import { levelApi } from './api';
import type { LevelListing } from './api';
import { EditorCanvas } from './EditorCanvas';
import type { EditorCanvasHandle } from './EditorCanvas';
import { Inspector } from './Inspector';
import { Playtest } from './Playtest';
import type { LevelDocument } from '../game/levels/schema/types';
import { validateLevel } from '../game/levels/schema/validate';
import './editor.css';
export default function EditorApp() {
  const [model, setModel] = useState(() => new EditorModel(newLevel(), false)),
    snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [etag, setEtag] = useState('*'),
    [listing, setListing] = useState<LevelListing[]>([]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('Cargando niveles…'),
    [errors, setErrors] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'open' | 'save-as' | 'duplicate' | null>(
      null,
    ),
    [fileId, setFileId] = useState(''),
    [fileName, setFileName] = useState(''),
    [chosen, setChosen] = useState('forest-1');
  const [grid, setGrid] = useState(32),
    [snap, setSnap] = useState(true),
    [showGrid, setShowGrid] = useState(true),
    [colliderMode, setColliderMode] = useState(false),
    [effectMode, setEffectMode] = useState(false),
    [drawCollider, setDrawCollider] = useState(false),
    [zoom, setZoom] = useState<number>(EDITOR_ZOOM.initial),
    [playing, setPlaying] = useState<LevelDocument | null>(null);
  const canvas = useRef<EditorCanvasHandle>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([levelApi.list(), levelApi.open('forest-1')])
      .then(([files, opened]) => {
        if (cancelled) return;
        setListing(files);
        setModel(new EditorModel(opened.document));
        setEtag(opened.etag);
        setStatus(
          'Nivel abierto. Los cambios se guardan solo al pulsar Guardar.',
        );
      })
      .catch((error) => {
        if (!cancelled) setStatus(String(error.message));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (model.getSnapshot().dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [model]);
  const execute = useCallback(async (operation: () => Promise<void>) => {
    setBusy(true);
    setErrors([]);
    try {
      await operation();
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : 'No se pudo completar.',
      ]);
    } finally {
      setBusy(false);
    }
  }, []);
  const save = useCallback(() => {
    const doc = model.getSnapshot().document,
      issues = validateLevel(doc);
    setErrors(issues);
    if (issues.length) return;
    void execute(async () => {
      const result = await levelApi.save(doc, etag);
      setEtag(result.etag);
      model.markSaved(doc);
      setListing(await levelApi.list());
      setStatus(`Guardado explícitamente: src/game/levels/data/${doc.id}.json`);
    });
  }, [model, etag, execute]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (playing || dialog || busy) return;
      const input = (e.target as HTMLElement).closest(
        'input,textarea,select,[contenteditable="true"]',
      );
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        save();
        return;
      }
      if (input) return;
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
        e.preventDefault();
        canvas.current?.cancel(false);
        if (e.shiftKey) model.redo();
        else model.undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        canvas.current?.cancel(false);
        model.remove();
      } else if (e.key === 'Escape') canvas.current?.cancel();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [model, save, playing, dialog, busy]);
  const discard = () =>
    !snapshot.dirty ||
    window.confirm(
      'Hay cambios sin guardar. ¿Descartarlos para abrir otro nivel?',
    );
  const open = () => {
    if (!discard()) return;
    void execute(async () => {
      const opened = await levelApi.open(chosen);
      setModel(new EditorModel(opened.document));
      setEtag(opened.etag);
      setDialog(null);
      setStatus(`Abierto: ${chosen}`);
    });
  };
  const newDocument = () => {
    if (!discard()) return;
    let id = 'new-level',
      n = 2;
    while (listing.some((l) => l.id === id)) id = `new-level-${n++}`;
    setModel(new EditorModel(newLevel(id), false));
    setEtag('*');
    setErrors([]);
    setStatus('Nuevo nivel sin guardar.');
  };
  const copyDialog = (mode: 'save-as' | 'duplicate') => {
    setFileId(`${snapshot.document.id}-copy`);
    setFileName(`${snapshot.document.name} — copia`);
    setDialog(mode);
  };
  const saveAs = () => {
    const doc = {
        ...structuredClone(snapshot.document),
        id: fileId,
        name: fileName,
      },
      issues = validateLevel(doc);
    setErrors(issues);
    if (issues.length) return;
    if (dialog === 'duplicate') {
      setModel(new EditorModel(doc, false));
      setEtag('*');
      setDialog(null);
      setStatus('Copia creada en memoria. Pulsa Guardar para escribirla.');
      return;
    }
    void execute(async () => {
      const result = await levelApi.save(doc, '*');
      setModel(new EditorModel(result.document));
      setEtag(result.etag);
      setListing(await levelApi.list());
      setDialog(null);
      setStatus(`Guardado: ${doc.id}.json`);
    });
  };
  const removeLevel = () => {
    if (
      !window.confirm(
        `¿Eliminar el archivo ${snapshot.document.id}.json? Esta acción no se puede deshacer.`,
      )
    )
      return;
    void execute(async () => {
      await levelApi.delete(snapshot.document.id, etag);
      setListing(await levelApi.list());
      setModel(new EditorModel(newLevel(), false));
      setEtag('*');
      setStatus('Archivo eliminado. Nuevo borrador sin guardar.');
    });
  };
  const play = () => {
    canvas.current?.cancel(false);
    const doc = model.getSnapshot().document,
      issues = validateLevel(doc);
    setErrors(issues);
    if (issues.length) return;
    setPlaying(structuredClone(doc));
  };
  const selected = snapshot.document.objects.find(
    (o) => o.id === snapshot.selection[0],
  );
  if (playing)
    return (
      <Playtest
        document={playing}
        onStop={() => {
          setPlaying(null);
          setStatus('Prueba detenida. Se conserva el borrador y su historial.');
        }}
      />
    );
  return (
    <main className="level-editor">
      <header className="editor-header">
        <strong>VEYLITH · Editor de niveles</strong>
        <span className="editor-dev">Solo desarrollo</span>
        <span>
          {snapshot.document.name}
          {snapshot.dirty ? ' ● Sin guardar' : ''}
        </span>
      </header>
      <nav className="editor-toolbar" aria-label="Herramientas del editor">
        <button
          disabled={busy}
          onClick={() => {
            setChosen(snapshot.document.id);
            setDialog('open');
            void levelApi
              .list()
              .then(setListing)
              .catch((e) => setErrors([e.message]));
          }}
        >
          Abrir
        </button>
        <button disabled={busy} onClick={newDocument}>
          Nuevo
        </button>
        <button disabled={busy} onClick={save}>
          Guardar
        </button>
        <button disabled={busy} onClick={() => copyDialog('save-as')}>
          Guardar como
        </button>
        <button disabled={busy} onClick={() => copyDialog('duplicate')}>
          Duplicar nivel
        </button>
        <button
          disabled={
            busy ||
            etag === '*' ||
            listing.some((l) => l.id === snapshot.document.id && l.protected)
          }
          onClick={removeLevel}
        >
          Eliminar nivel
        </button>
        <span className="toolbar-divider" />
        <button
          disabled={!snapshot.canUndo || busy}
          onClick={() => {
            canvas.current?.cancel(false);
            model.undo();
          }}
        >
          Deshacer
        </button>
        <button
          disabled={!snapshot.canRedo || busy}
          onClick={() => {
            canvas.current?.cancel(false);
            model.redo();
          }}
        >
          Rehacer
        </button>
        <button
          disabled={!snapshot.selection.length || busy}
          onClick={() => model.duplicate()}
        >
          Duplicar objeto
        </button>
        <button
          disabled={!snapshot.selection.length || busy}
          onClick={() => model.remove()}
        >
          Eliminar objeto
        </button>
        <button className="editor-play" disabled={busy} onClick={play}>
          ▶ Probar
        </button>
      </nav>
      <div className="editor-workspace" inert={busy}>
        <aside className="asset-library">
          <h2>Biblioteca</h2>
          <small>Arrastra al lienzo o pulsa para colocar en el centro.</small>
          <AssetLibrary place={(id) => canvas.current?.place(id)} />
          <h2>Objetos ({snapshot.document.objects.length})</h2>
          <button onClick={() => model.select([])}>
            Propiedades del nivel
          </button>
          <div className="object-tree">
            {snapshot.document.objects.map((o, index) => (
              <button
                key={`${o.id}-${index}`}
                className={snapshot.selection.includes(o.id) ? 'selected' : ''}
                onClick={(e) =>
                  model.select(
                    e.shiftKey ? [...snapshot.selection, o.id] : [o.id],
                  )
                }
              >
                {o.id}{' '}
                <small>
                  {o.type}
                  {o.visible ? '' : ' · oculto'}
                </small>
              </button>
            ))}
          </div>
        </aside>
        <section className="editor-center">
          <div className="canvas-tools">
            <button
              title="Alejar cámara"
              onClick={() => canvas.current?.zoom(0.8)}
            >
              −
            </button>
            <label>
              Zoom
              <input
                className="canvas-zoom"
                aria-label="Zoom del lienzo (%)"
                key={zoom}
                type="number"
                min={EDITOR_ZOOM.min * 100}
                max={EDITOR_ZOOM.max * 100}
                step="any"
                defaultValue={Number((zoom * 100).toFixed(1))}
                onBlur={(event) => {
                  const value = event.currentTarget.valueAsNumber;
                  const next = Number.isFinite(value)
                    ? clampEditorZoom(value / 100)
                    : zoom;
                  event.currentTarget.value = String(
                    Number((next * 100).toFixed(1)),
                  );
                  canvas.current?.setZoom(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
              %
            </label>
            <button
              title="Acercar cámara"
              onClick={() => canvas.current?.zoom(1.25)}
            >
              +
            </button>
            <button
              title="Ver el nivel completo"
              onClick={() => canvas.current?.fit()}
            >
              Encuadrar
            </button>
            <button
              title="Usar este zoom al jugar y en Probar (25 %–150 %); pulsa Guardar para conservarlo"
              disabled={
                zoom < GAME_CAMERA_ZOOM.min || zoom > GAME_CAMERA_ZOOM.max
              }
              onClick={() =>
                model.commit((d) => {
                  d.cameraZoom = zoom;
                })
              }
            >
              Aplicar zoom al juego
            </button>
            <span title="Zoom guardado en el borrador del nivel">
              Juego:{' '}
              {Number(((snapshot.document.cameraZoom ?? 1) * 100).toFixed(1))} %
            </span>
            <label>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Rejilla
            </label>
            <label>
              <input
                type="checkbox"
                checked={snap}
                onChange={(e) => setSnap(e.target.checked)}
              />
              Snap
            </label>
            <select
              aria-label="Tamaño de rejilla"
              value={grid}
              onChange={(e) => setGrid(Number(e.target.value))}
            >
              {[8, 16, 32, 64, 128].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={colliderMode && !effectMode}
                onChange={(e) => {
                  setColliderMode(e.target.checked);
                  setEffectMode(false);
                }}
              />
              Editar collider
            </label>
            <label>
              <input
                type="checkbox"
                checked={effectMode}
                onChange={(e) => {
                  setEffectMode(e.target.checked);
                  setColliderMode(e.target.checked);
                }}
              />
              Editar efecto
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={drawCollider}
              onChange={(e) => {
                canvas.current?.cancel(false);
                setDrawCollider(e.target.checked);
              }}
            />
            Dibujar collider
          </label>
          <EditorCanvas
            ref={canvas}
            model={model}
            grid={grid}
            snap={snap}
            showGrid={showGrid}
            colliderMode={colliderMode}
            effectMode={effectMode}
            drawCollider={drawCollider}
            onZoom={setZoom}
          />
          <small className="canvas-help">
            Rueda: zoom · Espacio + arrastrar / botón central: pan · Shift +
            clic: multiselección · Azul: dibujo · Verde: collider · Violeta:
            efecto
          </small>
        </section>
        <aside className="editor-inspector">
          <Inspector
            model={model}
            document={snapshot.document}
            object={selected}
          />
        </aside>
      </div>
      <footer className="editor-status">
        <span role="status">{busy ? 'Procesando…' : status}</span>
        <small>
          Guardar valida la estructura; no garantiza que el puzzle tenga
          solución.
        </small>
        {errors.length > 0 && (
          <div role="alert">
            <strong>No se puede continuar:</strong>
            <ul>
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </footer>
      {dialog && (
        <div className="editor-modal">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={dialog === 'open' ? 'Abrir nivel' : 'Guardar una copia'}
          >
            <h2>
              {dialog === 'open'
                ? 'Abrir nivel'
                : dialog === 'duplicate'
                  ? 'Duplicar sin guardar'
                  : 'Guardar como'}
            </h2>
            {dialog === 'open' ? (
              <label>
                Nivel
                <select
                  value={chosen}
                  onChange={(e) => setChosen(e.target.value)}
                >
                  {listing.map((l) => (
                    <option disabled={!!l.error} key={l.id} value={l.id}>
                      {l.name} · {l.id}
                      {l.error ? ' (no válido)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label>
                  ID del archivo
                  <input
                    aria-label="ID del archivo"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                  />
                </label>
                <label>
                  Nombre del nivel
                  <input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </label>
              </>
            )}
            <div>
              <button disabled={busy} onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={dialog === 'open' ? open : saveAs}
              >
                {dialog === 'open'
                  ? 'Abrir seleccionado'
                  : dialog === 'duplicate'
                    ? 'Crear copia sin guardar'
                    : 'Guardar copia'}
              </button>
            </div>
            {errors.length > 0 && <p role="alert">{errors.join('\n')}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
