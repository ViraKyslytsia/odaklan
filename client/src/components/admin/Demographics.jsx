import { useEffect, useState } from 'react';
import { api } from '../../api';

function Rows({ rows }) {
    const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
    const max = Math.max(...rows.map((r) => r.count), 1);
    return (
        <ol className="admin-rank admin-rank-compact">
            {rows.map((r) => (
                <li key={r.label} className="admin-rank-row">
                    <span className="admin-rank-who">{r.label}</span>
                    <span className="admin-rank-bar">
                        <span style={{ width: `${(r.count / max) * 100}%` }} />
                    </span>
                    <span className="admin-rank-time">
                        {r.count} · {Math.round((r.count / total) * 100)}%
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default function Demographics() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminLangRegions()
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) return <p className="form-error">{error}</p>;
    if (!data) return null;

    return (
        <>
            <section className="card">
                <h2 className="admin-section-title">Users by country</h2>
                <Rows rows={data.countries.map((c) => ({ label: c.name || 'Not specified', count: c.count }))} />
            </section>
        </>
    );
}