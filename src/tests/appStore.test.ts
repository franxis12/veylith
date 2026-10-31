import { beforeEach, expect, it } from 'vitest';
import { useAppStore } from '../stores/appStore';

beforeEach(() => useAppStore.setState(useAppStore.getInitialState()));

it('updates initialization without changing the audio preference or screen', () => {
  useAppStore.getState().setAudioEnabled(false);
  useAppStore.getState().setInitialization('ready');
  expect(useAppStore.getState()).toMatchObject({
    initialization: 'ready',
    audioEnabled: false,
    currentScreen: 'menu',
  });
});
