import { useId, useState } from 'react';

const W = 640;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 30 };
const STEPS = [5, 10, 15, 30, 60, 120, 180, 300, 600, 1200]; // минуты

// красивые значения для оси Y (в минутах): не больше 4 делений
function niceTicks(maxSeconds) {
    const maxMin = Math.max(maxSeconds / 60, 1);
    const step = STEPS.find((s) => maxMin / s <= 4) || STEPS[STEPS.length - 1];
    const count = Math.ceil(maxMin / step);
    return Array.from({ length: count + 1 }, (_, i) => i * step);
}

// плавная кривая, которая не «проваливается» ниже нуля между точками (монотонная кубическая интерполяция)
function smoothPath(pts) {
    const n = pts.length;
    if (n === 0) return '';
    if (n === 1) return `M${pts[0].x} ${pts[0].y}`;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
    const m = [d[0]];
    for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(d[n - 2]);
    for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
            m[i] = 0;
            m[i + 1] = 0;
            continue;
        }
        const a = m[i] / d[i];
        const b = m[i + 1] / d[i];
        const s = a * a + b * b;
        if (s > 9) {
            const tau = 3 / Math.sqrt(s);
            m[i] = tau * a * d[i];
            m[i + 1] = tau * b * d[i];
        }
    }
    let path = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const dx = (pts[i + 1].x - pts[i].x) / 3;
        path += ` C${pts[i].x + dx} ${pts[i].y + m[i] * dx} ${pts[i + 1].x - dx} ${pts[i + 1].y - m[i + 1] * dx} ${pts[i + 1].x} ${pts[i + 1].y}`;
    }
    return path;
}

/**
 * Линейный график со сглаживанием и подсказкой при наведении.
 * items: [{ value (секунды), label (подпись под осью, может быть ''), tip (заголовок подсказки) }]
 */
export default function LineChart({ items, color, formatValue, formatTick, ariaLabel }) {
    const uid = useId().replace(/:/g, '');
    const [hover, setHover] = useState(null);

    const ticks = niceTicks(Math.max(...items.map((i) => i.value), 0));
    const yMax = ticks[ticks.length - 1] * 60;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const x = (i) => PAD.l + (items.length === 1 ? innerW / 2 : (i / (items.length - 1)) * innerW);
    const y = (v) => PAD.t + innerH - (v / yMax) * innerH;

    const pts = items.map((it, i) => ({ x: x(i), y: y(it.value) }));
    const line = smoothPath(pts);
    const baseY = y(0);
    const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].x} ${baseY} L${pts[0].x} ${baseY} Z` : '';

    function onMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const idx = Math.round(((px - PAD.l) / innerW) * (items.length - 1));
        setHover(Math.min(items.length - 1, Math.max(0, idx)));
    }

    const hp = hover !== null ? pts[hover] : null;

    return (
        <div className="chart" style={{ '--chart-color': color }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={ariaLabel}
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
            >
                <defs>
                    <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {ticks.map((min) => (
                    <g key={min}>
                        <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y(min * 60)} y2={y(min * 60)} />
                        <text className="chart-tick" x={PAD.l - 10} y={y(min * 60) + 4} textAnchor="end">
                            {formatTick(min)}
                        </text>
                    </g>
                ))}

                {items.map((it, i) =>
                    it.label ? (
                        <text key={i} className="chart-tick" x={x(i)} y={H - 8} textAnchor="middle">
                            {it.label}
                        </text>
                    ) : null
                )}

                {area && <path d={area} fill={`url(#area-${uid})`} className="chart-area" />}
                <path d={line} className="chart-line" pathLength="1" stroke={color} />

                {hp && (
                    <>
                        <line className="chart-cursor" x1={hp.x} x2={hp.x} y1={PAD.t} y2={baseY} />
                        <circle className="chart-dot" cx={hp.x} cy={hp.y} r="5" fill={color} />
                    </>
                )}
            </svg>

            {hp && (
                <div
                    className="chart-tip"
                    style={{
                        left: `${(hp.x / W) * 100}%`,
                        top: `${(hp.y / H) * 100}%`,
                        '--shift': hover > items.length * 0.7 ? '-100%' : hover < items.length * 0.3 ? '0%' : '-50%',
                    }}
                >
                    <span>{items[hover].tip}</span>
                    <strong>{formatValue(items[hover].value)}</strong>
                </div>
            )}
        </div>
    );
}
