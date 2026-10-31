import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI_ANIMATIONS } from './assets';
import './victory-animation.css';

/** Decorative UI playback only. Completion/rewards never depend on animation events. */
export function SpriteAnimation({
  clip,
  delayMs = 0,
  className = '',
  fallback = null,
  initial,
}: {
  clip: keyof typeof UI_ANIMATIONS;
  delayMs?: number;
  className?: string;
  fallback?: ReactNode;
  initial?: ReactNode;
}) {
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'settled' | 'failed'
  >('loading');
  const animation = UI_ANIMATIONS[clip];
  const style = {
    '--sprite-frames': animation.frames,
    '--sprite-steps': animation.frames,
    '--sprite-end': '-100%',
    '--sprite-duration': `${animation.durationMs}ms`,
    '--sprite-delay': `${delayMs}ms`,
  } as CSSProperties;
  return (
    <span
      className={`sprite-animation sprite-${status} ${className}`}
      style={style}
      aria-hidden="true"
      data-clip={clip}
    >
      <span className="sprite-fallback">
        {status === 'loading' ? (initial ?? fallback) : fallback}
      </span>
      {(status === 'loading' || status === 'ready') && (
        <img
          className="sprite-strip"
          src={`${import.meta.env.BASE_URL}${animation.path}`}
          alt=""
          draggable={false}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('failed')}
          onAnimationEnd={() => setStatus('settled')}
        />
      )}
    </span>
  );
}
