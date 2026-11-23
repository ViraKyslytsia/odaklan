import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import { todayStr } from '../utils/date';

// Ближайший государственный праздник страны из настроек региона
export default function HolidayCard({ region }) {
    const { t, locale } = useT();
    // undefined — ещё грузится, null — не нашли или ошибка
    const [holiday, setHoliday] = useState(undefined);
    const code = region?.countryCode;

    useEffect(() => {
        if (!code) return;
        const controller = new AbortController();
        setHoliday(undefined);
        const year = new Date().getFullYear();
        const load = (y) =>
            fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${code}`, {
                signal: controller.signal,
            }).then((res) => {
                if (!res.ok) throw new Error('holidays failed');
                return res.json();
            });

        // берём этот и следующий год: в конце декабря ближайший праздник уже в январе
        Promise.all([load(year), load(year + 1)])
            .then(([thisYear, nextYear]) => {
                const today = todayStr();
                // даты вида YYYY-MM-DD сравниваются как обычные строки
                setHoliday([...thisYear, ...nextYear].find((h) => h.date >= today) || null);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') setHoliday(null);
            });
        return () => controller.abort();
    }, [code]);

    if (!code) {
        return (
            <Link to="/profile" className="mini-card">
                <span className="mini-label">{t('quick.holiday')}</span>
                <span className="mini-text">{t('quick.regionAdd')}</span>
            </Link>
        );
    }

    const dateText = holiday
        ? new Date(`${holiday.date}T00:00:00`).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
        })
        : '';

    return (
        <div className="mini-card water-card">
            <span className="mini-label">{t('quick.holiday')}</span>
            <span className="mini-text">
                {holiday === undefined ? '…' : holiday ? `${holiday.localName} · ${dateText}` : '—'}
            </span>
        </div>
    );
}