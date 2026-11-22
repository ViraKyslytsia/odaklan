import { useRef, useState } from 'react';
import { useT } from '../i18n/LanguageContext';

// Одна задача дня. Обычную можно переименовать (карандаш) и удалить,
// а пункт чек-листа экзамена (item.fromExam) только отметить: он редактируется на вкладке «Экзамены»
export default function TaskItem({ item, onToggle, onRename, onDelete }) {
    const { t } = useT();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const skipSave = useRef(false); // Esc отменяет правку, хотя поле всё равно теряет фокус

    function startEdit() {
        setDraft(item.title);
        setEditing(true);
    }

    function finish() {
        setEditing(false);
        if (skipSave.current) {
            skipSave.current = false;
            return;
        }
        const title = draft.trim();
        if (title && title !== item.title) onRename(item._id, title);
    }

    function onKeyDown(e) {
        if (e.key === 'Enter') e.currentTarget.blur(); // сохранение произойдёт в onBlur
        if (e.key === 'Escape') {
            skipSave.current = true;
            e.currentTarget.blur();
        }
    }

    return (
        <li className="task-item" style={{ '--task-color': item.color || 'var(--text-dim)' }}>
            <button
                type="button"
                className={`task-check${item.completed ? ' checked' : ''}`}
                role="checkbox"
                aria-checked={item.completed}
                aria-label={item.title}
                onClick={() => onToggle(item)}
            />

            {editing ? (
                <input
                    className="input task-edit"
                    value={draft}
                    maxLength={120}
                    autoFocus
                    aria-label={t('tasks.edit')}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={finish}
                />
            ) : (
                <span className={`task-title${item.completed ? ' done' : ''}`}>{item.title}</span>
            )}

            {item.tag && !editing && <span className="task-tag">{item.tag}</span>}

            {!item.fromExam && !editing && (
                <div className="task-actions">
                    <button type="button" className="task-act" aria-label={t('tasks.edit')} onClick={startEdit}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />
                        </svg>
                    </button>
                    <button type="button" className="task-act danger" aria-label={t('common.delete')} onClick={() => onDelete(item._id)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
            )}
        </li>
    );
}
