import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import DayNav from '../components/DayNav';
import TaskItem from '../components/TaskItem';
import { useT } from '../i18n/LanguageContext';
import { parseDay } from '../utils/countdown';
import PageArt from '../components/PageArt';
import { todayStr } from '../utils/date';

export default function Tasks() {
    const { t, locale } = useT();
    const [date, setDate] = useState(todayStr());
    // задачи хранятся вместе с датой, для которой загружены: пока идёт запрос за новый день,
    // старый список не показываем (loaded.date !== date)
    const [loaded, setLoaded] = useState({ date: null, items: [] });
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [adding, setAdding] = useState(false);

    // предметы и экзамены нужны один раз
    useEffect(() => {
        Promise.all([api.getSubjects(), api.getExams()])
            .then(([s, e]) => {
                setSubjects(s);
                setExams(e);
            })
            .catch((err) => setError(t('tasks.error', { message: err.message })));
        // язык не должен перезагружать данные
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // задачи выбранного дня; если день успели сменить, устаревший ответ выбрасываем
    useEffect(() => {
        let ignore = false;
        api.getTasks(date)
            .then((items) => {
                if (!ignore) setLoaded({ date, items });
            })
            .catch((err) => {
                if (!ignore) setError(t('tasks.error', { message: err.message }));
            });
        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const loading = loaded.date !== date;
    const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s._id, s])), [subjects]);

    // изменяем список задач, только если он всё ещё относится к тому дню, в котором запустили действие
    const update = (day, fn) => setLoaded((l) => (l.date === day ? { ...l, items: fn(l.items) } : l));

    // пункты чек-листов экзаменов, назначенные на выбранный день (как на главной)
    const examItems = useMemo(
        () =>
            exams.flatMap((exam) =>
                (exam.subtasks ?? [])
                    .filter((s) => s.date === date)
                    .map((s) => ({
                        _id: s._id,
                        title: s.title,
                        completed: s.done,
                        examId: exam._id,
                        color: exam.color,
                        tag: exam.title,
                        fromExam: true,
                    }))
            ),
        [exams, date]
    );

    const items = [
        ...(loading ? [] : loaded.items).map((task) => ({
            ...task,
            color: subjectById[task.subject]?.color,
            tag: subjectById[task.subject]?.name,
        })),
        ...examItems,
    ];

    // выполняет запрос и показывает ошибку; возвращает true, если всё прошло
    async function run(action) {
        setError('');
        try {
            await action();
            return true;
        } catch (err) {
            setError(t('tasks.error', { message: err.message }));
            return false;
        }
    }

    async function add(e) {
        e.preventDefault();
        const text = title.trim();
        if (!text || adding) return;
        const day = date;
        setAdding(true);
        const ok = await run(async () => {
            const created = await api.createTask({ title: text, date: day, ...(subject ? { subject } : {}) });
            update(day, (list) => [...list, created]);
        });
        if (ok) setTitle('');
        setAdding(false);
    }

    const toggle = (item) =>
        run(async () => {
            if (item.fromExam) {
                const updated = await api.toggleSubtask(item.examId, item._id);
                setExams((list) => list.map((x) => (x._id === updated._id ? updated : x)));
            } else {
                const updated = await api.toggleTask(item._id);
                update(date, (list) => list.map((x) => (x._id === updated._id ? updated : x)));
            }
        });

    const rename = (id, newTitle) =>
        run(async () => {
            const updated = await api.updateTask(id, { title: newTitle });
            update(date, (list) => list.map((x) => (x._id === updated._id ? updated : x)));
        });

    const remove = (id) =>
        run(async () => {
            await api.deleteTask(id);
            update(date, (list) => list.filter((x) => x._id !== id));
        });

    const done = items.filter((i) => i.completed).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const weekday = parseDay(date).toLocaleDateString(locale, { weekday: 'long' });
    const dayTitle = weekday.charAt(0).toLocaleUpperCase(locale) + weekday.slice(1);

    return (
        <>
            <div className="page-head">
                <h1 className="page-title"><PageArt name="tasks" size={56} /><span>{t('nav.tasks')}</span></h1>
            </div>

            <DayNav date={date} onChange={setDate} />

            {error && <p className="form-error">{error}</p>}

            <div className="tasks-layout">
                <form className="card task-add" onSubmit={add}>
                    <div className="task-add-row">
                        <input
                            className="input"
                            value={title}
                            maxLength={120}
                            placeholder={t('tasks.newPlaceholder')}
                            aria-label={t('tasks.newPlaceholder')}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={!title.trim() || adding}>
                            + {t('tasks.add')}
                        </button>
                    </div>

                    {subjects.length > 0 && (
                        <div className="exam-chips" role="group">
                            <button
                                type="button"
                                className={`chip${!subject ? ' active' : ''}`}
                                aria-pressed={!subject}
                                onClick={() => setSubject('')}
                            >
                                {t('tasks.noSubject')}
                            </button>
                            {subjects.map((s) => (
                                <button
                                    key={s._id}
                                    type="button"
                                    className={`chip${subject === s._id ? ' active' : ''}`}
                                    style={{ '--chip-color': s.color }}
                                    aria-pressed={subject === s._id}
                                    onClick={() => setSubject(s._id)}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    )}
                </form>

                <section className="tasks-page-list">
                    <div className="section-head">
                        <h2 className="tasks-day-title">
                            {dayTitle}
                            {date === todayStr() && <span className="today-badge">{t('calendar.today')}</span>}
                        </h2>
                        <span className="section-count">
                            {done} / {items.length}
                        </span>
                    </div>

                    {items.length > 0 && (
                        <div className="tasks-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                            <span style={{ width: `${pct}%` }} />
                        </div>
                    )}

                    {!loading && items.length === 0 ? (
                        <div className="card tasks-empty">
                            <p>{t('tasks.emptyDay')}</p>
                            <p className="field-hint">{t('tasks.emptyHint')}</p>
                        </div>
                    ) : (
                        <ul className="task-list">
                            {items.map((item) => (
                                <TaskItem
                                    key={`${item.fromExam ? 'e' : 't'}-${item._id}`}
                                    item={item}
                                    onToggle={toggle}
                                    onRename={rename}
                                    onDelete={remove}
                                />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}