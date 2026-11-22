import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';
import { buildMonthGrid, shiftMonth } from '../utils/calendar';
import { parseDay } from '../utils/countdown';
import { todayStr } from '../utils/date';

const POP_W = 300;
const GAP = 8;
const MARGIN = 8;

// Свой календарь вместо системного <input type="date">.
// value и onChange работают со строкой «YYYY-MM-DD» (или '' если даты нет), как и родной input.
export default function DatePicker({ value, onChange, id, placeholder, className = '', title, ariaLabel, compact, clearable }) {
    const { t, locale } = useT();
    const triggerRef = useRef(null);
    const popRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => viewOf(value));
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const today = todayStr();

    // окно «приклеено» к кнопке; если внизу не хватает места, открываем вверх
    const place = useCallback(() => {
        const trigger = triggerRef.current;
        const pop = popRef.current;
        if (!trigger || !pop) return;
        const r = trigger.getBoundingClientRect();
        const h = pop.offsetHeight;
        const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - POP_W - MARGIN));
        const below = r.bottom + GAP;
        const top = below + h > window.innerHeight - MARGIN ? Math.max(MARGIN, r.top - GAP - h) : below;
        setPos({ top, left });
    }, []);

    // замеряем и ставим окно до отрисовки, чтобы оно не «прыгало»
    useLayoutEffect(() => {
        if (open) place();
    }, [open, view, place]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        // capture + stopPropagation: Esc закрывает только календарь, а не окно экзамена под ним
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place]);

    function toggle() {
        if (!open) setView(viewOf(value)); // при открытии показываем месяц выбранной даты
        setOpen((o) => !o);
    }

    function pick(date) {
        onChange(date);
        setOpen(false);
        triggerRef.current?.focus();
    }

    const cells = buildMonthGrid(view.year, view.month);
    const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    // 1 января 2024 — понедельник: берём 7 дней подряд, чтобы получить подписи дней недели на нужном языке
    const weekdays = Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
    );
    const label = value
        ? parseDay(value).toLocaleDateString(
              locale,
              compact ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' }
          )
        : placeholder;

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`input datepicker-trigger ${className}${value ? '' : ' empty'}`}
                title={title}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={toggle}
            >
                <span>{label}</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="15" rx="3" />
                    <path d="M4 10h16M9 3v4M15 3v4" />
                </svg>
            </button>

            {open &&
                createPortal(
                    <div ref={popRef} className="datepicker-pop" role="dialog" aria-label={monthTitle} style={{ top: pos.top, left: pos.left, width: POP_W }}>
                        <div className="datepicker-head">
                            <button type="button" className="datepicker-nav" aria-label={t('calendar.prev')} onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}>
                                <Chevron dir="left" />
                            </button>
                            <span className="datepicker-title">{monthTitle}</span>
                            <button type="button" className="datepicker-nav" aria-label={t('calendar.next')} onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}>
                                <Chevron dir="right" />
                            </button>
                        </div>

                        <div className="datepicker-grid datepicker-weekdays" aria-hidden="true">
                            {weekdays.map((w, i) => (
                                <span key={i}>{w}</span>
                            ))}
                        </div>

                        <div className="datepicker-grid">
                            {cells.map((c) => (
                                <button
                                    key={c.date}
                                    type="button"
                                    className={`datepicker-day${c.inMonth ? '' : ' out'}${c.date === today ? ' today' : ''}${c.date === value ? ' selected' : ''}`}
                                    aria-pressed={c.date === value}
                                    onClick={() => pick(c.date)}
                                >
                                    {c.day}
                                </button>
                            ))}
                        </div>

                        <div className="datepicker-foot">
                            <button type="button" className="link-button" onClick={() => pick(today)}>
                                {t('calendar.today')}
                            </button>
                            {clearable && value && (
                                <button type="button" className="link-button muted" onClick={() => pick('')}>
                                    {t('calendar.clear')}
                                </button>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}

// какой месяц показать: месяц выбранной даты, а если даты нет — текущий
function viewOf(value) {
    const d = value ? parseDay(value) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
}

function Chevron({ dir }) {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
        </svg>
    );
}
