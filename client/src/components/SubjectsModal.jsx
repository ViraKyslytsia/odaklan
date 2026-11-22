import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { useT } from '../i18n/LanguageContext';
import { SUBJECT_COLORS } from '../theme/palette';
import ConfirmDialog from './ConfirmDialog';

// Ряд цветных кружков: выбор цвета предмета
function Palette({ value, onPick, label }) {
    const current = (value || '').toLowerCase();
    return (
        <div className="palette" role="radiogroup" aria-label={label}>
            {SUBJECT_COLORS.map((color) => {
                const selected = color.toLowerCase() === current;
                return (
                    <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`swatch${selected ? ' selected' : ''}`}
                        style={{ '--swatch': color }}
                        onClick={() => onPick(color)}
                    />
                );
            })}
        </div>
    );
}

// Одна строка списка: название, цвет, удаление. Изменения сохраняются сразу
function SubjectRow({ subject, onUpdate, onDelete }) {
    const { t } = useT();
    const [name, setName] = useState(subject.name);

    function commitName() {
        const clean = name.trim();
        if (!clean) {
            setName(subject.name);
            return;
        }
        if (clean !== subject.name) onUpdate(subject._id, { name: clean });
    }

    return (
        <div className="subject-row">
            <div className="subject-row-top">
                <input
                    className="input"
                    value={name}
                    maxLength={40}
                    aria-label={t('subjects.namePlaceholder')}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
                <button
                    type="button"
                    className="icon-btn"
                    aria-label={t('subjects.delete')}
                    onClick={() => onDelete(subject)}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
                    </svg>
                </button>
            </div>
            <Palette
                value={subject.color}
                label={t('subjects.color')}
                onPick={(color) => onUpdate(subject._id, { color })}
            />
        </div>
    );
}

export default function SubjectsModal({ subjects, onChange, onClose }) {
    const { t } = useT();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(SUBJECT_COLORS[0]);
    const [toDelete, setToDelete] = useState(null);
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // выполняет действие и показывает ошибку, если сервер её вернул
    async function run(action) {
        setError('');
        try {
            await action();
        } catch (err) {
            setError(t('subjects.error', { message: err.message }));
        }
    }

    function update(id, data) {
        return run(async () => {
            const updated = await api.updateSubject(id, data);
            onChange((list) => list.map((s) => (s._id === id ? updated : s)));
        });
    }

    function remove(subject) {
        setToDelete(subject);
    }

    function confirmDelete() {
        const subject = toDelete;
        setToDelete(null);
        return run(async () => {
            await api.deleteSubject(subject._id);
            onChange((list) => list.filter((s) => s._id !== subject._id));
        });
    }

    async function add(e) {
        e.preventDefault();
        const name = newName.trim();
        if (!name || busy) return;
        setBusy(true);
        await run(async () => {
            const created = await api.createSubject({ name, color: newColor });
            onChange((list) => [...list, created]);
            setNewName('');
        });
        setBusy(false);
    }

    return createPortal(
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="subjects-title">
                <h2 id="subjects-title" className="modal-title">{t('subjects.title')}</h2>

                {subjects.length > 0 && (
                    <div className="subject-rows">
                        {subjects.map((s) => (
                            <SubjectRow key={s._id} subject={s} onUpdate={update} onDelete={remove} />
                        ))}
                    </div>
                )}

                <form className="subject-new" onSubmit={add}>
                    <h3 className="subject-new-title">{t('subjects.newTitle')}</h3>
                    <div className="subject-row-top">
                        <input
                            className="input"
                            value={newName}
                            maxLength={40}
                            placeholder={t('subjects.namePlaceholder')}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={!newName.trim() || busy}>
                            {t('subjects.add')}
                        </button>
                    </div>
                    <Palette value={newColor} label={t('subjects.color')} onPick={setNewColor} />
                </form>

                {error && <p className="form-error">{error}</p>}
                {toDelete && (
                    <ConfirmDialog
                        title={t('subjects.delete')}
                        text={t('subjects.deleteConfirm', { name: toDelete.name })}
                        confirmLabel={t('common.delete')}
                        onConfirm={confirmDelete}
                        onCancel={() => setToDelete(null)}
                    />
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}