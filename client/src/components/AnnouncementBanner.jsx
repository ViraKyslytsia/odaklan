import { useEffect, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n/LanguageContext';

const KEY = 'odaklan_dismissed_announcements';

function readDismissed() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
        return [];
    }
}

// объявления от админа над задачами; закрытое объявление больше не показываем на этом устройстве
export default function AnnouncementBanner() {
    const { t } = useT();
    const [items, setItems] = useState([]);
    const [dismissed, setDismissed] = useState(readDismissed);

    useEffect(() => {
        let cancelled = false;
        api.announcements()
            .then((list) => !cancelled && setItems(list))
            .catch(() => { }); // не вышло загрузить объявления: главная работает без них
        return () => {
            cancelled = true;
        };
    }, []);

    function dismiss(id) {
        const next = [...dismissed, id].slice(-50);
        setDismissed(next);
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            // память браузера недоступна: объявление просто вернётся после перезагрузки
        }
    }

    const visible = items.filter((a) => !dismissed.includes(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="ann-list">
            {visible.map((a) => (
                <div key={a.id} className="ann-banner" role="status">
                    <div>
                        <span className="ann-label">{t('announcement.title')}</span>
                        <p className="ann-text">{a.text}</p>
                    </div>
                    <button className="ann-close" onClick={() => dismiss(a.id)} aria-label={t('common.close')}>
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}