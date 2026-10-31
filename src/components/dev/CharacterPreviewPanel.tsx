import { useSyncExternalStore } from 'react';
import { ELEMENT_CONFIG } from '../../game/config/elements';
import {
  availableAnimations,
  getCharacterAnimation,
} from '../../game/systems/animation/animationRegistry';
import {
  ELEMENTS,
  isAnimationAction,
  isElement,
} from '../../game/types/character';
import type { PreviewBridge } from '../../game/dev/previewBridge';
import './character-preview.css';

export default function CharacterPreviewPanel({
  bridge,
}: {
  bridge: PreviewBridge;
}) {
  const state = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getSnapshot,
  );
  if (!state)
    return (
      <aside className="character-preview">Loading character sheets…</aside>
    );
  const clip = getCharacterAnimation(state.element, state.animation);

  return (
    <aside
      className="character-preview"
      aria-label="Character animation preview"
    >
      <div className="preview-heading">
        <strong>Character lab</strong>
        <span>DEV ONLY</span>
      </div>
      <div className="preview-fields">
        <label>
          Element
          <select
            aria-label="Element"
            value={state.element}
            onChange={(event) => {
              const element = event.target.value;
              if (isElement(element))
                bridge.send({
                  type: 'input',
                  action: { type: 'switch_element', phase: 'pressed', element },
                });
            }}
          >
            {ELEMENTS.map((element) => (
              <option key={element} value={element}>
                {ELEMENT_CONFIG[element].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Animation
          <select
            aria-label="Animation"
            value={state.animation}
            onChange={(event) => {
              const action = event.target.value;
              if (isAnimationAction(action))
                bridge.send({ type: 'animation', action });
            }}
          >
            {availableAnimations(state.element).map((action) => (
              <option key={action} value={action}>
                {action.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Playback
          <select
            aria-label="Playback"
            value={state.mode}
            onChange={(event) => {
              const mode = event.target.value;
              if (mode === 'default' || mode === 'loop' || mode === 'once')
                bridge.send({ type: 'mode', mode });
            }}
          >
            <option value="default">Default</option>
            <option value="loop">Loop</option>
            <option value="once">Once</option>
          </select>
        </label>
        <label>
          After one-shot
          <select
            aria-label="After one-shot"
            value={state.afterOnce}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'hold' || value === 'idle')
                bridge.send({ type: 'after_once', value });
            }}
          >
            <option value="hold">Hold last frame</option>
            <option value="idle">Return to idle</option>
          </select>
        </label>
      </div>
      <div className="preview-buttons">
        <button type="button" onClick={() => bridge.send({ type: 'replay' })}>
          Replay
        </button>
        <button
          type="button"
          disabled={state.completed}
          onClick={() =>
            bridge.send({ type: 'pause_animation', paused: !state.paused })
          }
        >
          {state.paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          aria-pressed={state.facing === 'left'}
          onClick={() =>
            bridge.send({
              type: 'facing',
              facing: state.facing === 'right' ? 'left' : 'right',
            })
          }
        >
          Facing {state.facing}
        </button>
      </div>
      <p>
        {clip?.frameCount} frames · {clip?.fps} fps ·{' '}
        {state.completed ? 'Finished' : state.paused ? 'Paused' : 'Playing'}
      </p>
      <p className="preview-hint">
        1 Water · 2 Fire · 3 Air · 4 Earth
        <br />
        Click the canvas before using shortcuts.
      </p>
      {state.error && <p role="alert">{state.error}</p>}
    </aside>
  );
}
