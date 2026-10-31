import { lazy, Suspense, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioRuntime } from './components/ui/AudioRuntime';
import { App } from './app/App';
import { GAME_SETTINGS } from './game/config/settings';
import './styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('ELEMENTS requires a root element.');
}

document.documentElement.style.setProperty(
  '--game-background',
  GAME_SETTINGS.backgroundColor,
);

const Editor = import.meta.env.DEV
  ? lazy(() => import('./editor/EditorApp'))
  : null;
const editorRoute =
  import.meta.env.DEV &&
  window.location.pathname.replace(/\/$/, '') === '/editor';

createRoot(root).render(
  <StrictMode>
    <AudioRuntime />
    {editorRoute && Editor ? (
      <Suspense fallback={<p>Cargando editor…</p>}>
        <Editor />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
