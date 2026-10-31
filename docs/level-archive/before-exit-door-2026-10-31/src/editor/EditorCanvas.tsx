import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Phaser from 'phaser';
import { EditorScene } from './EditorScene';
import type { EditorModel } from './model';
export interface EditorCanvasHandle {
  zoom: (factor: number) => void;
  setZoom: (zoom: number) => void;
  fit: () => void;
  cancel: (clearSelection?: boolean) => void;
  place: (id: string) => void;
}
export const EditorCanvas = forwardRef<
  EditorCanvasHandle,
  {
    model: EditorModel;
    grid: number;
    snap: boolean;
    showGrid: boolean;
    colliderMode: boolean;
    effectMode: boolean;
    drawCollider: boolean;
    onZoom: (zoom: number) => void;
  }
>(function EditorCanvas(
  {
    model,
    grid,
    snap,
    showGrid,
    colliderMode,
    effectMode,
    drawCollider,
    onZoom,
  },
  ref,
) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<EditorScene | null>(null),
    zoomCallback = useRef(onZoom);
  useEffect(() => {
    zoomCallback.current = onZoom;
  }, [onZoom]);
  useImperativeHandle(
    ref,
    () => ({
      zoom: (f) => {
        if (scene.current?.sys.isActive()) scene.current.zoom(f);
      },
      setZoom: (zoom) => {
        if (scene.current?.sys.isActive()) scene.current.setZoom(zoom);
      },
      fit: () => {
        if (scene.current?.sys.isActive()) scene.current.fit();
      },
      cancel: (clearSelection) => scene.current?.cancel(clearSelection),
      place: (id) => {
        if (scene.current?.sys.isActive()) scene.current.place(id);
      },
    }),
    [],
  );
  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    let cancelled = false,
      game: Phaser.Game | undefined,
      editor: EditorScene | undefined,
      observer: ResizeObserver | undefined;
    const key = (event: KeyboardEvent) => {
      if (
        event.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (event.target as HTMLElement)?.tagName,
        )
      ) {
        event.preventDefault();
        if (scene.current) scene.current.space = event.type === 'keydown';
      }
    };
    const blur = () => {
      if (scene.current) {
        scene.current.space = false;
        scene.current.cancel();
      }
    };
    void Promise.resolve().then(() => {
      if (cancelled) return;
      editor = new EditorScene(model, (z) => zoomCallback.current(z));
      scene.current = editor;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        banner: false,
        backgroundColor: '#0b2432',
        scale: {
          mode: Phaser.Scale.RESIZE,
          width: parent.clientWidth,
          height: parent.clientHeight,
        },
        input: { keyboard: false },
        scene: [editor],
      });
      observer = new ResizeObserver(() =>
        game?.scale.resize(parent.clientWidth, parent.clientHeight),
      );
      observer.observe(parent);
      window.addEventListener('keydown', key);
      window.addEventListener('keyup', key);
      window.addEventListener('blur', blur);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', blur);
      editor?.dispose();
      scene.current = null;
      game?.canvas?.remove();
      game?.destroy(true);
      if (game?.isRunning) game.loop.wake();
    };
  }, [model]);
  useEffect(() => {
    const apply = () => {
      if (!scene.current?.sys.isActive()) return false;
      scene.current.setOptions({
        grid,
        snap,
        showGrid,
        colliderMode,
        effectMode,
        drawCollider,
      });
      return true;
    };
    // Apply mode switches before the next pointer gesture; poll only while booting.
    if (apply()) return;
    const timer = window.setInterval(() => {
      if (apply()) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [grid, snap, showGrid, colliderMode, effectMode, drawCollider, model]);
  return (
    <div
      ref={host}
      className="editor-canvas"
      aria-label="Lienzo del nivel"
      tabIndex={0}
      onPointerDown={(e) => e.currentTarget.focus({ preventScroll: true })}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-veylith-asset'))
          e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('application/x-veylith-asset'),
          rect = e.currentTarget.getBoundingClientRect();
        if (scene.current?.sys.isActive())
          scene.current.place(id, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
      }}
    />
  );
});
