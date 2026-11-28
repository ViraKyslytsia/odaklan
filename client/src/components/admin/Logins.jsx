import { useEffect, useState } from 'react';
import { api } from '../../api';
import Pager from './Pager';
import { ago, fmtDate } from './format';

const TYPES = [
    ['', 'All events'],
    ['login', 'Logins'],
    ['logout', 'Logouts'],
];

export default function Logins() {
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminActivity({ type, page })
            .then((d) => {
                if (cancelled) return;
                setData(d);
                setError('');
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [type, page]);

    return (
        <section className="card">
            <div className="admin-toolbar">
                <select
                    className="input admin-select"
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                        setPage(1);
                    }}
                >
                    {TYPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            {error && <p className="form-error">{error}</p>}
            {!data && !error && <p className="form-note">Loading…</p>}

            {data && (
                <>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>User</th>
                                    <th>Event</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.events.map((e) => (
                                    <tr key={e.id}>
                                        <td>
                                            {fmtDate(e.at)}
                                            <span className="admin-sub">{ago(e.at)}</span>
                                        </td>
                                        <td>
                                            {e.user ? e.user.name : 'deleted user'}
                                            <span className="admin-sub">{e.user?.email}</span>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${e.type === 'login' ? 'online' : 'logout'}`}>
                                                {e.type === 'login' ? 'Login' : 'Logout'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.events.length === 0 && (
                                    <tr><td colSpan="3">No events yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
                </>
            )}
        </section>
    );
}