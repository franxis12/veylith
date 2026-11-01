import { GameCenterSettings } from './GameCenterSettings';
import { ReleaseLinks } from './ReleaseLinks';
import { Art, ArtButton } from './Art';
import { UI } from './assets';
import { useEffect, useRef, useState } from 'react';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useAppStore } from '../../stores/appStore';
import { gameAudio } from '../../services/audio/gameAudio';
import { useTranslation } from '../../services/i18n/useTranslation';
import './options.css';

export function OptionsButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ArtButton
      kind="secondary"
      className="options-button"
      onClick={onClick}
      aria-label={t('Opciones')}
    >
      <Art src={UI.settingsIcon} className="ui-icon" /> {t('Opciones')}
    </ArtButton>
  );
}
export function OptionsMenu({ onClose }: { onClose: () => void }) {
  const { locale, t } = useTranslation();
  const mode = usePreferencesStore((s) => s.touchMode);
  const enabled = useAppStore((s) => s.audioEnabled);
  const volume = useAppStore((s) => s.audioVolume);
  const ref = useRef<HTMLDivElement>(null);
  const [previous] = useState(() => document.activeElement);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.focus();
    return () => {
      queueMicrotask(() => {
        // Wait until inert is removed; ignore StrictMode’s effect replay.
        if (dialog?.isConnected) return;
        if (previous instanceof HTMLElement && previous.isConnected)
          previous.focus();
        else document.querySelector<HTMLElement>('.options-button')?.focus();
      });
    };
  }, [previous]);
  return (
    <div className="options-backdrop">
      <div
        className="options-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab') return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
            ),
          ];
          const first = controls[0],
            last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === ref.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <Art src={UI.settingsPanel} className="panel-art" />
        <header>
          <h2 id="options-title">{t('Opciones')}</h2>
          <ArtButton
            kind="close"
            className="options-close round-button"
            aria-label={t('Cerrar opciones')}
            onClick={onClose}
          >
            <span className="icon-fallback">×</span>
          </ArtButton>
        </header>
        <div className="options-grid">
          <section aria-labelledby="language-title">
            <h3 id="language-title">{t('Idioma')}</h3>
            <select
              aria-label={t('Idioma')}
              value={locale}
              onChange={(event) =>
                usePreferencesStore
                  .getState()
                  .setLocale(event.target.value === 'es' ? 'es' : 'en')
              }
            >
              <option value="en" lang="en">
                English
              </option>
              <option value="es" lang="es">
                Español
              </option>
            </select>
          </section>
          <section aria-labelledby="sound-title">
            <h3 id="sound-title">
              <Art src={UI.audioIcon} className="ui-icon" />
              {t('Sonido')}
            </h3>
            <button
              type="button"
              className="sound-toggle"
              aria-pressed={!enabled}
              onClick={() => {
                useAppStore.getState().setAudioEnabled(!enabled);
                gameAudio.unlock();
              }}
            >
              {enabled ? t('Silenciar') : t('Activar sonido')}
            </button>
            <label className="volume-label">
              {t('Volumen')} <output>{Math.round(volume * 100)}%</output>
              <input
                aria-label={t('Volumen del juego')}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => {
                  useAppStore
                    .getState()
                    .setAudioVolume(Number(event.target.value));
                  gameAudio.unlock();
                }}
              />
            </label>
          </section>
          <section
            className="controls-options"
            aria-labelledby="controls-title"
          >
            <h3 id="controls-title">{t('Controles')}</h3>
            <label>
              {t('Controles móviles')}
              <select
                value={mode}
                onChange={(event) =>
                  usePreferencesStore
                    .getState()
                    .setTouchMode(
                      event.target.value === 'buttons' ? 'buttons' : 'gestures',
                    )
                }
              >
                <option value="gestures">{t('Gestos')}</option>
                <option value="buttons">{t('Botones')}</option>
              </select>
            </label>
            {mode === 'gestures' ? (
              <div className="gesture-guide">
                <div>
                  <strong>{t('Lado izquierdo')}</strong>
                  <p>
                    {t(
                      'Desliza a izquierda o derecha y mantén el dedo para moverte. Suelta para detenerte.',
                    )}
                  </p>
                </div>
                <div>
                  <strong>{t('Lado derecho')}</strong>
                  <p>
                    {t(
                      'Desliza hacia arriba para saltar. Un toque usa el poder.',
                    )}
                  </p>
                </div>
                <p className="glide-guide">
                  {t(
                    'Mantén el dedo tras saltar para planear con Aire. Vuelve a deslizar para el doble salto de Fuego.',
                  )}
                </p>
              </div>
            ) : (
              <p>
                {t(
                  'Usa las flechas para moverte y los botones de salto y poder. Puedes pulsarlos a la vez.',
                )}
              </p>
            )}
            <h4>{t('Teclado')}</h4>
            <ul className="keyboard-guide">
              <li>{t('Mover: A/D o ←/→')}</li>
              <li>{t('Saltar: Espacio, W o ↑')}</li>
              <li>{t('Poder: E o Shift')}</li>
              <li>{t('Pausa: Esc · Reiniciar: R')}</li>
            </ul>
          </section>
          <GameCenterSettings />
          <ReleaseLinks />
        </div>
      </div>
    </div>
  );
}
