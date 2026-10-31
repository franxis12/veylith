import { create } from 'zustand';
import type { CampaignLevelId } from '../game/levels/catalog';
import {
  completeLevel,
  isUnlocked,
  loadProgress,
  saveProgress,
} from '../services/progress/progress';
import type {
  CompletionResult,
  SavedProgress,
  StoragePort,
  StorageStatus,
} from '../services/progress/progress';

interface ProgressState {
  progress: SavedProgress;
  storageStatus: StorageStatus;
  selectLevel: (id: CampaignLevelId) => boolean;
  complete: (
    id: CampaignLevelId,
    elapsedMs: number,
    collectedCoinIds?: readonly string[],
  ) => CompletionResult;
}

export function createProgressStore(storage: StoragePort | undefined) {
  const loaded = loadProgress(storage);
  const readOnly = loaded.status === 'future';
  return create<ProgressState>((set, get) => {
    const persist = (progress: SavedProgress) => {
      const success = !readOnly && saveProgress(storage, progress);
      set({
        progress,
        storageStatus: readOnly ? 'future' : success ? 'ok' : 'unavailable',
      });
    };
    return {
      ...loaded,
      storageStatus: loaded.status,
      selectLevel(id) {
        const { progress } = get();
        if (!isUnlocked(progress, id)) return false;
        persist({ ...progress, lastLevel: id });
        return true;
      },
      complete(id, elapsedMs, collectedCoinIds = []) {
        const completed = completeLevel(
          get().progress,
          id,
          elapsedMs,
          collectedCoinIds,
        );
        persist(completed.progress);
        return completed.result;
      },
    };
  });
}

function browserStorage(): StoragePort | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
export const useProgressStore = createProgressStore(browserStorage());
