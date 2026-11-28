import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api';
import { fmtDate, fmtDuration } from './format';

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function UserContent({ id }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminUserContent(id)
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (error) return <p className="form-error">{error}</p>;
    if (!data) return <p className="form-note">Loading…</p>;

    return (
        <div className="admin-detail-grid">
            <div className="admin-detail-box">
                <h3>Subjects ({data.subjects.length})</h3>
                <ul className="admin-list">
                    {data.subjects.map((s, i) => (
                        <li key={i}>{s.name} <span className="admin-muted">{fmtDuration(s.studiedSeconds)}</span></li>
                    ))}
                    {data.subjects.length === 0 && <li className="admin-muted">None</li>}
                </ul>
            </div>
            <div className="admin-detail-box">
                <h3>Tasks ({data.tasks.length})</h3>
                <ul className="admin-list">
                    {data.tasks.map((t, i) => (
                        <li key={i}>
                            {t.completed ? '✓' : '○'} {t.title}{' '}
                            <span className="admin-muted">{t.date}{t.subject ? ` · ${t.subject}` : ''}</span>
                        </li>
                    ))}
                    {data.tasks.length === 0 && <li className="admin-muted">None</li>}
                </ul>
            </div>
            <div className="admin-detail-box">
                <h3>Exams ({data.exams.length})</h3>
                <ul className="admin-list">
                    {data.exams.map((e, i) => (
                        <li key={i}>
                            {e.title}{' '}
                            <span className="admin-muted">
                                {fmtDate(e.date)} · checklist {e.subtasksDone}/{e.subtasksTotal}
                            </span>
                        </li>
                    ))}
                    {data.exams.length === 0 && <li className="admin-muted">None</li>}
                </ul>
            </div>
            <div className="admin-detail-box">
                <h3>Schedule ({data.schedule.length})</h3>
                <ul className="admin-list">
                    {data.schedule.map((s, i) => (
                        <li key={i}>
                            {DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime} {s.title}
                            {s.place && <span className="admin-muted"> · {s.place}</span>}
                        </li>
                    ))}
                    {data.schedule.length === 0 && <li className="admin-muted">None</li>}
                </ul>
            </div>
        </div>
    );
}

export default function Content() {
    const [rows, setRows] = useState(null);
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.adminContentSummary()
            .then((d) => setRows(d.users))
            .catch((err) => setError(err.message));
    }, []);

    if (error) return <p className="form-error">{error}</p>;
    if (!rows) return <p className="form-note">Loading…</p>;

    const q = search.trim().toLowerCase();
    const shown = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));

    return (
        <section className="card">
            <div className="admin-toolbar">
                <input
                    className="input"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Tasks</th>
                            <th>Done</th>
                            <th>Open</th>
                            <th>Exams</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((r) => (
                            <Fragment key={r.id}>
                                <tr className="admin-row-click" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                                    <td>
                                        {r.name}
                                        <span className="admin-sub">{r.email}</span>
                                    </td>
                                    <td>{r.tasksTotal}</td>
                                    <td>{r.tasksDone}</td>
                                    <td>{r.tasksOpen}</td>
                                    <td>{r.exams}</td>
                                    <td className="admin-muted">{openId === r.id ? '▲' : '▼'}</td>
                                </tr>
                                {openId === r.id && (
                                    <tr>
                                        <td colSpan="6" className="admin-details">
                                            <UserContent id={r.id} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {shown.length === 0 && (
                            <tr><td colSpan="6">No users found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}