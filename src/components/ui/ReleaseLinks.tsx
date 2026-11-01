import { LicenseNotices } from './LicenseNotices';
import { RELEASE_LINKS } from '../../services/releaseLinks';
import { useTranslation } from '../../services/i18n/useTranslation';

export function ReleaseLinks() {
  const { t } = useTranslation();
  return (
    <section className="release-links" aria-labelledby="release-links-title">
      <h3 id="release-links-title">{t('Privacidad y soporte')}</h3>
      <nav aria-label={t('Privacidad y soporte')}>
        <a
          href={RELEASE_LINKS.privacy}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('Política de privacidad')}
        </a>
        <a
          href={RELEASE_LINKS.support}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('Soporte')}
        </a>
      </nav>
      <p>{t('Los enlaces se abren en el navegador.')}</p>
      <LicenseNotices />
    </section>
  );
}
