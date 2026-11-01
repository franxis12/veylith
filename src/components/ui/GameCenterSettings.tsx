import { useSyncExternalStore } from 'react';
import { gameCenter } from '../../services/gameCenter/gameCenter';
import { useTranslation } from '../../services/i18n/useTranslation';

export function GameCenterSettings() {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    gameCenter.subscribe,
    gameCenter.getSnapshot,
  );
  return (
    <section
      className="game-center-settings"
      aria-labelledby="game-center-title"
    >
      <h3 id="game-center-title">{t('Game Center')}</h3>
      <p role="status" aria-live="polite">
        {!state.available
          ? t('Game Center está disponible en la app para iPhone.')
          : state.busy
            ? t('Conectando…')
            : state.authenticated
              ? t('Conectado como {name}', {
                  name: state.displayName ?? 'Game Center',
                })
              : t('Sin conexión a Game Center. Puedes seguir jugando.')}
      </p>
      {state.available && !state.authenticated && (
        <p>
          {t(
            'Si no aparece el inicio de sesión, abre Ajustes de iOS > Game Center y vuelve al juego.',
          )}
        </p>
      )}
      {state.available && (
        <div className="game-center-actions">
          {!state.authenticated && (
            <button
              type="button"
              disabled={state.busy}
              onClick={() => {
                void gameCenter.authenticate();
              }}
            >
              {t('Revisar Game Center')}
            </button>
          )}
          <button
            type="button"
            disabled={!state.authenticated || state.busy}
            onClick={() => {
              void gameCenter.showDashboard('leaderboards');
            }}
          >
            {t('Clasificaciones')}
          </button>
          <button
            type="button"
            disabled={!state.authenticated || state.busy}
            onClick={() => {
              void gameCenter.showDashboard('achievements');
            }}
          >
            {t('Logros')}
          </button>
        </div>
      )}
      <p>
        {t(
          'Los tiempos y logros se envían solo de partidas iniciadas con Game Center conectado. El progreso del juego se guarda únicamente en este dispositivo.',
        )}
      </p>
      {state.notice !== 'none' && (
        <p role="status">
          {state.notice === 'sent'
            ? t('Resultado enviado a Game Center.')
            : state.notice === 'notSent'
              ? t(
                  'El resultado no se pudo enviar. Puedes seguir jugando; vuelve a completar el nivel con conexión para enviar un tiempo.',
                )
              : t(
                  'No se pudo abrir Game Center. Revisa la conexión y tu sesión en Ajustes de iOS.',
                )}
        </p>
      )}
    </section>
  );
}
