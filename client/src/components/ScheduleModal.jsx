import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';
import { LOCALES } from '../i18n/translations';
import { toHHMM, toMin, weekdayNames } from '../utils/schedule';
import TimePicker from './TimePicker';

// Окно занятия: и создание, и редактирование (если передан item).
// preset — подсказка для нового занятия (день и время, куда кликнули в сетке).
export default function ScheduleModal({ item, preset, subjects, onSave, onDelete, onClose }) {
    const { t, lang } = useT();
    const dayNames = weekdayNames(LOCALES[lang], 'short');
    const [subject, setSubject] = useState(item?.subject || '');
    const [title, setTitle] = useState(item?.title || '');
    const [days, setDays] = useState([item?.dayOfWeek || preset?.dayOfWeek || 1]);
    const [start, setStart] = useState(item?.startTime || preset?.startTime || '09:00');
    const [end, setEnd] = useState(item?.endTime || preset?.endTime || '10:00');
    const [place, setPlace] = useState(item?.place || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // выбрали предмет: если название ещё пустое (или было названием прошлого предмета), подставляем имя предмета
    function pickSubject(id) {
        const prev = subjects.find((s) => s._id === subject);
        const next = subjects.find((s) => s._id === id);
        setSubject(id);
        if (next && (!title.trim() || title === prev?.name)) setTitle(next.name);
    }

    // при создании можно отметить несколько дней сразу; у существующего занятия день один
    function toggleDay(d) {
        if (item) {
            setDays([d]);
            return;
        }
        setDays((list) => {
            if (!list.includes(d)) return [...list, d].sort((a, b) => a - b);
            return list.length > 1 ? list.filter((x) => x !== d) : list; // последний день снять нельзя
        });
    }

    // сдвинули начало так, что оно стало позже конца: конец уезжает на час вперёд
    function changeStart(value) {
        setStart(value);
        if (toMin(end) <= toMin(value)) setEnd(toHHMM(toMin(value) + 60));
    }

    async function submit(e) {
        e.preventDefault();
        if (!title.trim() || busy) return;
        if (toMin(end) <= toMin(start)) {
            setError(t('schedule.endBeforeStart'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await onSave(
                {
                    title: title.trim(),
                    subject: subject || null,
                    startTime: start,
                    endTime: end,
                    place: place.trim(),
                },
                days
            );
        } catch (err) {
            setError(t('schedule.error', { message: err.message }));
            setBusy(false);
        }
    }

    return createPortal(
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <form className="modal exam-modal" role="dialog" aria-modal="true" onSubmit={submit}>
                <h2 className="modal-title">{t(item ? 'schedule.editTitle' : 'schedule.newTitle')}</h2>

                <div className="field">
                    <label htmlFor="sch-subject">{t('schedule.subject')}</label>
                    <select id="sch-subject" className="input" value={subject} onChange={(e) => pickSubject(e.target.value)}>
                        <option value="">{t('schedule.noSubject')}</option>
                        {subjects.map((s) => (
                            <option key={s._id} value={s._id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field">
                    <label htmlFor="sch-title">{t('schedule.name')}</label>
                    <input
                        id="sch-title"
                        className="input"
                        value={title}
                        maxLength={80}
                        autoFocus
                        placeholder={t('schedule.namePlaceholder')}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="field">
                    <label>{t('schedule.day')}</label>
                    <div className="day-chips">
                        {dayNames.map((name, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`day-chip${days.includes(i + 1) ? ' active' : ''}`}
                                aria-pressed={days.includes(i + 1)}
                                onClick={() => toggleDay(i + 1)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    {!item && <span className="field-hint">{t('schedule.daysHint')}</span>}
                </div>

                <div className="schedule-times">
                    <div className="field">
                        <label htmlFor="sch-start">{t('schedule.start')}</label>
                        <TimePicker id="sch-start" value={start} onChange={changeStart} placeholder={t('time.pick')} />
                    </div>
                    <div className="field">
                        <label htmlFor="sch-end">{t('schedule.end')}</label>
                        <TimePicker id="sch-end" value={end} onChange={setEnd} placeholder={t('time.pick')} />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="sch-place">{t('schedule.place')}</label>
                    <input
                        id="sch-place"
                        className="input"
                        value={place}
                        maxLength={60}
                        placeholder={t('schedule.placePlaceholder')}
                        onChange={(e) => setPlace(e.target.value)}
                    />
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!title.trim() || busy}>
                        {t('common.save')}
                    </button>
                </div>

                {item && (
                    <button type="button" className="link-button exam-delete" onClick={() => onDelete(item)}>
                        {t('schedule.delete')}
                    </button>
                )}
            </form>
        </div>,
        document.body
    );
}
