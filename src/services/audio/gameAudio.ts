import { AudioEngine } from './AudioEngine';
export const gameAudio = new AudioEngine();
export const uiAudio = gameAudio.createScope('ui');
