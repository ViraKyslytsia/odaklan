import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LOCALES } from '../../i18n/translations';
import { useT } from '../../i18n/LanguageContext';
import { buildMonthGrid, shiftMonth } from '../../utils/calendar';
import { formatStudied, todayStr } from '../../utils/date';
import { pad2 } from '../../utils/countdown';
import { Avatar, StatusBadge } from './Common';

const makeCacheKey = (userId, monthKey) => `${userId}:${monthKey}`;

// Статистика одного участника за месяц (виден только друзьям и участникам общей группы)
export default function MonthModal({ user, onClose }) {
    const { t, lang } = useT();
    const toast = useToast();
    const locale = LOCALES[lang];
    const now = useMemo(() => new Date(), []);
    const today = useMemo(() => todayStr(now), [now]);
    const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const [data, setData] = useState(null);
    const cache = useRef(new Map()); // уже загруженные месяцы: повторный переход мгновенный
    const pending = useRef(new Set()); // месяцы, которые уже грузятся в фоне
    const monthKey = `${cursor.year}-${pad2(cursor.month + 1)}`;
    const cacheKey = makeCacheKey(user.id, monthKey);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // пока окно открыто, анимации страницы под ним приостановлены
    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, []);

    // при смене пользователя сбрасываем текущий снимок, если в кэше ещё нет данных для него
    useEffect(() => {
        const initial = cache.current.get(makeCacheKey(user.id, monthKey)) ?? null;
        setData(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    useEffect(() => {
        const cached = cache.current.get(cacheKey);
        if (cached) {
            setData(cached);
            return undefined;
        }
        // старые данные остаются на экране, пока грузится новый месяц: календарь не мигает
        let cancelled = false;
        api.getUserMonth(user.id, monthKey)
            .then((d) => {
                cache.current.set(cacheKey, d);
                if (!cancelled) setData(d);
            })
            .catch((err) => {
                if (cancelled) return;
                toast.apiError(err, 'social.loadError');
            });
        return () => {
            cancelled = true;
        };
    }, [user.id, monthKey, cacheKey, toast]);

    const loading = !data || data.month !== monthKey;

    // когда текущий месяц загружен, тихо подгружаем соседние: листание становится мгновенным
    useEffect(() => {
        if (loading) return;
        for (const delta of [-1, 1]) {
            const m = shiftMonth(cursor.year, cursor.month, delta);
            const key = `${m.year}-${pad2(m.month + 1)}`;
            const fullKey = makeCacheKey(user.id, key);
            if (cache.current.has(fullKey) || pending.current.has(fullKey)) continue;
            pending.current.add(fullKey);
            api.getUserMonth(user.id, key)
                .then((d) => cache.current.set(fullKey, d))
                .catch(() => { })
                .finally(() => pending.current.delete(fullKey));
        }
    }, [loading, cursor.year, cursor.month, user.id]);

    const byDate = useMemo(
        () => new Map((data?.days ?? []).map((d) => [d.date, d.totalSeconds])),
        [data]
    );
    const max = Math.max(...byDate.values(), 1);
    const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);
    const weekdays = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) =>
                new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
            ),
        [locale]
    );
    const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
    });
    const fmt = (s) => formatStudied(s, t('unit.h'), t('unit.m'));

    return createPortal(
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal soc-month" role="dialog" aria-modal="true">
                <div className="soc-month-head">
                    <Avatar name={user.nickname} size={48} />
                    <div>
                        <h2 className="soc-month-name">{user.nickname}</h2>
                        {user.status && <StatusBadge status={user.status} />}
                    </div>
                </div>

                <div className="soc-month-nav">
                    <button
                        type="button"
                        className="daynav-arrow"
                        aria-label={t('calendar.prev')}
                        onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
                    >
                        ‹
                    </button>
                    <span className="soc-month-title">{title}</span>
                    <button
                        type="button"
                        className="daynav-arrow"
                        aria-label={t('calendar.next')}
                        onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
                    >
                        ›
                    </button>
                </div>

                {
                    <div className={loading ? 'soc-month-body loading' : 'soc-month-body'}>
                        <div className="soc-month-sums">
                            <div>
                                <strong>{data && !loading && data.totalSeconds > 0 ? fmt(data.totalSeconds) : '—'}</strong>
                                <span>{t('stats.total')}</span>
                            </div>
                            <div>
                                <strong>{data && !loading ? data.activeDays : '—'}</strong>
                                <span>{t('stats.activeDays')}</span>
                            </div>
                            <div>
                                <strong>
                                    {data && !loading && data.activeDays ? fmt(Math.round(data.totalSeconds / data.activeDays)) : '—'}
                                </strong>
                                <span>{t('social.perActiveDay')}</span>
                            </div>
                        </div>

                        <div className="soc-cal">
                            {weekdays.map((w) => (
                                <span key={w} className="soc-cal-wd">
                                    {w}
                                </span>
                            ))}
                            {grid.map((c) => {
                                const sec = c.inMonth && !loading ? byDate.get(c.date) || 0 : 0;
                                return (
                                    <span
                                        key={`${c.date}-${c.inMonth ? 'in' : 'out'}`}
                                        className={`soc-cal-day${c.inMonth ? '' : ' out'}${c.inMonth && c.date === today ? ' today' : ''}`}
                                        style={sec ? { '--level': 0.25 + 0.75 * (sec / max) } : undefined}
                                        title={sec ? fmt(sec) : undefined}
                                    >
                                        {c.day}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                }

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
