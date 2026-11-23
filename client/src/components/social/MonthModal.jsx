import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LOCALES } from '../../i18n/translations';
import { useT } from '../../i18n/LanguageContext';
import { buildMonthGrid, shiftMonth } from '../../utils/calendar';
import { formatStudied } from '../../utils/date';
import { pad2 } from '../../utils/countdown';
import { Avatar, StatusBadge } from './Common';

// Статистика одного участника за месяц (виден только друзьям и участникам общей группы)
export default function MonthModal({ user, onClose }) {
    const { t, lang } = useT();
    const toast = useToast();
    const locale = LOCALES[lang];
    const now = new Date();
    const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const [data, setData] = useState(null);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        api.getUserMonth(user.id, `${cursor.year}-${pad2(cursor.month + 1)}`)
            .then((d) => !cancelled && setData(d))
            .catch((err) => {
                if (cancelled) return;
                toast.apiError(err, 'social.loadError');
            });
        return () => {
            cancelled = true;
        };
    }, [user.id, cursor, toast]);

    const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d.totalSeconds])), [data]);
    const max = Math.max(...byDate.values(), 1);
    const grid = buildMonthGrid(cursor.year, cursor.month);
    const weekdays = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
    );
    const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const fmt = (s) => formatStudied(s, t('unit.h'), t('unit.m'));
    const isCurrent = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

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
                    <button type="button" className="daynav-arrow" aria-label={t('calendar.prev')}
                        onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}>‹</button>
                    <span className="soc-month-title">{title}</span>
                    <button type="button" className="daynav-arrow" aria-label={t('calendar.next')}
                        disabled={isCurrent}
                        onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}>›</button>
                </div>

                {data && (
                    <>
                        <div className="soc-month-sums">
                            <div><strong>{data.totalSeconds > 0 ? fmt(data.totalSeconds) : '—'}</strong><span>{t('stats.total')}</span></div>
                            <div><strong>{data.activeDays}</strong><span>{t('stats.activeDays')}</span></div>
                            <div>
                                <strong>{data.activeDays ? fmt(Math.round(data.totalSeconds / data.activeDays)) : '—'}</strong>
                                <span>{t('social.perActiveDay')}</span>
                            </div>
                        </div>

                        <div className="soc-cal">
                            {weekdays.map((w) => <span key={w} className="soc-cal-wd">{w}</span>)}
                            {grid.map((c) => {
                                const sec = c.inMonth ? byDate.get(c.date) || 0 : 0;
                                return (
                                    <span
                                        key={c.date}
                                        className={`soc-cal-day${c.inMonth ? '' : ' out'}`}
                                        style={sec ? { '--level': 0.25 + 0.75 * (sec / max) } : undefined}
                                        title={sec ? fmt(sec) : undefined}
                                    >
                                        {c.day}
                                    </span>
                                );
                            })}
                        </div>
                    </>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
