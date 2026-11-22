import { useMemo, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { buildMonthGrid, shiftMonth } from '../../utils/calendar';
import { parseDay } from '../../utils/countdown';
import { formatStudied, todayStr } from '../../utils/date';
import { daysInMonth, formatClock } from '../../utils/stats';
import Chevron from './Chevron';

// сетка из buildMonthGrid всегда на 6 недель: лишние недели целиком из соседних месяцев убираем
function trimGrid(cells) {
    let end = cells.length;
    while (end > 7 && cells.slice(end - 7, end).every((c) => !c.inMonth)) end -= 7;
    return cells.slice(0, end);
}

// Календарь учёбы: в каждой клетке дня время занятий (ч:мм), чем больше занимались, тем ярче клетка
export default function CalendarStats({ map }) {
    const { t, locale } = useT();
    const now = new Date();
    const today = todayStr(now);
    const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);

    const cells = useMemo(() => trimGrid(buildMonthGrid(view.year, view.month)), [view]);
    const isCurrent = view.year === now.getFullYear() && view.month === now.getMonth();

    const month = useMemo(() => {
        const inMonth = cells.filter((c) => c.inMonth).map((c) => ({ date: c.date, seconds: map[c.date] || 0 }));
        const total = inMonth.reduce((sum, d) => sum + d.seconds, 0);
        const max = Math.max(...inMonth.map((d) => d.seconds), 0);
        const best = inMonth.find((d) => d.seconds === max && max > 0);
        // среднее считаем по прошедшим дням: в середине месяца будущие дни не должны занижать цифру
        const first = new Date(view.year, view.month, 1);
        const elapsed = first > now ? 0 : isCurrent ? now.getDate() : daysInMonth(view.year, view.month);
        return { total, max, best, elapsed, active: inMonth.filter((d) => d.seconds > 0).length, length: inMonth.length };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cells, map, view, isCurrent]);

    const rawTitle = new Date(view.year, view.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const monthTitle = rawTitle.charAt(0).toLocaleUpperCase(locale) + rawTitle.slice(1);
    // 1 января 2024 — понедельник: 7 дней подряд дают подписи дней недели на нужном языке
    const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }));

    return (
        <div className="card">
            <div className="stats-nav">
                <button type="button" className="daynav-arrow" aria-label={t('calendar.prev')} onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}>
                    <Chevron dir="left" />
                </button>
                <h3 className="stats-nav-title">{monthTitle}</h3>
                <button type="button" className="daynav-arrow" aria-label={t('calendar.next')} onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}>
                    <Chevron dir="right" />
                </button>
                {!isCurrent && (
                    <button type="button" className="link-button" onClick={() => setView({ year: now.getFullYear(), month: now.getMonth() })}>
                        {t('calendar.today')}
                    </button>
                )}
            </div>

            <div className="stats-tiles">
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.total')}</span>
                    <span className="stat-value">{formatDuration(month.total)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.avgDay')}</span>
                    <span className="stat-value">{month.elapsed ? formatDuration(month.total / month.elapsed) : '—'}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.activeDays')}</span>
                    <span className="stat-value">
                        {month.active} / {month.length}
                    </span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.bestDay')}</span>
                    <span className="stat-value">{month.best ? formatDuration(month.best.seconds) : '—'}</span>
                    {month.best && <span className="stat-sub">{parseDay(month.best.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>}
                </div>
            </div>

            <div className="stats-cal stats-weekdays" aria-hidden="true">
                {weekdays.map((w, i) => (
                    <span key={i}>{w}</span>
                ))}
            </div>
            <div className="stats-cal">
                {cells.map((c) => {
                    const seconds = c.inMonth ? map[c.date] || 0 : 0;
                    const has = seconds > 0;
                    const label = parseDay(c.date).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
                    return (
                        <div
                            key={c.date}
                            className={`stats-day${c.inMonth ? '' : ' out'}${has ? ' has' : ''}${c.date === today ? ' today' : ''}`}
                            style={has ? { '--heat': `${12 + Math.round((seconds / month.max) * 38)}%` } : undefined}
                            title={has ? `${label}: ${formatDuration(seconds)}` : label}
                        >
                            <span className="stats-day-num">{c.day}</span>
                            {has && <span className="stats-day-time">{formatClock(seconds)}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
