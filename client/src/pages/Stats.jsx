import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import LineChart from '../components/LineChart';
import { useT } from '../i18n/LanguageContext';
import { buildMonthGrid, shiftMonth } from '../utils/calendar';
import { pad2, parseDay } from '../utils/countdown';
import { addDays, formatStudied, todayStr } from '../utils/date';

const PERIODS = [7, 28, 90, 365];
const CHART_COLOR = '#A78BFA';
const ALL_FROM = '2000-01-01';
const ALL_TO = '2099-12-31';

// итог, дни с занятиями и лучший день по списку дат
function summarize(dates, byDate) {
    let total = 0;
    let active = 0;
    let best = null;
    for (const date of dates) {
        const seconds = byDate.get(date) || 0;
        total += seconds;
        if (seconds > 0) {
            active += 1;
            if (!best || seconds > best.seconds) best = { date, seconds };
        }
    }
    return { total, active, best };
}

const dateRange = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));

// понедельник той недели, в которую попала дата
function weekStart(str) {
    const [y, m, d] = str.split('-').map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
    return addDays(str, -dow);
}

// 5400 → «1:30» (минимум 0:01, если в этот день что-то было)
function formatHM(seconds) {
    const min = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
    return `${Math.floor(min / 60)}:${pad2(min % 60)}`;
}

function buildPeriodItems(n, from, byDate, locale, t) {
    const dates = dateRange(from, n);

    if (n < 365) {
        return dates.map((date, i) => {
            const d = parseDay(date);
            let label = '';
            if (n === 7) {
                label = d.toLocaleDateString(locale, { weekday: 'short' });
            } else if ((n - 1 - i) % (n === 28 ? 7 : 15) === 0) {
                label = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
            }
            return {
                value: byDate.get(date) || 0,
                label,
                tip: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' }),
            };
        });
    }

    // за год по дням получается шум, поэтому складываем по неделям
    const weeks = new Map();
    for (const date of dates) {
        const key = weekStart(date);
        weeks.set(key, (weeks.get(key) || 0) + (byDate.get(date) || 0));
    }
    let prevMonth = -1;
    return [...weeks].map(([key, value]) => {
        const d = parseDay(key);
        const label = d.getMonth() !== prevMonth ? d.toLocaleDateString(locale, { month: 'short' }) : '';
        prevMonth = d.getMonth();
        return {
            value,
            label,
            tip: t('stats.weekOf', { date: d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }) }),
        };
    });
}

