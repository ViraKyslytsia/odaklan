import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n/LanguageContext';
import { SUBJECT_COLORS } from '../theme/palette';
import { fromLocalInputs, toLocalInputs } from '../utils/countdown';
import Palette from './Palette';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

// Окно экзамена: и создание, и редактирование (если передан exam)
export default function ExamModal({ exam, subjects, onSave, onDelete, onClose }) {
    const { t } = useT();
    const initial = exam ? toLocalInputs(exam.date) : { date: '', time: '09:00' };
    const [title, setTitle] = useState(exam?.title || '');
    const [subject, setSubject] = useState(exam?.subject || '');
    const [color, setColor] = useState(exam?.color || SUBJECT_COLORS[0]);
    const [date, setDate] = useState(initial.date);
    const [time, setTime] = useState(initial.time);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // выбрали предмет: цвет экзамена подстраивается под него (потом его всё равно можно поменять)
    function pickSubject(id) {
        setSubject(id);
        const found = subjects.find((s) => s._id === id);
        if (found) setColor(found.color);
    }

    async function submit(e) {
        e.preventDefault();
        if (!title.trim() || !date || busy) return;
        setBusy(true);
        setError('');
        try {
            await onSave({
                title: title.trim(),
                subject: subject || null,
                color,
                date: fromLocalInputs(date, time),
            });
        } catch (err) {
            setError(t('exams.error', { message: err.message }));
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
                <h2 className="modal-title">{t(exam ? 'exams.editTitle' : 'exams.newTitle')}</h2>

                <div className="field">
                    <label htmlFor="exam-title">{t('exams.name')}</label>
                    <input
                        id="exam-title"
                        className="input"
                        value={title}
                        maxLength={80}
                        autoFocus
                        placeholder={t('exams.namePlaceholder')}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="field">
                    <label htmlFor="exam-subject">{t('exams.subject')}</label>
                    <select
                        id="exam-subject"
                        className="input"
                        value={subject}
                        onChange={(e) => pickSubject(e.target.value)}
                    >
                        <option value="">{t('exams.noSubject')}</option>
                        {subjects.map((s) => (
                            <option key={s._id} value={s._id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <span className="field-hint">{t('exams.subjectHint')}</span>
                </div>

                <div className="field">
                    <label>{t('exams.color')}</label>
                    <Palette value={color} onPick={setColor} label={t('exams.color')} />
                </div>

                <div className="exam-when">
                    <div className="field">
                        <label htmlFor="exam-date">{t('exams.date')}</label>
                   <DatePicker id="exam-date" value={date} onChange={setDate} placeholder={t('calendar.pick')} />
            
                    </div>
                    <div className="field">
                        <label htmlFor="exam-time">{t('exams.time')}</label>
                        <TimePicker id="exam-time" value={time} onChange={setTime} placeholder={t('time.pick')} />
                    </div>
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!title.trim() || !date || busy}>
                        {t('common.save')}
                    </button>
                </div>

                {exam && (
                    <button type="button" className="link-button exam-delete" onClick={() => onDelete(exam)}>
                        {t('exams.delete')}
                    </button>
                )}
            </form>
        </div>,
        document.body
    );
}
