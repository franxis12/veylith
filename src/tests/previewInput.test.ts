import { expect, it, vi } from 'vitest';
import { elementPreviewKeyboard } from '../game/dev/elementPreviewKeyboard';
import { PreviewBridge } from '../game/dev/previewBridge';

it('maps only development element keys to device-independent actions and detaches cleanly', () => {
  const sink = vi.fn();
  const disconnect = elementPreviewKeyboard(window).connect(sink);
  for (const [index, element] of ['water', 'fire', 'air', 'earth'].entries()) {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: `Digit${index + 1}` }),
    );
    expect(sink).toHaveBeenLastCalledWith({
      type: 'switch_element',
      phase: 'pressed',
      element,
    });
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Digit2', repeat: true }),
  );
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Digit2', metaKey: true }),
  );
  expect(sink).toHaveBeenCalledTimes(4);
  disconnect();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
  expect(sink).toHaveBeenCalledTimes(4);
});

it('leaves focused form controls and editable text alone', () => {
  const sink = vi.fn();
  const disconnect = elementPreviewKeyboard(window).connect(sink);
  const select = document.createElement('select');
  document.body.append(select);
  select.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true }),
  );
  expect(sink).not.toHaveBeenCalled();
  select.remove();
  disconnect();
});

it('keeps preview sessions isolated and stops commands and subscriptions after disposal', () => {
  const first = new PreviewBridge();
  const second = new PreviewBridge();
  const handler = vi.fn();
  const other = vi.fn();
  first.connect(handler);
  second.connect(other);
  first.send({ type: 'replay' });
  expect(handler).toHaveBeenCalledTimes(1);
  expect(other).not.toHaveBeenCalled();
  first.dispose();
  first.send({ type: 'replay' });
  expect(handler).toHaveBeenCalledTimes(1);
  expect(first.getSnapshot()).toBeNull();
});
