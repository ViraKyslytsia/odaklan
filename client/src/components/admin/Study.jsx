import { useEffect, useState } from 'react';
import { api } from '../../api';
import BarChart from './BarChart';
import Pager from './Pager';
import Tile from './Tile';
import ExportButton from './ExportButton';
import Heatmap from './Heatmap';
import { fmtDate, fmtDuration } from './format';

const pad = (n) => String(n).padStart(2, '0');

export default function Study() {
    const [summary, setSummary] = useState(null);
    const [list, setList] = useState(null);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        api.adminStudySummary().then(setSummary).catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        let cancelled = false;
        api.adminSessions({ page })
            .then((d) => !cancelled && setList(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [page]);

    if (error) return <p className="form-error">{error}</p>;
    if (!summary || !list) return <p className="form-note">Loading…</p>;

    const best = summary.bestHour;
    const hourItems = summary.hours.map((h) => ({
        key: h.hour,
        value: h.seconds,
        label: h.hour % 3 === 0 ? String(h.hour) : '',
        tip: `${pad(h.hour)}:00 · ${h.sessions} sessions`,
    }));

    return (
        <>
            <div className="admin-tiles">
                <Tile label="Study sessions" value={summary.sessions} />
                <Tile label="Average session" value={fmtDuration(summary.avgSeconds)} />
                <Tile label="Most active hour" value={best === null ? '—' : `${pad(best)}:00–${pad((best + 1) % 24)}:00`} />
            </div>

            <section className="card">
                <h2 className="admin-section-title">Study time by hour of day</h2>
                <BarChart items={hourItems} formatTick={fmtDuration} ariaLabel="Study time by hour" />
            </section>

            <Heatmap />

            <section className="card">
                <div className="admin-section-head">
                    <h2 className="admin-section-title">All study sessions</h2>
                    <ExportButton load={api.adminExportSessions} />
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Day</th>
                                <th>Ended at</th>
                                <th>Duration</th>
                                <th>Subject</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.sessions.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        {s.user ? s.user.name : 'deleted user'}
                                        <span className="admin-sub">{s.user?.email}</span>
                                    </td>
                                    <td>{s.date}</td>
                                    <td>{fmtDate(s.endedAt)}</td>
                                    <td>{fmtDuration(s.seconds)}</td>
                                    <td>{s.subject || '—'}</td>
                                </tr>
                            ))}
                            {list.sessions.length === 0 && (
                                <tr><td colSpan="5">No sessions yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pager page={list.page} pages={list.pages} total={list.total} onChange={setPage} />
            </section>
        </>
    );
}