import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './level-map.css';
import { OptionsButton } from './OptionsMenu';
import { useTranslation } from '../../services/i18n/useTranslation';
import { formatTime } from './formatTime';
import { CAMPAIGN, campaignLevel } from '../../game/levels/catalog';
import type { CampaignLevelId } from '../../game/levels/catalog';
import { isUnlocked } from '../../services/progress/progress';
import type { SavedProgress } from '../../services/progress/progress';
import { Art, ArtButton, Coins, Stars } from './Art';
import { UI } from './assets';

export function MainMenu({
  progress,
  onPlay,
  onLevels,
  onOptions,
}: {
  progress: SavedProgress;
  onPlay: (id: CampaignLevelId) => void;
  onLevels: () => void;
  onOptions: () => void;
}) {
  const { t, content } = useTranslation();
  const continuing = Object.keys(progress.levels).length > 0;
  return (
    <section className="menu-screen main-menu" aria-label={t('Menú principal')}>
      <Art src={UI.menu} className="screen-background" />
      <div className="menu-wallet">
        <OptionsButton onClick={onOptions} />
        <Coins amount={progress.coins} />
      </div>
      <div className="menu-content">
        <h1>
          <Art src={UI.logo} alt="Veylith" fallback="Veylith" />
        </h1>
        <p className="menu-subtitle">{t('Cuatro elementos. Un camino.')}</p>
        <div className="menu-actions">
          <ArtButton onClick={() => onPlay(progress.lastLevel)}>
            {continuing ? t('Continuar') : t('Jugar')}
          </ArtButton>
          <ArtButton kind="secondary" onClick={onLevels}>
            {t('Selección de niveles')}
          </ArtButton>
        </div>
        <p className="menu-caption">
          {content(campaignLevel(progress.lastLevel).title)}
        </p>
        <Art src={UI.crystals} className="menu-crystals" />
      </div>
    </section>
  );
}

// Ground anchors in the original 2048 × 1152 map. The artwork and markers share
// one proportional scene, so resizing/panning never moves a marker off its clearing.
const LEVEL_MAP_POINTS: Partial<
  Record<CampaignLevelId, readonly [number, number]>
> = {
  'forest-1': [19, 44],
  'forest-2': [30, 53],
  'forest-6': [40, 62],
  'forest-7': [53, 61],
  'forest-8': [67, 62],
  'forest-9': [80, 57],
  'forest-10': [76, 41],
  'forest-3': [61, 32],
  'forest-4': [48, 32],
  'forest-5': [31, 31],
};

export function LevelSelect({
  progress,
  onPlay,
  onBack,
  onOptions,
}: {
  progress: SavedProgress;
  onPlay: (id: CampaignLevelId) => void;
  onBack: () => void;
  onOptions: () => void;
}) {
  const { t, content } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const view = viewport.current;
    const scene = view?.firstElementChild as HTMLElement | null;
    if (!view || !scene) return;
    const center = () => {
      const portrait = view.clientHeight > view.clientWidth;
      view.scrollLeft = portrait
        ? (scene.clientWidth *
            (LEVEL_MAP_POINTS[progress.lastLevel]?.[0] ?? 19)) /
            100 -
          view.clientWidth / 2
        : (scene.clientWidth - view.clientWidth) / 2;
      view.scrollTop = (scene.clientHeight - view.clientHeight) / 2;
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(view);
    return () => observer.disconnect();
  }, [progress.lastLevel]);
  return (
    <section
      className="menu-screen level-select"
      aria-label={t('Selección de niveles')}
    >
      <div className="level-map-viewport" ref={viewport}>
        <div className="level-map-scene">
          <Art src={UI.map} className="level-map-art" />
          <div className="level-list">
            {CAMPAIGN.filter((level) => LEVEL_MAP_POINTS[level.id]).map(
              (level, index) => {
                const unlocked = isUnlocked(progress, level.id);
                const record = progress.levels[level.id];
                const detail = !unlocked
                  ? t('Completa el nivel anterior')
                  : record
                    ? t('Mejor: {time}', {
                        time: formatTime(record.bestTimeMs),
                      })
                    : t('Capítulo I · Tierra');
                const targets = `★★★ ≤ ${formatTime(level.threeStarsMs)} · ★★ ≤ ${formatTime(level.twoStarsMs)}`;
                const [x, y] = LEVEL_MAP_POINTS[level.id]!;
                return (
                  <button
                    key={level.id}
                    className="level-card"
                    data-level-id={level.id}
                    style={
                      {
                        '--map-x': `${x}%`,
                        '--map-y': `${y}%`,
                      } as CSSProperties
                    }
                    disabled={!unlocked}
                    onClick={() => onPlay(level.id)}
                    onFocus={(event) => {
                      // A pointer press must not move its target before release.
                      if (event.currentTarget.matches(':focus-visible'))
                        event.currentTarget.scrollIntoView({
                          block: 'center',
                          inline: 'center',
                        });
                    }}
                    aria-current={
                      progress.lastLevel === level.id ? 'step' : undefined
                    }
                    aria-label={`${index + 1}. ${content(level.title)}${unlocked ? '' : `, ${t('bloqueado')}`}`}
                    aria-describedby={`level-info-${level.id}`}
                    title={`${content(level.title)} · ${detail} · ${targets}`}
                  >
                    <span className="level-node">
                      <Art
                        src={
                          unlocked
                            ? record
                              ? UI.completed
                              : progress.lastLevel === level.id
                                ? UI.current
                                : UI.levelEmpty
                            : UI.locked
                        }
                      />
                      <strong>{index + 1}</strong>
                    </span>
                    <strong className="level-title">
                      {content(level.title)}
                    </strong>
                    <Stars count={record?.stars ?? 0} map />
                    <span
                      className="level-info"
                      id={`level-info-${level.id}`}
                      role="tooltip"
                    >
                      <span className="level-detail">{detail}</span>
                      <span className="level-targets">{targets}</span>
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>
      <header className="screen-header">
        <ArtButton kind="main_menu" onClick={onBack}>
          {t('Menú')}
        </ArtButton>
        <h1>Ancient Forest</h1>
        <OptionsButton onClick={onOptions} />
        <Coins amount={progress.coins} />
      </header>
      <p className="level-map-help">{t('Desliza para explorar el mapa')}</p>
    </section>
  );
}
