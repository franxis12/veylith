import { useTranslation } from '../../services/i18n/useTranslation';
import { useState } from 'react';
import { SpriteAnimation } from './SpriteAnimation';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON_ART, UI } from './assets';

export function Art({
  src,
  alt = '',
  className = '',
  fallback = null,
}: {
  src: string;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    fallback
  ) : (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}${src}`}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function ButtonSkin({ kind }: { kind: keyof typeof BUTTON_ART }) {
  const [normal, pressed, disabled] = BUTTON_ART[kind];
  return (
    <>
      <Art src={normal} className="button-skin skin-normal" />
      <Art src={pressed} className="button-skin skin-pressed" />
      <Art src={disabled} className="button-skin skin-disabled" />
    </>
  );
}

export function ArtButton({
  kind = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: keyof typeof BUTTON_ART;
}) {
  return (
    <button type="button" className={`art-button ${className}`} {...props}>
      <ButtonSkin kind={kind} />
      <span className="button-label">{children}</span>
    </button>
  );
}

export function Stars({
  count,
  animated = false,
  map = false,
}: {
  count: number;
  animated?: boolean;
  map?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="stars" aria-label={t('{count} de 3 estrellas', { count })}>
      {[1, 2, 3].map((value) => {
        const filled = value <= count;
        const still = (
          <Art
            src={
              map
                ? filled
                  ? UI.mapStar
                  : UI.mapEmptyStar
                : filled
                  ? UI.star
                  : UI.emptyStar
            }
            fallback={<span aria-hidden="true">{filled ? '★' : '☆'}</span>}
          />
        );
        return (
          <span className="star-slot" key={value}>
            {filled && animated ? (
              <SpriteAnimation
                clip="starUnlock"
                delayMs={180 + (value - 1) * 320}
                initial={<Art src={UI.emptyStar} />}
                fallback={still}
              />
            ) : (
              still
            )}
          </span>
        );
      })}
    </div>
  );
}

export function Coins({ amount }: { amount: number }) {
  const { t } = useTranslation();
  return (
    <span className="coins">
      <Art src={UI.coin} fallback={<span>●</span>} />
      {amount}
      <span className="sr-only"> {t('monedas')}</span>
    </span>
  );
}
