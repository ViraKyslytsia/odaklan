import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import ExamCard from '../components/ExamCard';
import ExamHero from '../components/ExamHero';
import ExamModal from '../components/ExamModal';
import ExamStats from '../components/ExamStats';
import { useNow } from '../hooks/useNow';
import { useT } from '../i18n/LanguageContext';

export default function Exams() {
    const { t } = useT();
    const now = useNow(1000);
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null); // null | 'new' | exam
    const [toDelete, setToDelete] = useState(null); // экзамен, удаление которого ждёт подтверждения
    useEffect(() => {
        Promise.all([api.getExams(), api.getSubjects()])
            .then(([e, s]) => {
                setExams(e);
                setSubjects(s);
            })
            .catch((err) => setError(t('exams.error', { message: err.message })))
            .finally(() => setLoading(false));
        // язык не должен перезагружать данные
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s._id, s])), [subjects]);

    // ближайшие сверху, прошедшие (завершённые) отдельным списком: свежие сверху
    const { upcoming, finished } = useMemo(() => {
        const up = exams.filter((e) => new Date(e.date).getTime() > now);
        const done = exams.filter((e) => new Date(e.date).getTime() <= now);
        up.sort((a, b) => new Date(a.date) - new Date(b.date));
        done.sort((a, b) => new Date(b.date) - new Date(a.date));
        return { upcoming: up, finished: done };
    }, [exams, now]);

    const replace = useCallback(
        (updated) => setExams((list) => list.map((e) => (e._id === updated._id ? updated : e))),
        []
    );

    // выполняет запрос и показывает ошибку; возвращает true, если всё прошло
    async function run(action) {
        setError('');
        try {
            await action();
            return true;
        } catch (err) {
            setError(t('exams.error', { message: err.message }));
            return false;
        }
    }

    async function save(data) {
        if (modal && modal !== 'new') {
            const updated = await api.updateExam(modal._id, data);
            replace(updated);
        } else {
            const created = await api.createExam(data);
            setExams((list) => [...list, created]);
        }
        setModal(null);
    }
    // «Удалить» только открывает окно подтверждения, само удаление ниже
    function remove(exam) {
        setToDelete(exam);
    }

    function confirmDelete() {
        const exam = toDelete;
        setToDelete(null);
        run(async () => {
            await api.deleteExam(exam._id);
            setExams((list) => list.filter((e) => e._id !== exam._id));
            setModal(null);
        });
    }

    const addTask = (exam, data) => run(async () => replace(await api.addSubtask(exam._id, data)));
    const toggleTask = (exam, sub) => run(async () => replace(await api.toggleSubtask(exam._id, sub._id)));
    const deleteTask = (exam, sub) => run(async () => replace(await api.deleteSubtask(exam._id, sub._id)));

    const cardProps = {
        now,
        onEdit: setModal,
        onAddTask: addTask,
        onToggleTask: toggleTask,
        onDeleteTask: deleteTask,
    };

    return (
        <>
            <div className="page-head">
                <h1>{t('nav.exams')}</h1>
                {exams.length > 0 && (
                    <button type="button" className="btn btn-primary" onClick={() => setModal('new')}>
                        + {t('exams.add')}
                    </button>
                )}
            </div>

            {error && <p className="form-error">{error}</p>}

            {!loading && exams.length === 0 && (
                <div className="card exam-empty">
                    <h2>{t('exams.emptyTitle')}</h2>
                    <p>{t('exams.emptyText')}</p>
                    <button type="button" className="btn btn-primary" onClick={() => setModal('new')}>
                        + {t('exams.add')}
                    </button>
                </div>
            )}

            {upcoming[0] && (
                <ExamHero exam={upcoming[0]} subject={subjectById[upcoming[0].subject]} now={now} onEdit={setModal} />
            )}

            {upcoming.length > 0 && (
                <section className="exam-section">
                    <div className="section-head">
                        <h2>{t('exams.upcoming')}</h2>
                        <span className="section-count">{upcoming.length}</span>
                    </div>
                    <div className="exam-grid">
                        {upcoming.map((e) => (
                            <ExamCard key={e._id} exam={e} subject={subjectById[e.subject]} {...cardProps} />
                        ))}
                    </div>
                </section>
            )}

            {finished.length > 0 && (
                <section className="exam-section">
                    <div className="section-head">
                        <h2>{t('exams.finished')}</h2>
                        <span className="section-count">{finished.length}</span>
                    </div>
                    <div className="exam-grid">
                        {finished.map((e) => (
                            <ExamCard key={e._id} exam={e} subject={subjectById[e.subject]} finished {...cardProps} />
                        ))}
                    </div>
                </section>
            )}

            {exams.length > 0 && <ExamStats exams={exams} />}

            {modal && (
                <ExamModal
                    exam={modal === 'new' ? null : modal}
                    subjects={subjects}
                    onSave={save}
                    onDelete={remove}
                    onClose={() => setModal(null)}
                />
            )}
            {toDelete && (
                <ConfirmDialog
                    title={t('exams.delete')}
                    text={t('exams.deleteConfirm', { name: toDelete.title })}
                    hint={t('exams.deleteWarning')}
                    confirmLabel={t('common.delete')}
                    onConfirm={confirmDelete}
                    onCancel={() => setToDelete(null)}
                />
            )}
        </>
    );
}
