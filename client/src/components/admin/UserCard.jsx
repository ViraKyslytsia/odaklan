import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import ConfirmDialog from '../ConfirmDialog';
import { ago, dayLabel, fmtDate, fmtDayLong, fmtDuration } from './format';
import BarChart from './BarChart';

export default function UserCard({ user, onClose, onChanged }) {
    const [mode, setMode] = useState('view'); // view | block | delete (причина) | confirmDelete
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && mode === 'view') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [mode, onClose]);

    const [study, setStudy] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api.adminUserStudy(user.id)
            .then((d) => !cancelled && setStudy(d))
            .catch(() => !cancelled && setStudy({ byDay: [], bySubject: [] }));
        return () => {
            cancelled = true;
        };
    }, [user.id]);
    async function run(action) {
        setBusy(true);
        setError('');
        try {
            await action();
            onChanged();
            onClose();
        } catch (err) {
            setError(err.message);
            setMode('view');
            setBusy(false);
        }
    }

    const region = user.country ? `${user.country}${user.city ? `, ${user.city}` : ''}` : '—';
    const rows = [
        ['Email', user.email],
        ['Email verified', user.verified ? 'Yes' : 'No'],
        ['Registered', fmtDate(user.createdAt)],
        ['Last login', fmtDate(user.lastLoginAt)],
        ['Last logout', fmtDate(user.lastLogoutAt)],
        ['Last seen', user.lastSeen ? `${fmtDate(user.lastSeen)} (${ago(user.lastSeen)})` : '—'],
        ['Language', user.language ? user.language.toUpperCase() : '—'],
        ['Region', region],
        ['Study time', `${fmtDuration(user.totalSeconds)} in ${user.sessionsCount} sessions`],
    ];

    return createPortal(
        <>
            <div
                className="modal-backdrop"
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget && !busy) onClose();
                }}
            >
                <div className="modal admin-card" role="dialog" aria-modal="true">
                    <h2 className="admin-card-title">{user.nickname || user.name}</h2>
                    {user.isBlocked && (
                        <p className="form-error">
                            Blocked{user.blockedReason ? `: ${user.blockedReason}` : ''}
                        </p>
                    )}

                    <dl className="admin-dl">
                        {rows.map(([k, v]) => (
                            <Fragment key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </Fragment>
                        ))}
                    </dl>

                    <h3 className="admin-card-sub">Study, last 30 days</h3>
                    {!study ? (
                        <p className="form-note">Loading…</p>
                    ) : study.bySubject.length === 0 ? (
                        <p className="form-note">No study sessions in this period</p>
                    ) : (
                        <>
                            <BarChart
                                items={study.byDay.map((d, i) => ({
                                    key: d.date,
                                    value: d.seconds,
                                    label: dayLabel(d.date, i, study.byDay.length),
                                    tip: `${fmtDayLong(d.date)}: ${fmtDuration(d.seconds)}`,
                                }))}
                                formatTick={fmtDuration}
                                ariaLabel="Study time per day"
                            />
                            <ol className="admin-rank admin-rank-compact">
                                {study.bySubject.map((s, i) => (
                                    <li key={i} className="admin-rank-row">
                                        <span className="admin-rank-who">{s.name || 'No subject'}</span>
                                        <span className="admin-rank-bar">
                                            <span
                                                style={{
                                                    width: `${(s.seconds / Math.max(...study.bySubject.map((x) => x.seconds), 1)) * 100}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="admin-rank-time">{fmtDuration(s.seconds)}</span>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                    {error && <p className="form-error">{error}</p>}

                    {mode === 'block' ? (
                        <>
                            <input
                                className="input"
                                placeholder="Reason (optional)"
                                maxLength={200}
                                value={reason}
                                autoFocus
                                onChange={(e) => setReason(e.target.value)}
                            />
                            <div className="admin-card-actions">
                                <button className="btn btn-secondary" onClick={() => setMode('view')} disabled={busy}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    disabled={busy}
                                    onClick={() => run(() => api.adminBlockUser(user.id, reason))}
                                >
                                    Block user
                                </button>
                            </div>
                        </>
                    ) : mode === 'delete' || mode === 'confirmDelete' ? (
                        <>
                            <input
                                className="input"
                                placeholder="Reason for deletion (required)"
                                maxLength={200}
                                value={reason}
                                autoFocus
                                onChange={(e) => setReason(e.target.value)}
                            />
                            <p className="form-note">The reason is saved in the admin log.</p>
                            <div className="admin-card-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setMode('view');
                                        setReason('');
                                    }}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    disabled={busy || !reason.trim()}
                                    onClick={() => setMode('confirmDelete')}
                                >
                                    Delete user
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="admin-card-actions">
                            <button className="btn btn-secondary" onClick={onClose}>Close</button>
                            {user.isBlocked ? (
                                <button
                                    className="btn btn-primary"
                                    disabled={busy}
                                    onClick={() => run(() => api.adminUnblockUser(user.id))}
                                >
                                    Unblock
                                </button>
                            ) : (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setReason('');
                                                    setMode('block');
                                                }}
                                            >
                                    Block
                                </button>
                            )}
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => {
                                            setReason('');
                                            setMode('delete');
                                        }}
                                    >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {mode === 'confirmDelete' && (
                <ConfirmDialog
                    title="Delete this user?"
                    text={`${user.email} and all their data (tasks, exams, study sessions, schedule, friends) will be deleted permanently.`}
                    hint={`Reason: ${reason.trim()}. This cannot be undone. To keep the data, block the user instead.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={() => run(() => api.adminDeleteUser(user.id, reason.trim()))}
                    onCancel={() => setMode('delete')}
                />
            )}
        </>,
        document.body
    );
}