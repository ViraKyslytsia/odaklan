import { useEffect, useState } from 'react';
import { api } from '../../api';
import { ago, fmtDate, fmtDuration } from './format';
import ExportButton from './ExportButton';
import UserCard from './UserCard';

const SORTS = [
    ['createdAt', 'Newest first'],
    ['studyTime', 'Most studied'],
    ['lastSeen', 'Last seen'],
];

const FILTERS = [
    ['', 'All users'],
    ['7', 'Inactive 7+ days'],
    ['30', 'Inactive 30+ days'],
];

const LANG_NAMES = { en: 'English', tr: 'Türkçe', ru: 'Русский', uk: 'Українська' };

function StatusBadge({ user }) {
    if (user.isBlocked) return <span className="admin-badge blocked">Blocked</span>;
    if (user.status === 'studying') return <span className="admin-badge studying">Studying</span>;
    if (user.status === 'online') return <span className="admin-badge online">Online</span>;
    return <span className="admin-badge">{ago(user.lastSeen)}</span>;
}

export default function Users() {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState('createdAt');
    const [inactive, setInactive] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    // поиск отправляем с небольшой задержкой, а не на каждую букву
    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        api.adminUsers({ search: query, sort, page, inactive })
            .then((d) => {
                if (cancelled) return;
                // после удаления последней записи страницы возвращаемся на предыдущую
                if (d.page > d.pages) {
                    setPage(d.pages);
                    return;
                }
                setData(d);
                setError('');
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [query, sort, inactive, page, reloadKey]);

    return (
        <section className="card">
            <div className="admin-toolbar">
                <input
                    className="input"
                    placeholder="Search by name, nickname or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="input admin-select"
                    value={sort}
                    onChange={(e) => {
                        setSort(e.target.value);
                        setPage(1);
                    }}
                >
                    {SORTS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <select
                    className="input admin-select"
                    value={inactive}
                    onChange={(e) => {
                        setInactive(e.target.value);
                        setPage(1);
                    }}
                >
                    {FILTERS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <ExportButton load={api.adminExportUsers} />
            </div>

            {error && <p className="form-error">{error}</p>}
            {!data && !error && <p className="form-note">Loading…</p>}

            {data && (
                <>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Registered</th>
                                    <th>Email verified</th>
                                    <th>Region</th>
                                    <th>Language</th>
                                    <th>Last login</th>
                                    <th>Last logout</th>
                                    <th>Status</th>
                                    <th>Study time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((u) => (
                                    <tr key={u.id} className="admin-row-click" onClick={() => setSelected(u)}>
                                        <td>
                                            {u.nickname || u.name}
                                            <span className="admin-sub">{u.email}</span>
                                        </td>
                                        <td>{fmtDate(u.createdAt)}</td>
                                        <td>{u.verified ? 'Yes' : 'No'}</td>
                                        <td>{u.country ? `${u.country}${u.city ? `, ${u.city}` : ''}` : '—'}</td>
                                        <td>{u.language ? LANG_NAMES[u.language] : '—'}</td>
                                        <td>{fmtDate(u.lastLoginAt)}</td>
                                        <td>{fmtDate(u.lastLogoutAt)}</td>
                                        <td><StatusBadge user={u} /></td>
                                        <td>{fmtDuration(u.totalSeconds)}</td>
                                    </tr>
                                ))}
                                {data.users.length === 0 && (
                                    <tr><td colSpan="9">No users found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-pager">
                        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            Back
                        </button>
                        <span>Page {data.page} of {data.pages} · {data.total} users</span>
                        <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                            Next
                        </button>
                    </div>
                </>
            )}
            {selected && (
                <UserCard
                    user={selected}
                    onClose={() => setSelected(null)}
                    onChanged={() => setReloadKey((k) => k + 1)}
                />
            )}
        </section>
    );
}