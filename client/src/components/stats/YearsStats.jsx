import { useMemo } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { formatStudied, todayStr } from '../../utils/date';
import { percentChange, sameDayLastYear, sumRange } from '../../utils/stats';
import BarRows from './BarRows';

// Сравнение по годам: для тех, кто занимается больше года
export default function YearsStats({ map, years }) {
    const { t } = useT();
    const nowY = new Date().getFullYear();
    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);

    const data = useMemo(() => {
        const rows = [];
        for (let y = years[0]; y <= nowY; y++) {
            const isNow = y === nowY;
            const total = sumRange(map, `${y}-01-01`, `${y}-12-31`);
            // текущий год сравниваем с тем же периодом прошлого года, иначе он всегда «проигрывает» целому году
            const prevTo = isNow ? sameDayLastYear(todayStr()) : `${y - 1}-12-31`;
            const prevTotal = y > years[0] ? sumRange(map, `${y - 1}-01-01`, prevTo) : 0;
            const delta = percentChange(total, prevTotal);
            const diff = total - prevTotal;
            rows.push({
                key: y,
                label: String(y),
                seconds: total,
                current: isNow,
                delta,
                deltaTitle: delta === null || diff === 0 ? undefined : `${diff > 0 ? '+' : '−'}${formatDuration(Math.abs(diff))} ${t('stats.vsYear')}`,
            });
        }
        const total = rows.reduce((sum, r) => sum + r.seconds, 0);
        const best = rows.reduce((b, r) => (r.seconds > b.seconds ? r : b), rows[0]);
        const activeDays = Object.values(map).filter((s) => s > 0).length;
        return { rows: rows.reverse(), total, best, activeDays }; // новые годы сверху
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, years, t]);

    return (
        <div className="card">
            <div className="stats-tiles">
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.allTime')}</span>
                    <span className="stat-value">{formatDuration(data.total)}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.bestYear')}</span>
                    <span className="stat-value">{formatDuration(data.best.seconds)}</span>
                    <span className="stat-sub">{data.best.label}</span>
                </div>
                <div className="stat-tile">
                    <span className="stat-label">{t('stats.activeDays')}</span>
                    <span className="stat-value">{data.activeDays}</span>
                </div>
            </div>

            <BarRows rows={data.rows} formatValue={formatDuration} />
            <p className="exam-stats-note">{t('stats.partialNote')}</p>
        </div>
    );
}
