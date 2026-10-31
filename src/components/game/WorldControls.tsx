import { useSyncExternalStore } from 'react';
import { GameplayControls } from './GameplayControls';
import { ReflectorControls } from './ReflectorControls';
import type { ActionState } from '../../game/systems/input/ActionState';
import type { LevelProgress } from '../../game/levels/LevelProgress';
import { useTranslation } from '../../services/i18n/useTranslation';

export function WorldControls({
  actions,
  progress,
}: {
  actions: ActionState;
  progress: LevelProgress;
}) {
  const world = useSyncExternalStore(progress.subscribe, progress.getSnapshot);
  const reflector = world && 'reflector' in world ? world.reflector : null;
  const { t } = useTranslation();
  return (
    <>
      <GameplayControls
        actions={actions}
        forceButtons={!!reflector}
        reflectorActive={!!reflector?.active}
      />
      {reflector?.active && (
        <ReflectorControls actions={actions} reflector={reflector} />
      )}
      {reflector && !reflector.active && (
        <p className="reflector-prompt">
          {t('Mantén Acción / E para girar el reflector')}
        </p>
      )}
    </>
  );
}
