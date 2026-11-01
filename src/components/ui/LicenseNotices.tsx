import { useEffect, useState } from 'react';
import { useTranslation } from '../../services/i18n/useTranslation';

/** Bundled text, never injected HTML or a remote page, remains available offline. */
export function LicenseNotices() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || text !== null) return;
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}third-party-notices.txt`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw Error('Notices unavailable');
        return response.text();
      })
      .then((value) => {
        if (!controller.signal.aborted) setText(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [open, text]);
  return (
    <div className="license-notices">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="license-notices-text"
        onClick={() => {
          setFailed(false);
          setOpen(!open);
        }}
      >
        {t('Licencias de terceros')}
      </button>
      {open && (
        <div
          id="license-notices-text"
          role="region"
          aria-label={t('Licencias de terceros')}
          tabIndex={0}
        >
          {text !== null ? (
            <pre>{text}</pre>
          ) : (
            <p role="status">
              {failed
                ? t(
                    'No se pudieron cargar las licencias. Cierra y vuelve a abrir esta sección.',
                  )
                : t('Cargando licencias…')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
