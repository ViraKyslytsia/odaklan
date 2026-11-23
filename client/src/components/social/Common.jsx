import { useT } from '../../i18n/LanguageContext';

export function Avatar({ name, size = 40 }) {
    const letter = (name || '?').trim().charAt(0).toUpperCase();
    return (
        <span className="soc-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
            {letter}
        </span>
    );
}

// зелёная точка: учится сейчас, фиолетовая: в сети, серая: не в сети
export function StatusBadge({ status }) {
    const { t } = useT();
    return (
        <span className={`soc-status ${status}`}>
            <span className="soc-status-dot" aria-hidden="true" />
            {t(`social.status.${status}`)}
        </span>
    );
}

export function EmptyText({ children }) {
    return <p className="soc-empty">{children}</p>;
}
