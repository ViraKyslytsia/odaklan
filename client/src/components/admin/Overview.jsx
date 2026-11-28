import { useEffect, useState } from 'react';
import { api } from '../../api';
import LineChart from '../LineChart';
import Demographics from './Demographics';
import { dayLabel, fmtDayLong, fmtDuration } from './format';

const formatTick = (min) => (min >= 60 && min % 60 === 0 ? `${min / 60} h` : `${min} min`);

function Tile({ label, value }) {
    return (
        <div className="admin-tile">
            <span className="admin-tile-label">{label}</span>
            <span className="admin-tile-value">{value}</span>
        </div>
    );
}

// столбики: ось слева, пунктирные линии, число над столбиком, подписи дат раз в неделю
function SignupChart({ items }) {
    const max = Math.max(...items.map((i) => i.count), 1);
    const top = Math.max(2, max % 2 ? max + 1 : max); // чётная верхняя граница, чтобы середина оси была целой
    const ticks = [top, top / 2, 0];
    const total = items.reduce((sum, i) => sum + i.count, 0);

    return (
        <>
            <p className="admin-chart-total">{total} new in the last {items.length} days</p>
            <div className="admin-chart" role="img" aria-label="Registrations per day">
                <div className="admin-chart-axis">
                    {ticks.map((t) => (
                        <span key={t}>{t}</span>
                    ))}
                </div>
                <div className="admin-chart-plot">
                    <div className="admin-chart-area">
                        <div className="admin-chart-grid">
                            {ticks.map((t) => (
                                <i key={t} />
                            ))}
                        </div>
                        <div className="admin-chart-bars">
                            {items.map((i) => (
                                <div key={i.date} className="admin-chart-col" title={`${fmtDayLong(i.date)}: ${i.count}`}>
                                    {i.count > 0 && <em>{i.count}</em>}
                                    <span style={{ height: `${(i.count / top) * 100}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="admin-chart-labels">
                        {items.map((i, idx) => (
                            <span key={i.date}>
                                <b>{dayLabel(i.date, idx, items.length)}</b>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

// рейтинг по времени учёбы: топ-5, по кнопке весь список
function Ranking({ rows }) {
    const [all, setAll] = useState(false);
    const shown = all ? rows : rows.slice(0, 5);
    const max = Math.max(...rows.map((r) => r.seconds), 1);

    return (
        <>
            <ol className="admin-rank">
                {shown.map((r, i) => (
                    <li key={r.id} className="admin-rank-row">
                        <span className="admin-rank-pos">{i + 1}</span>
                        <span className="admin-rank-who">
                            {r.name}
                            <span className="admin-sub">{r.email}</span>
                        </span>
                        <span className="admin-rank-bar">
                            <span style={{ width: `${(r.seconds / max) * 100}%` }} />
                        </span>
                        <span className="admin-rank-time">{fmtDuration(r.seconds)}</span>
                    </li>
                ))}
            </ol>
            {rows.length > 5 && (
                <button className="btn btn-secondary admin-rank-more" onClick={() => setAll(!all)}>
                    {all ? 'Show top 5' : `Show all (${rows.length})`}
                </button>
            )}
        </>
    );
}

export default function Overview() {
    const [data, setData] = useState(null);
    const [charts, setCharts] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([api.adminOverview(), api.adminCharts(30)])
            .then(([overview, chartData]) => {
                if (cancelled) return;
                setData(overview);
                setCharts(chartData);
            })
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, []);

    if (error) return <p className="form-error">{error}</p>;
    if (!data || !charts) return <p className="form-note">Loading…</p>;

    const u = data.users;
    const studyItems = charts.study.map((d, i) => ({
        value: d.seconds,
        label: dayLabel(d.date, i, charts.study.length),
        tip: fmtDayLong(d.date),
    }));

    return (
        <>
            <div className="admin-tiles">
                <Tile label="Users" value={u.total} />
                <Tile label="New, 7 days" value={u.new7} />
                <Tile label="New, 30 days" value={u.new30} />
                <Tile label="Online now" value={u.onlineNow} />
                <Tile label="Studying now" value={u.studyingNow} />
                <Tile label="Active today" value={u.active24h} />
                <Tile label="Active, 7 days" value={u.active7d} />
                <Tile label="Blocked" value={u.blocked} />
                <Tile label="Total study time" value={fmtDuration(data.study.totalSeconds)} />
                <Tile label="Study sessions" value={data.study.sessions} />
            </div>

            <section className="card">
                <h2 className="admin-section-title">Study time per day (30 days)</h2>
                <LineChart
                    items={studyItems}
                    color="#a78bfa"
                    formatValue={fmtDuration}
                    formatTick={formatTick}
                    ariaLabel="Study time per day"
                />
            </section>

            <section className="card">
                <h2 className="admin-section-title">Registrations per day</h2>
                <SignupChart items={charts.signups} />
            </section>

            <section className="card">
                <h2 className="admin-section-title">Study time ranking</h2>
                {data.top.length === 0 ? (
                    <p className="form-note">No study sessions yet</p>
                ) : (
                    <Ranking rows={data.top} />
                )}
            </section>

            <Demographics />
        </>
    );
}