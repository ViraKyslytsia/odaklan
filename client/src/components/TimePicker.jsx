import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';

const POP_W = 300;
const GAP = 8;
const MARGIN = 8;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const STEP_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad2 = (n) => String(n).padStart(2, '0');
const format = (h, m) => `${pad2(h)}:${pad2(m)}`;

// «HH:MM» → { h, m } или null, если строка не похожа на время
function parseTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h < 24 && m < 60 ? { h, m } : null;
}

// Свой выбор времени вместо системного <input type="time">, в том же стиле, что и DatePicker.
// value и onChange работают со строкой «HH:MM» (24 часа), как и родной input.
export default function TimePicker({ value, onChange, id, placeholder, className = '', title, ariaLabel }) {
    const { t } = useT();
    const triggerRef = useRef(null);
    const popRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const time = parseTime(value);
    const nowHour = new Date().getHours();

    // минуты идут с шагом 5; если у экзамена «нестандартная» минута (например, 07), добавляем её в сетку,
    // чтобы она была видна и выбрана
    const minutes =
        time && !STEP_MINUTES.includes(time.m) ? [...STEP_MINUTES, time.m].sort((a, b) => a - b) : STEP_MINUTES;

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
    }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        // capture + stopPropagation: Esc закрывает только выбор времени, а не окно экзамена под ним
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

    function close() {
        setOpen(false);
        triggerRef.current?.focus();
    }

    // час выбираем, не закрывая окно: следом обычно нужны минуты
    function pickHour(h) {
        onChange(format(h, time?.m ?? 0));
    }

    // минуты — последний шаг, после них окно закрывается
    function pickMinute(m) {
        onChange(format(time?.h ?? 9, m));
        close();
    }

    function pickNow() {
        const d = new Date();
        onChange(format(d.getHours(), d.getMinutes()));
        close();
    }

    const label = time ? format(time.h, time.m) : placeholder;

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`input datepicker-trigger ${className}${time ? '' : ' empty'}`}
                title={title}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <span>{label}</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5V12l3 2" />
                </svg>
            </button>

            {open &&
                createPortal(
                    <div ref={popRef} className="datepicker-pop" role="dialog" aria-label={t('time.pick')} style={{ top: pos.top, left: pos.left, width: POP_W }}>
                        <div className="datepicker-head timepicker-head">
                            <span className="datepicker-title timepicker-title">{time ? format(time.h, time.m) : '--:--'}</span>
                        </div>

                        <div className="timepicker-label">{t('time.hours')}</div>
                        <div className="datepicker-grid timepicker-grid">
                            {HOURS.map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    className={`datepicker-day${h === nowHour ? ' today' : ''}${h === time?.h ? ' selected' : ''}`}
                                    aria-pressed={h === time?.h}
                                    onClick={() => pickHour(h)}
                                >
                                    {pad2(h)}
                                </button>
                            ))}
                        </div>

                        <div className="timepicker-label">{t('time.minutes')}</div>
                        <div className="datepicker-grid timepicker-grid">
                            {minutes.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`datepicker-day${m === time?.m ? ' selected' : ''}`}
                                    aria-pressed={m === time?.m}
                                    onClick={() => pickMinute(m)}
                                >
                                    {pad2(m)}
                                </button>
                            ))}
                        </div>

                        <div className="datepicker-foot">
                            <button type="button" className="link-button" onClick={pickNow}>
                                {t('time.now')}
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
