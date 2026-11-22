import { useT } from '../i18n/LanguageContext';

export default function Placeholder({ titleKey }) {
    const { t } = useT();
    return (
        <div className="card">
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>{t(titleKey)}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{t('common.soon')}</p>
        </div>
    );
}