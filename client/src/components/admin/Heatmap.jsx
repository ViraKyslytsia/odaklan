import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api';
import { fmtDuration } from './format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');

export default function Heatmap() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminHeatmap()
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) return <p className="form-error">{error}</p>;
    if (!data) return null;

    return (
        <section className="card">
            <h2 className="admin-section-title">Activity heatmap (day of week × hour)</h2>
            {data.max === 0 ? (
                <p className="form-note">No study sessions yet</p>
            ) : (
                <div className="admin-table-wrap">
                    <div className="admin-heat" role="img" aria-label="Study activity by day of week and hour">
                        <span />
                        {Array.from({ length: 24 }, (_, h) => (
                            <span key={h} className="admin-heat-hour">{h % 3 === 0 ? h : ''}</span>
                        ))}
                        {data.cells.map((row, d) => (
                            <Fragment key={d}>
                                <span className="admin-heat-day">{DAYS[d]}</span>
                                {row.map((sec, h) => (
                                    <i
                                        key={h}
                                        className="admin-heat-cell"
                                        title={`${DAYS[d]} ${pad(h)}:00 · ${fmtDuration(sec)}`}
                                        style={{
                                            background: `color-mix(in srgb, var(--teal) ${Math.round((sec / data.max) * 100)}%, var(--surface-2))`,
                                        }}
                                    />
                                ))}
                            </Fragment>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}