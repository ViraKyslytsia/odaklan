// Список со столбиками: месяцы, годы, предметы. Длина столбика — доля от самого большого значения.
// rows: [{ key, label, seconds, color?, current?, valueText?, delta?, deltaTitle? }]
// capitalize — писать названия с заглавной буквы (месяцы: в ru и uk они приходят строчными)
// delta — изменение в процентах (число) или null; если у строк есть поле delta, справа появляется колонка сравнения.
export default function BarRows({ rows, formatValue, capitalize = false }) {
    const max = Math.max(...rows.map((r) => r.seconds), 1);
    const withDelta = rows.some((r) => 'delta' in r);

    return (
        <ul className={`stats-rows${withDelta ? ' with-delta' : ''}${capitalize ? ' cap' : ''}`}>
            {rows.map((r) => (
                <li key={r.key} className={`stats-row${r.current ? ' current' : ''}`} style={r.color ? { '--row-color': r.color } : undefined}>
                    <span className="stats-row-name">
                        {r.color && <span className="stats-row-dot" aria-hidden="true" />}
                        {r.label}
                    </span>
                    <span className="stats-row-bar" aria-hidden="true">
                        <span style={{ width: `${(r.seconds / max) * 100}%` }} />
                    </span>
                    <span className="stats-row-value">{r.seconds > 0 ? r.valueText ?? formatValue(r.seconds) : '—'}</span>
                    {withDelta && <Delta value={r.delta} title={r.deltaTitle} />}
                </li>
            ))}
        </ul>
    );
}

function Delta({ value, title }) {
    if (value === null || value === undefined) return <span className="stats-delta" />;
    const cls = value > 0 ? ' up' : value < 0 ? ' down' : '';
    const text = value > 0 ? `+${value}%` : value < 0 ? `−${Math.abs(value)}%` : '0%';
    return (
        <span className={`stats-delta${cls}`} title={title}>
            {text}
        </span>
    );
}
