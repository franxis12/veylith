import { useTranslation } from '../../services/i18n/useTranslation';
import { useAppStore } from '../../stores/appStore';
import { gameAudio } from '../../services/audio/gameAudio';
import './audio.css';

export function AudioSettings() {
  const { t } = useTranslation();
  const enabled = useAppStore((s) => s.audioEnabled);
  const volume = useAppStore((s) => s.audioVolume);
  return (
    <details className="audio-settings">
      <summary aria-label={t('Sonido')}>
        {enabled && volume > 0 ? '♫' : '♪'} <span>{t('Sonido')}</span>
      </summary>
      <div className="audio-settings-panel">
        <button
          type="button"
          aria-pressed={!enabled}
          onClick={() => {
            useAppStore.getState().setAudioEnabled(!enabled);
            gameAudio.unlock();
          }}
        >
          {enabled ? t('Silenciar') : t('Activar sonido')}
        </button>
        <label>
          {t('Volumen')}{' '}
          <input
            aria-label={t('Volumen del juego')}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              useAppStore.getState().setAudioVolume(Number(e.target.value));
              gameAudio.unlock();
            }}
          />
        </label>
      </div>
    </details>
  );
}
