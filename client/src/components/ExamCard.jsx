import { useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import { pad2, parseDay, splitDiff, formatExamDate } from '../utils/countdown';
import { todayStr } from '../utils/date';
import DatePicker from './DatePicker';

// Чип с датой пункта чек-листа: «Сегодня» подсвечиваем, просроченный (и не сделанный) помечаем красным
function DateChip({ date, done, today, locale, t }) {
    if (!date) return null;
    const cls = date === today ? ' today' : date < today && !done ? ' late' : '';
    const text =
        date === today
            ? t('exams.taskToday')
            : parseDay(date).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return <span className={`task-date${cls}`}>{text}</span>;
}

export default function ExamCard({ exam, subject, now, finished, onEdit, onAddTask, onToggleTask, onDeleteTask }) {
    const { t, locale } = useT();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [busy, setBusy] = useState(false);

    const today = todayStr(new Date(now));
    const subtasks = exam.subtasks ?? [];
    const done = subtasks.filter((s) => s.done).length;
    const total = subtasks.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const { days, hours, minutes, seconds } = splitDiff(new Date(exam.date).getTime() - now);

    async function add(e) {
        e.preventDefault();
        const clean = title.trim();
        if (!clean || busy) return;
        setBusy(true);
        const ok = await onAddTask(exam, { title: clean, date: date || null });
        if (ok) {
            setTitle('');
            setDate('');
        }
        setBusy(false);
    }

    return (
        <article className={`card exam-card${finished ? ' finished' : ''}`} style={{ '--exam-color': exam.color }}>
            <header className="exam-card-head">
                <span className="exam-dot" aria-hidden="true" />
                <div className="exam-card-main">
                    <h3 className="exam-card-title">{exam.title}</h3>
                    <p className="exam-card-date">
                        {formatExamDate(exam.date, locale)}
                        {subject && <span className="exam-subject-tag"> · {subject.name}</span>}
                    </p>
                </div>
                <button type="button" className="icon-btn" aria-label={t('exams.edit')} onClick={() => onEdit(exam)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                    </svg>
                </button>
            </header>

            <div className="exam-card-clock">
                {finished ? (
                    <span className="exam-finished-badge">{t('exams.finishedBadge')}</span>
                ) : (
                    <span className="exam-mini-countdown">
                            {days} {t('exams.unitD')} {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
                    </span>
                )}
                <span className="exam-progress-text">
                    {total > 0 ? t('exams.progress', { done, total }) : t('exams.noTasks')}
                </span>
            </div>

            <div className="exam-progress" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
            </div>

            <h4 className="exam-checklist-title">{t('exams.checklist')}</h4>
            {total > 0 && (
                <ul className="exam-tasks">
                    {subtasks.map((s) => (
                        <li key={s._id} className="exam-task">
                            <button
                                type="button"
                                className={`task-check${s.done ? ' checked' : ''}`}
                                style={{ '--task-color': exam.color }}
                                role="checkbox"
                                aria-checked={s.done}
                                aria-label={s.title}
                                onClick={() => onToggleTask(exam, s)}
                            />
                            <span className={`task-title${s.done ? ' done' : ''}`}>{s.title}</span>
                            <DateChip date={s.date} done={s.done} today={today} locale={locale} t={t} />
                            <button
                                type="button"
                                className="icon-btn exam-task-del"
                                aria-label={t('exams.taskDelete')}
                                onClick={() => onDeleteTask(exam, s)}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form className="exam-task-form" onSubmit={add}>
                <input
                    className="input"
                    value={title}
                    maxLength={200}
                    placeholder={t('exams.taskPlaceholder')}
                    aria-label={t('exams.taskPlaceholder')}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <DatePicker
                    className="exam-task-date"
                    value={date}
                    onChange={setDate}
                    placeholder={t('exams.taskDate')}
                    title={t('exams.taskDate')}
                    ariaLabel={t('exams.taskDate')}
                    compact
                    clearable
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim() || busy}>
                    +
                </button>
            </form>
            {date === '' && total === 0 && <p className="field-hint">{t('exams.todayHint')}</p>}
        </article>
    );
}