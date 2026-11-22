import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { useT } from '../../i18n/LanguageContext';
import { parseDay } from '../../utils/countdown';
import { addDays, formatStudied, todayStr } from '../../utils/date';
import LineChart from '../LineChart';
import BarRows from './BarRows';

const PERIODS = [7, 28, 90, 365];
const WEEKLY_FROM = 100; // для длинных периодов рисуем недели, а не дни: иначе график превращается в «шум»

// понедельник той недели, в которую попадает дата
function mondayOf(date) {
    return addDays(date, -((parseDay(date).getDay() + 6) % 7));
}

export default function PeriodsStats({ map, subjects }) {
    const { t, locale } = useT();
    const [days, setDays] = useState(28);
    const [bySubject, setBySubject] = useState(null); // { days, list } — ответ относится к выбранному периоду, только если days совпал

    const today = todayStr();
    const from = addDays(today, -(days - 1));
    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);
    const formatTick = (min) => (min >= 60 && min % 60 === 0 ? `${min / 60} ${hLabel}` : `${min} ${mLabel}`);

    const stats = useMemo(() => {
        const values = Array.from({ length: days }, (_, i) => {
            const date = addDays(from, i);
            return { date, seconds: map[date] || 0 };
        });
        const total = values.reduce((sum, v) => sum + v.seconds, 0);
        const active = values.filter((v) => v.seconds > 0).length;
        const best = values.reduce((b, v) => (v.seconds > b.seconds ? v : b), values[0]);
        return { values, total, active, best };
    }, [map, days, from]);

    const items = useMemo(() => {
        const short = { day: 'numeric', month: 'short' };
        if (days <= WEEKLY_FROM) {
            const n = stats.values.length;
            const step = days <= 7 ? 1 : Math.ceil(n / 6);
            return stats.values.map((v, i) => {
                const d = parseDay(v.date);
                const label = (n - 1 - i) % step === 0 ? d.toLocaleDateString(locale, days <= 7 ? { weekday: 'short' } : short) : '';
                return { value: v.seconds, label, tip: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' }) };
            });
        }
        const weeks = new Map();
        for (const v of stats.values) {
            const key = mondayOf(v.date);
            weeks.set(key, (weeks.get(key) || 0) + v.seconds);
        }
        const list = [...weeks];
        const step = Math.ceil(list.length / 6);
        return list.map(([date, seconds], i) => {
            const d = parseDay(date);
            return {
                value: seconds,
                label: (list.length - 1 - i) % step === 0 ? d.toLocaleDateString(locale, { month: 'short' }) : '',
                tip: t('stats.weekOf', { date: d.toLocaleDateString(locale, short) }),
            };
        });
    }, [stats, days, locale, t]);

    // время по предметам за период (в общей карте дней предметов нет, поэтому отдельный запрос)
    useEffect(() => {
        let cancelled = false;
        api.getRangeStats(addDays(todayStr(), -(days - 1)), todayStr())
            .then((res) => !cancelled && setBySubject({ days, list: res.subjects }))
            .catch(() => !cancelled && setBySubject({ days, list: [] }));
        return () => {
            cancelled = true;
        };
    }, [days]);

    const subjectRows = useMemo(() => {
        if (!bySubject || bySubject.days !== days) return null;
        const byId = Object.fromEntries(subjects.map((s) => [s._id, s]));
        // занятия без предмета и по удалённому предмету показываем одной строкой
        const merged = new Map();
        for (const { subject, totalSeconds } of bySubject.list) {
            const known = subject && byId[subject] ? subject : 'none';
            merged.set(known, (merged.get(known) || 0) + totalSeconds);
        }
        const sum = [...merged.values()].reduce((a, b) => a + b, 0) || 1;
        return [...merged]
            .sort((a, b) => b[1] - a[1])
            .map(([id, seconds]) => ({
                key: id,
                label: id === 'none' ? t('exams.noSubject') : byId[id].name,
                color: id === 'none' ? 'var(--text-dim)' : byId[id].color,
                seconds,
                valueText: `${formatDuration(seconds)} · ${Math.round((seconds / sum) * 100)}%`,
            }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bySubject, days, subjects, t]);

    const bestDate = stats.best.seconds > 0 ? parseDay(stats.best.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '';

    return (
        <div className="card">
            <div className="segmented stats-periods" role="radiogroup" aria-label={t('stats.tab.periods')}>
                {PERIODS.map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={p === days} className={p === days ? 'active' : ''} onClick={() => setDays(p)}>
                        {t('stats.days', { n: p })}
                    </button>
                ))}
            </div>

            <div className="stats-tiles">
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.total')}</span>
                    <span className="stat-value">{formatDuration(stats.total)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.avgDay')}</span>
                    <span className="stat-value">{formatDuration(stats.total / days)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.activeDays')}</span>
                    <span className="stat-value">
                        {stats.active} / {days}
                    </span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.bestDay')}</span>
                    <span className="stat-value">{stats.best.seconds > 0 ? formatDuration(stats.best.seconds) : '—'}</span>
                    {bestDate && <span className="stat-sub">{bestDate}</span>}
                </div>
            </div>

            <LineChart
                key={days}
                items={items}
                color="#A78BFA"
                formatValue={formatDuration}
                formatTick={formatTick}
                ariaLabel={`${t('stats.total')}: ${formatDuration(stats.total)}`}
            />
            {stats.total === 0 && <p className="exam-stats-note">{t('exams.statsEmpty')}</p>}

            {subjectRows && subjectRows.length > 0 && (
                <>
                    <h3 className="stats-subtitle">{t('stats.bySubject')}</h3>
                    <BarRows rows={subjectRows} formatValue={formatDuration} />
                </>
            )}
        </div>
    );
}