function StatTiles({ summary, daysCount, formatDuration, locale }) {
    const { t } = useT();
    const { total, active, best } = summary;
    return (
        <div className="exam-stat-tiles">
            <div className="stat-tile">
                <span className="stat-label">{t('stats.total')}</span>
                <span className="stat-value">{formatDuration(total)}</span>
            </div>
            <div className="stat-tile">
                <span className="stat-label">{t('stats.avgPerDay')}</span>
                <span className="stat-value">{formatDuration(daysCount > 0 ? total / daysCount : 0)}</span>
            </div>
            <div className="stat-tile">
                <span className="stat-label">{t('stats.activeDays')}</span>
                <span className="stat-value">{active}</span>
            </div>
            <div className="stat-tile">
                <span className="stat-label">{t('stats.bestDay')}</span>
                <span className="stat-value">{best ? formatDuration(best.seconds) : '—'}</span>
                {best && (
                    <span className="stat-sub">
                        {parseDay(best.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
}

function BarRow({ label, seconds, max, prev, future, formatDuration }) {
    const hasChange = prev !== undefined;
    const pct = hasChange && prev > 0 ? Math.round(((seconds - prev) / prev) * 100) : null;
    const diff = seconds - (prev || 0);
    const tip = `${diff >= 0 ? '+' : '−'}${formatDuration(Math.abs(diff))}`;
    const tone = pct === null || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';

    return (
        <li className={`bar-row${future ? ' future' : ''}${hasChange ? '' : ' no-change'}`}>
            <span className="bar-label">{label}</span>
            <span className="bar-track">
                {!future && <span className="bar-fill" style={{ width: `${max > 0 ? (seconds / max) * 100 : 0}%` }} />}
            </span>
            <span className="bar-time">{future ? '' : formatDuration(seconds)}</span>
            {hasChange &&
                (future || pct === null ? (
                    <span className="bar-change flat">{future ? '' : '—'}</span>
                ) : (
                    <span className={`bar-change ${tone}`} tabIndex={0} data-tip={tip} aria-label={tip}>
                        {pct > 0 ? '+' : pct < 0 ? '−' : ''}
                        {Math.abs(pct)}%
                    </span>
                ))}
        </li>
    );
}

function PeriodsTab({ byDate, subjects, subjectNames, formatDuration, locale, today }) {
    const { t } = useT();
    const [n, setN] = useState(7);
    const [breakdown, setBreakdown] = useState(null);
    const [error, setError] = useState('');

    const from = addDays(today, -(n - 1));
    const summary = useMemo(() => summarize(dateRange(from, n), byDate), [from, n, byDate]);
    const items = useMemo(() => buildPeriodItems(n, from, byDate, locale, t), [n, from, byDate, locale, t]);

    useEffect(() => {
        let cancelled = false;
        api.getRangeStats(from, today)
            .then((res) => {
                if (cancelled) return;
                setBreakdown({ n, subjects: res.subjects });
                setError('');
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [from, today, n]);

    const rows = breakdown && breakdown.n === n ? breakdown.subjects : null;
    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatTick = (min) => (min >= 60 && min % 60 === 0 ? `${min / 60} ${hLabel}` : `${min} ${mLabel}`);

    return (
        <>
            <div className="stats-controls">
                <div className="segmented">
                    {PERIODS.map((p) => (
                        <button key={p} type="button" className={p === n ? 'active' : ''} onClick={() => setN(p)}>
                            {t('stats.periodDays', { n: p })}
                        </button>
                    ))}
                </div>
            </div>

            <StatTiles summary={summary} daysCount={n} formatDuration={formatDuration} locale={locale} />

            <LineChart
                key={n}
                items={items}
                color={CHART_COLOR}
                formatValue={formatDuration}
                formatTick={formatTick}
                ariaLabel={`${t('stats.chartLabel')}: ${formatDuration(summary.total)}`}
            />
            {summary.total === 0 && <p className="exam-stats-note">{t('stats.empty')}</p>}

            <h3 className="stats-subtitle">{t('stats.bySubject')}</h3>
            {error ? (
                <p className="form-error">{t('stats.error', { message: error })}</p>
            ) : !rows ? (
                <div className="chart-skeleton" />
            ) : rows.length === 0 ? (
                <p className="exam-stats-note">{t('stats.empty')}</p>
            ) : (
                <ul className="subject-rows">
                    {rows.map((row) => {
                        const subject = subjects.get(row.subject);
                        const share = summary.total > 0 ? (row.totalSeconds / summary.total) * 100 : 0;
                        return (
                            <li key={row.subject ?? 'none'} className="subject-row">
                                <span className="subject-dot" style={{ background: subject?.color || 'var(--text-dim)' }} />
                                <span className="subject-name">{subjectNames.get(row.subject) || t('stats.otherSubject')}</span>
                                <span className="subject-time">{formatDuration(row.totalSeconds)}</span>
                                <span className="subject-share">{Math.round(share)}%</span>
                                <span className="subject-bar">
                                    <span style={{ width: `${share}%`, background: subject?.color || 'var(--text-dim)' }} />
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}

function CalendarTab({ byDate, formatDuration, locale, today }) {
    const { t } = useT();
    const now = parseDay(today);
    const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
    const monthDays = grid.filter((c) => c.inMonth);
    const maxSeconds = Math.max(...monthDays.map((c) => byDate.get(c.date) || 0), 0);

    // в текущем месяце среднее считаем по прошедшим дням, в будущем месяце его нет
    const monthKey = `${cursor.year}-${pad2(cursor.month + 1)}`;
    const todayKey = today.slice(0, 7);
    const daysCount = monthKey === todayKey ? now.getDate() : monthKey > todayKey ? 0 : monthDays.length;
    const summary = summarize(monthDays.map((c) => c.date), byDate);

    const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, { month: 'long' });
    const weekdays = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
    ); // 1 января 2024 был понедельником

    return (
        <>
            <div className="stats-nav">
                <button
                    type="button"
                    className="stats-arrow"
                    aria-label={t('calendar.prev')}
                    onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
                >
                    ‹
                </button>
                <strong className="stats-nav-title">
                    {monthName} {cursor.year}
                </strong>
                <button
                    type="button"
                    className="stats-arrow"
                    aria-label={t('calendar.next')}
                    onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
                >
                    ›
                </button>
            </div>

            <StatTiles summary={summary} daysCount={daysCount} formatDuration={formatDuration} locale={locale} />

            <div className="month-grid">
                {weekdays.map((w) => (
                    <span key={w} className="month-weekday">
                        {w}
                    </span>
                ))}
                {grid.map((cell) => {
                    if (!cell.inMonth) return <span key={cell.date} className="month-cell out" aria-hidden="true" />;
                    const seconds = byDate.get(cell.date) || 0;
                    const ratio = maxSeconds > 0 ? seconds / maxSeconds : 0;
                    return (
                        <div
                            key={cell.date}
                            className={`month-cell${seconds > 0 ? '' : ' empty'}${cell.date === today ? ' today' : ''}`}
                            style={seconds > 0 ? { background: `rgba(124, 58, 237, ${0.22 + ratio * 0.78})` } : undefined}
                            title={seconds > 0 ? formatDuration(seconds) : undefined}
                        >
                            <span className="month-day">{cell.day}</span>
                            <span className="month-time">{seconds > 0 ? formatHM(seconds) : ''}</span>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function MonthsTab({ monthTotals, formatDuration, locale, today }) {
    const { t } = useT();
    const [year, setYear] = useState(Number(today.slice(0, 4)));

    const months = Array.from({ length: 12 }, (_, m) => {
        const key = `${year}-${pad2(m + 1)}`;
        return {
            id: key,
            label: new Date(year, m, 1).toLocaleDateString(locale, { month: 'long' }),
            seconds: monthTotals.get(key) || 0,
        };
    });
    const max = Math.max(...months.map((m) => m.seconds), 0);

    return (
        <>
            <div className="stats-nav">
                <button
                    type="button"
                    className="stats-arrow"
                    aria-label={t('stats.prevYear')}
                    onClick={() => setYear((y) => y - 1)}
                >
                    ‹
                </button>
                <strong className="stats-nav-title">{year}</strong>
                <button
                    type="button"
                    className="stats-arrow"
                    aria-label={t('stats.nextYear')}
                    onClick={() => setYear((y) => y + 1)}
                >
                    ›
                </button>
            </div>
            <ul className="bar-rows">
                {months.map((m) => (
                    <BarRow key={m.id} {...m} max={max} formatDuration={formatDuration} />
                ))}
            </ul>
        </>
    );
}

function YearsTab({ yearTotals, firstYear, formatDuration, today }) {
    const currentYear = Number(today.slice(0, 4));
    const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i).map((y) => ({
        id: String(y),
        label: String(y),
        seconds: yearTotals.get(String(y)) || 0,
    }));
    const max = Math.max(...years.map((y) => y.seconds), 0);

    return (
        <ul className="bar-rows">
            {years.map((y) => (
                <BarRow key={y.id} {...y} max={max} formatDuration={formatDuration} />
            ))}
        </ul>
    );
}

export default function Stats() {
    const { t, locale } = useT();
    const [tab, setTab] = useState('periods');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const today = todayStr();

    useEffect(() => {
        let cancelled = false;
        Promise.all([api.getRangeStats(ALL_FROM, ALL_TO), api.getSubjects()])
            .then(([range, subjectList]) => {
                if (cancelled) return;
                const byDate = new Map(range.days.map((d) => [d.date, d.totalSeconds]));
                const monthTotals = new Map();
                const yearTotals = new Map();
                for (const [date, seconds] of byDate) {
                    monthTotals.set(date.slice(0, 7), (monthTotals.get(date.slice(0, 7)) || 0) + seconds);
                    yearTotals.set(date.slice(0, 4), (yearTotals.get(date.slice(0, 4)) || 0) + seconds);
                }
                const subjects = new Map(subjectList.map((s) => [s._id, s]));
                setData({ byDate, monthTotals, yearTotals, subjects });
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    const subjectNames = useMemo(
        () => new Map(data ? [...data.subjects].map(([id, s]) => [id, s.name]) : []),
        [data]
    );

    const hLabel = t('unit.h');
    const mLabel = t('unit.m');
    const formatDuration = (sec) => formatStudied(sec, hLabel, mLabel);

    const yearsWithData = data ? [...data.yearTotals].filter(([, s]) => s > 0).map(([y]) => Number(y)) : [];
    const firstYear = yearsWithData.length ? Math.min(...yearsWithData) : Number(today.slice(0, 4));
    // вкладка «Годы» нужна, только если занятия были больше чем в одном году
    const tabs = ['periods', 'calendar', 'months', ...(yearsWithData.length > 1 ? ['years'] : [])];

    return (
        <div className="card stats-card">
            <div className="stats-controls">
                <div className="segmented" role="tablist">
                    {tabs.map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={key === tab}
                            className={key === tab ? 'active' : ''}
                            onClick={() => setTab(key)}
                        >
                            {t(`stats.tab.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <p className="form-error">{t('stats.error', { message: error })}</p>
            ) : !data ? (
                <div className="chart-skeleton" />
            ) : tab === 'periods' ? (
                <PeriodsTab
                    byDate={data.byDate}
                    subjects={data.subjects}
                    subjectNames={subjectNames}
                    formatDuration={formatDuration}
                    locale={locale}
                    today={today}
                />
            ) : tab === 'calendar' ? (
                <CalendarTab byDate={data.byDate} formatDuration={formatDuration} locale={locale} today={today} />
            ) : tab === 'months' ? (
                <MonthsTab
                    monthTotals={data.monthTotals}
                    formatDuration={formatDuration}
                    locale={locale}
                    today={today}
                />
            ) : (
                <YearsTab yearTotals={data.yearTotals} firstYear={firstYear} formatDuration={formatDuration} today={today} />
            )}
        </div>
    );
}