import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import ConfirmDialog from '../ConfirmDialog';
import { fmtDate } from './format';

const MAX = 500;
const DURATIONS = [
    ['0', 'Until I delete it'],
    ['1', '1 day'],
    ['3', '3 days'],
    ['7', '7 days'],
    ['30', '30 days'],
];

export default function Announcements() {
    const [items, setItems] = useState(null);
    const [text, setText] = useState('');
    const [days, setDays] = useState('7');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [toDelete, setToDelete] = useState(null);

    const load = useCallback(
        () =>
            api
                .adminAnnouncements()
                .then((d) => setItems(d.announcements))
                .catch((err) => setError(err.message)),
        []
    );

    useEffect(() => {
        load();
    }, [load]);

    async function publish() {
        const value = text.trim();
        if (!value) return;
        setBusy(true);
        setError('');
        try {
            await api.adminCreateAnnouncement({ text: value, days: Number(days) });
            setText('');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        const id = toDelete.id;
        setToDelete(null);
        setError('');
        try {
            await api.adminDeleteAnnouncement(id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <>
            <section className="card">
                <h2 className="admin-section-title">New announcement</h2>
                <textarea
                    className="input admin-textarea"
                    rows="3"
                    maxLength={MAX}
                    placeholder="Text that all users will see on the home page"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="admin-toolbar admin-ann-form">
                    <select className="input admin-select" value={days} onChange={(e) => setDays(e.target.value)}>
                        {DURATIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <span className="admin-muted">{text.length}/{MAX}</span>
                    <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={publish}>
                        {busy ? 'Publishing…' : 'Publish'}
                    </button>
                </div>
                {error && <p className="form-error">{error}</p>}
            </section>

            <section className="card">
                <h2 className="admin-section-title">All announcements</h2>
                {!items ? (
                    <p className="form-note">Loading…</p>
                ) : items.length === 0 ? (
                    <p className="form-note">No announcements yet</p>
                ) : (
                    <ul className="admin-ann-list">
                        {items.map((a) => {
                            const expired = a.expiresAt && new Date(a.expiresAt) < new Date();
                            return (
                                <li key={a.id} className={`admin-ann-item${expired ? ' expired' : ''}`}>
                                    <div className="admin-ann-body">
                                        <p>{a.text}</p>
                                        <span className="admin-sub">
                                            {fmtDate(a.createdAt)} ·{' '}
                                            {a.expiresAt ? `${expired ? 'expired' : 'until'} ${fmtDate(a.expiresAt)}` : 'no end date'}
                                        </span>
                                    </div>
                                    <button className="btn btn-danger" onClick={() => setToDelete(a)}>
                                        Delete
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {toDelete && (
                <ConfirmDialog
                    title="Delete this announcement?"
                    text={toDelete.text.length > 120 ? `${toDelete.text.slice(0, 120)}…` : toDelete.text}
                    hint="Users will stop seeing it."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={remove}
                    onCancel={() => setToDelete(null)}
                />
            )}
        </>
    );
}