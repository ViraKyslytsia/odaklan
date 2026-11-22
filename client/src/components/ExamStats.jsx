import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n/LanguageContext';
import { pad2, parseDay } from '../utils/countdown';
import { formatStudied, todayStr } from '../utils/date';
import LineChart from './LineChart';

const PERIODS = ['day', 'week', 'month', 'year'];

// превращает «корзины» с сервера в точки графика с подписями на языке пользователя
function toItems(period, buckets, locale) {
    const n = buckets.length;
    return buckets.map((b, i) => {
        if (period === 'day') {
            const h = Number(b.key);
            return { value: b.seconds, label: h % 6 === 0 ? `${pad2(h)}:00` : '', tip: `${pad2(h)}:00 – ${pad2((h + 1) % 24)}:00` };
        }
        if (period === 'year') {
            const [y, m] = b.key.split('-').map(Number);
            const d = new Date(y, m - 1, 1);
            return {
                value: b.seconds,
                label: d.toLocaleDateString(locale, { month: 'short' }),
                tip: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
            };
        }
        const d = parseDay(b.key);
        const showLabel = period === 'week' || (n - 1 - i) % 5 === 0;
        return {
            value: b.seconds,
            label: showLabel ? (period === 'week' ? d.toLocaleDateString(locale, { weekday: 'short' }) : String(d.getDate())) : '',
            tip: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' }),
        };
    });
}

export default function ExamStats({ exams, color: defaultColor = '#A78BFA' }) {
    const { t, locale } = useT();
    const [period, setPeriod] = useState('week');
    const [selected, setSelected] = useState('all');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const selectedExam = exams.find((e) => e._id === selected) || null;
    const scope = selectedExam ? [selectedExam] : exams;
    const subjectKey = [...new Set(scope.map((e) => e.subject).filter(Boolean))].sort().join(',');
    const color = selectedExam?.color || defaultColor;

    useEffect(() => {
        if (!subjectKey) return;
        let cancelled = false;
        api.getSeries(period, todayStr(), subjectKey.split(','))
            .then((res) => {
                if (cancelled) return;
                setData({ ...res, period, key: subjectKey });
                setError('');
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [period, subjectKey]);

    // график показываем только если ответ относится к тому, что выбрано сейчас
    const fresh = data && data.period === period && data.key === subjectKey ? data : null;
    const items = useMemo(() => (fresh ? toItems(period, fresh.buckets, locale) : []), [fresh, period, locale]);

    const tasksTotal = scope.reduce((sum, e) => sum + (e.subtasks ?? []).length, 0);
    const tasksDone = scope.reduce((sum, e) => sum + (e.subtasks ?? []).filter((s) => s.done).length, 0);
    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);
    const formatTick = (min) => (min >= 60 && min % 60 === 0 ? `${min / 60} ${hLabel}` : `${min} ${mLabel}`);

    return (
        <section className="exam-stats">
            <div className="section-head">
                <h2>{t('exams.statsTitle')}</h2>
            </div>

            <div className="card">
                <div className="exam-stats-controls">
                    <div className="segmented">
                        {PERIODS.map((p) => (
                            <button key={p} type="button" className={p === period ? 'active' : ''} onClick={() => setPeriod(p)}>
                                {t(`exams.period.${p}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="exam-chips" role="radiogroup" aria-label={t('exams.statsTitle')}>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={!selectedExam}
                        className={`chip${!selectedExam ? ' active' : ''}`}
                        style={{ '--chip-color': defaultColor }}
                        onClick={() => setSelected('all')}
                    >
                        {t('exams.statsAll')}
                    </button>
                    {exams.map((e) => (
                        <button
                            key={e._id}
                            type="button"
                            role="radio"
                            aria-checked={e._id === selected}
                            className={`chip${e._id === selected ? ' active' : ''}`}
                            style={{ '--chip-color': e.color }}
                            onClick={() => setSelected(e._id)}
                        >
                            {e.title}
                        </button>
                    ))}
                </div>

                <div className="exam-stat-tiles">
                    <div className="stat-tile">
                        <span className="stat-label">{t('exams.statsTotal')}</span>
                        <span className="stat-value">{fresh ? formatDuration(fresh.total) : '—'}</span>
                    </div>
                    <div className="stat-tile">
                        <span className="stat-label">{t('exams.statsTasks')}</span>
                        <span className="stat-value">
                            {tasksDone} / {tasksTotal}
                        </span>
                    </div>
                </div>

                {!subjectKey ? (
                    <p className="exam-stats-note">{t('exams.statsNoSubject')}</p>
                ) : error ? (
                    <p className="form-error">{t('exams.error', { message: error })}</p>
                ) : fresh ? (
                    <>
                        <LineChart
                            key={`${period}-${subjectKey}`}
                            items={items}
                            color={color}
                            formatValue={formatDuration}
                            formatTick={formatTick}
                            ariaLabel={`${t('exams.statsTotal')}: ${formatDuration(fresh.total)}`}
                        />
                        {fresh.total === 0 && <p className="exam-stats-note">{t('exams.statsEmpty')}</p>}
                    </>
                ) : (
                    <div className="chart-skeleton" />
                )}
            </div>
        </section>
    );
}