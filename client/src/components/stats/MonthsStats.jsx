import { useMemo, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { shiftMonth } from '../../utils/calendar';
import { formatStudied } from '../../utils/date';
import { daysInMonth, isoDate, monthEnd, monthStart, percentChange, sumRange } from '../../utils/stats';
import BarRows from './BarRows';
import Chevron from './Chevron';

// Месяцы выбранного года: сколько учились и как это соотносится с прошлым месяцем
export default function MonthsStats({ map, years }) {
    const { t, locale } = useT();
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth();
    const [year, setYear] = useState(nowY);
    const minYear = years[0] ?? nowY;

    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);

    const data = useMemo(() => {
        const last = year === nowY ? nowM : 11; // будущие месяцы не показываем
        const rows = [];
        for (let m = 0; m <= last; m++) {
            const total = sumRange(map, monthStart(year, m), monthEnd(year, m));
            const isNow = year === nowY && m === nowM;

            // с чем сравниваем: с прошлым месяцем целиком; текущий (неполный) месяц, с тем же числом дней
            const prev = shiftMonth(year, m, -1);
            const prevLen = daysInMonth(prev.year, prev.month);
            const prevTo = isNow ? Math.min(now.getDate(), prevLen) : prevLen;
            const prevTotal = sumRange(map, monthStart(prev.year, prev.month), isoDate(prev.year, prev.month, prevTo));

            const delta = percentChange(total, prevTotal);
            const diff = total - prevTotal;
            rows.push({
                key: m,
                label: new Date(year, m, 1).toLocaleDateString(locale, { month: 'long' }),
                seconds: total,
                current: isNow,
                delta,
                deltaTitle: delta === null || diff === 0 ? undefined : `${diff > 0 ? '+' : '−'}${formatDuration(Math.abs(diff))} ${t('stats.vsMonth')}`,
            });
        }
        const total = rows.reduce((sum, r) => sum + r.seconds, 0);
        const best = rows.reduce((b, r) => (r.seconds > b.seconds ? r : b), rows[0]);
        return { rows, total, best, avg: total / rows.length };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, year, locale, t]);

    return (
        <div className="card">
            <div className="stats-nav">
                <button type="button" className="daynav-arrow" aria-label={t('stats.prevYear')} disabled={year <= minYear} onClick={() => setYear((y) => y - 1)}>
                    <Chevron dir="left" />
                </button>
                <h3 className="stats-nav-title">{year}</h3>
                <button type="button" className="daynav-arrow" aria-label={t('stats.nextYear')} disabled={year >= nowY} onClick={() => setYear((y) => y + 1)}>
                    <Chevron dir="right" />
                </button>
            </div>

            <div className="stats-tiles">
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.total')}</span>
                    <span className="stat-value">{formatDuration(data.total)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.avgMonth')}</span>
                    <span className="stat-value">{formatDuration(data.avg)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.bestMonth')}</span>
                    <span className="stat-value">{data.best.seconds > 0 ? formatDuration(data.best.seconds) : '—'}</span>
                    {data.best.seconds > 0 && <span className="stat-sub stats-cap">{data.best.label}</span>}
                </div>
            </div>

            <BarRows rows={data.rows} formatValue={formatDuration} capitalize />
            {year === nowY && <p className="exam-stats-note">{t('stats.partialNote')}</p>}
        </div>
    );
}
