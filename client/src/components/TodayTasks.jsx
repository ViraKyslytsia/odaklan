import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';

export default function TodayTasks({ tasks, subjects, onToggle }) {
    const { t } = useT();
    const subjectById = Object.fromEntries(subjects.map((s) => [s._id, s]));
    const doneCount = tasks.filter((task) => task.completed).length;

    return (
        <section>
            <div className="section-head">
                <h2>{t('tasks.today')}</h2>
                <span className="section-count">{doneCount} / {tasks.length}</span>
            </div>

            {tasks.length === 0 ? (
                <div className="task-item empty">
                    {t('tasks.empty')} <Link to="/tasks">{t('tasks.add')}</Link>
                </div>
            ) : (
                <ul className="task-list">
                    {tasks.map((task) => {
                        const subject = subjectById[task.subject];
                        const color = task.color || subject?.color || 'var(--text-dim)';
                        const tag = task.tag || subject?.name;
                        return (
                            <li key={task._id} className="task-item" style={{ '--task-color': color }}>
                                <button
                                    className={`task-check${task.completed ? ' checked' : ''}`}
                                    role="checkbox"
                                    aria-checked={task.completed}
                                    aria-label={task.title}
                                    onClick={() => onToggle(task._id)}
                                />
                                <span className={`task-title${task.completed ? ' done' : ''}`}>
                                    {task.title}
                                </span>
                                {tag && <span className="task-tag">{tag}</span>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}