import { useState } from 'react';
import { useTranslation } from '../../services/i18n/useTranslation';

/** Presentation only: clues never set game signals or affect rewards. */
export function PuzzleHints({
  brief,
  hints,
}: {
  brief: string;
  hints: readonly string[];
}) {
  const { t, content } = useTranslation();
  const [revealed, setRevealed] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <div className="puzzle-hints">
      <span>{content(brief)}</span>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!revealed) setRevealed(1);
        }}
        aria-expanded={open}
      >
        {t(open ? 'Ocultar pistas' : 'Pista opcional')}
      </button>
      {open && (
        <div className="puzzle-hint-panel" aria-live="polite">
          <ol>
            {hints.slice(0, revealed).map((hint, i) => (
              <li key={i}>{content(hint)}</li>
            ))}
          </ol>
          {revealed < hints.length && (
            <button type="button" onClick={() => setRevealed(revealed + 1)}>
              {t('Siguiente pista ({count}/{total})', {
                count: revealed + 1,
                total: hints.length,
              })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
