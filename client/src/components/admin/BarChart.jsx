// items: [{ key, value, label (подпись под осью, может быть ''), tip (подсказка), text (число над столбиком, необязательно) }]
export default function BarChart({ items, formatTick = String, ariaLabel }) {
    const max = Math.max(...items.map((i) => i.value), 1);
    const ticks = [max, max / 2, 0];

    return (
        <div className="admin-chart" role="img" aria-label={ariaLabel}>
            <div className="admin-chart-axis">
                {ticks.map((t) => (
                    <span key={t}>{formatTick(t)}</span>
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
                            <div key={i.key} className="admin-chart-col" title={i.tip}>
                                {i.text && <em>{i.text}</em>}
                                <span style={{ height: `${(i.value / max) * 100}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="admin-chart-labels">
                    {items.map((i) => (
                        <span key={i.key}>
                            <b>{i.label}</b>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}