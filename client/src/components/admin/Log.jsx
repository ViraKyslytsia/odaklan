import { useEffect, useState } from 'react';
import { api } from '../../api';
import Pager from './Pager';
import { fmtDate } from './format';

const LABELS = {
    block: 'Block',
    unblock: 'Unblock',
    delete: 'Delete',
    delete_group: 'Delete group',
    remove_member: 'Remove member',
    announce: 'Announcement',
    delete_announcement: 'Delete announcement',
};

export default function Log() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminLogs({ page })
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [page]);

    if (error) return <p className="form-error">{error}</p>;
    if (!data) return <p className="form-note">Loading…</p>;

    return (
        <section className="card">
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.logs.map((l) => (
                            <tr key={l.id}>
                                <td>{fmtDate(l.at)}</td>
                                <td>{l.adminEmail}</td>
                                <td><span className={`admin-badge ${l.action}`}>{LABELS[l.action]}</span></td>
                                <td>
                                    {l.targetName}
                                    <span className="admin-sub">{l.targetEmail}</span>
                                </td>
                                <td>{l.reason || '—'}</td>
                            </tr>
                        ))}
                        {data.logs.length === 0 && (
                            <tr><td colSpan="5">No admin actions yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pager page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </section>
    );
}