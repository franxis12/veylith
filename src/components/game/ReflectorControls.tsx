import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { ActionState } from '../../game/systems/input/ActionState';
import type { ReflectorSnapshot } from '../../game/systems/world/ReflectorInteraction';
import { normalizeAngle } from '../../game/systems/world/reflectorAngles';
import { useTranslation } from '../../services/i18n/useTranslation';
import './reflector-controls.css';

/** Pointer and keyboard adapters only. The scene owns the mirror and the light ray. */
export function ReflectorControls({
  actions,
  reflector,
}: {
  actions: ActionState;
  reflector: ReflectorSnapshot;
}) {
  const { t } = useTranslation();
  const dial = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const node = dial.current;
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      actions.dispatch(
        { type: 'close_reflector', phase: 'pressed' },
        'reflector-ui',
      );
    };
    const clear = () => {
      pointer.current = null;
    };
    window.addEventListener('keydown', escape, true);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', clear);
      // The scene owns hold/release and pause cleanup. Do not enqueue a stale close on unmount.
      queueMicrotask(() => {
        if (node?.isConnected) return;
        if (previous instanceof HTMLElement && previous.isConnected)
          previous.focus({ preventScroll: true });
      });
    };
  }, [actions]);
  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2,
      y = e.clientY - r.top - r.height / 2;
    if (Math.hypot(x, y) < 12) return;
    let angle = normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
    const snap = Math.round(angle / 45) * 45;
    if (Math.abs(angle - snap) < 3) angle = normalizeAngle(snap);
    actions.dispatch(
      { type: 'aim_reflector', phase: 'pressed', angle },
      'reflector-ui',
    );
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const degrees = ['ArrowLeft', 'ArrowDown'].includes(e.code)
      ? -1
      : ['ArrowRight', 'ArrowUp'].includes(e.code)
        ? 1
        : 0;
    if (degrees) {
      e.preventDefault();
      e.stopPropagation();
      actions.dispatch(
        { type: 'turn_reflector', phase: 'pressed', degrees },
        'reflector-ui',
      );
    } else if (e.code === 'Home' || e.code === 'End') {
      e.preventDefault();
      e.stopPropagation();
      actions.dispatch(
        {
          type: 'aim_reflector',
          phase: 'pressed',
          angle: e.code === 'Home' ? 0 : 359,
        },
        'reflector-ui',
      );
    }
  };
  return (
    <section
      className="reflector-controls"
      aria-label={t('Orientar reflector')}
    >
      <header>
        <strong>{t('Orientar reflector')}</strong>
        <small>{t('Mantén Acción')}</small>
      </header>
      <div className="reflector-control-body">
        <div
          ref={dial}
          className="reflector-dial"
          role="slider"
          tabIndex={0}
          aria-label={t('Giro del reflector')}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={reflector.angle}
          aria-valuetext={`${reflector.angle}°`}
          aria-describedby="reflector-help"
          style={{ '--mirror-angle': `${reflector.angle}deg` } as CSSProperties}
          onKeyDown={key}
          onPointerDown={(e) => {
            if (e.button !== 0 || pointer.current !== null) return;
            e.preventDefault();
            pointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.focus({ preventScroll: true });
            aim(e);
          }}
          onPointerMove={(e) => {
            if (pointer.current === e.pointerId) aim(e);
          }}
          onPointerUp={(e) => {
            if (pointer.current === e.pointerId) {
              aim(e);
              pointer.current = null;
            }
          }}
          onPointerCancel={() => {
            pointer.current = null;
          }}
          onLostPointerCapture={() => {
            pointer.current = null;
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="reflector-axis" aria-hidden="true" />
          <span className="reflector-needle" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className="reflector-help">
          <output>{Math.round(reflector.angle)}°</output>
          <p id="reflector-help">
            {t(
              'Mantén Acción / E y arrastra. Flechas: ajuste fino. A/D: girar. Suelta para salir.',
            )}
          </p>
          <small>{t('La flecha indica la cara que refleja la luz.')}</small>
        </div>
      </div>
    </section>
  );
}
