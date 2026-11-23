// Небольшие анимированные иллюстрации для заголовков страниц.
// Рисуются кодом (SVG), цвета берутся из палитры приложения, анимации описаны в styles/page-art.css
const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

const ART = {
    // расписание: календарь, блоки занятий по очереди «загораются»
    schedule: (
        <>
            <rect x="14" y="18" width="36" height="32" rx="6" className="pa-stroke" />
            <path d="M14 28h36M23 13v8M41 13v8" className="pa-stroke" />
            <rect x="20" y="33" width="9" height="6" rx="2" className="pa-fill pa-blink pa-d0" />
            <rect x="34" y="33" width="9" height="6" rx="2" className="pa-fill pa-blink pa-d1" />
            <rect x="20" y="42" width="9" height="4" rx="2" className="pa-fill pa-blink pa-d2" />
        </>
    ),

    // задачи: чек-лист, галочки рисуются одна за другой
    tasks: (
        <>
            <rect x="15" y="13" width="34" height="38" rx="6" className="pa-stroke" />
            {[0, 1, 2].map((i) => (
                <g key={i}>
                    <path
                        d={`M21 ${24 + i * 9}l3 3 5-6`}
                        pathLength="1"
                        className="pa-check"
                        style={{ animationDelay: `${i * 0.5}s` }}
                    />
                    <path d={`M34 ${26 + i * 9}h9`} className="pa-stroke-soft" />
                </g>
            ))}
        </>
    ),

    // статистика: столбики то растут, то опускаются
    stats: (
        <>
            <path d="M13 50h38" className="pa-stroke-soft" />
            <rect x="18" y="31" width="8" height="19" rx="2" className="pa-fill pa-bar pa-d0" />
            <rect x="29" y="21" width="8" height="29" rx="2" className="pa-fill pa-bar pa-d1" />
            <rect x="40" y="13" width="8" height="37" rx="2" className="pa-fill pa-bar pa-d2" />
        </>
    ),

    // экзамены: часы с идущими стрелками (обратный отсчёт)
    exams: (
        <>
            <circle cx="32" cy="35" r="18" className="pa-stroke" />
            <path d="M27 11h10M32 11v6" className="pa-stroke" />
            <path d="M32 35V25" className="pa-stroke-soft pa-hand pa-hand-slow" />
            <path d="M32 35l7 4" className="pa-stroke pa-hand pa-hand-fast" />
            <circle cx="32" cy="35" r="2.5" className="pa-fill" />
        </>
    ),

    // музыка: нота и расходящиеся волны
    music: (
        <>
            <path d="M26 44V19l19-5v26" className="pa-stroke" />
            <circle cx="21" cy="45" r="5.5" className="pa-fill" />
            <circle cx="40" cy="41" r="5.5" className="pa-fill" />
            <path d="M51 22c3 3 3 9 0 12" className="pa-stroke-soft pa-wave pa-d0" />
            <path d="M55 18c5 5 5 17 0 22" className="pa-stroke-soft pa-wave pa-d1" />
        </>
    ),

    // настройки: медленно вращающаяся шестерёнка
    settings: (
        <g className="pa-gear">
            {GEAR_TEETH.map((angle) => (
                <rect
                    key={angle}
                    x="29"
                    y="9"
                    width="6"
                    height="10"
                    rx="2"
                    className="pa-fill"
                    transform={`rotate(${angle} 32 32)`}
                />
            ))}
            <circle cx="32" cy="32" r="14" className="pa-stroke" />
            <circle cx="32" cy="32" r="5" className="pa-stroke-soft" />
        </g>
    ),
};

export default function PageArt({ name, size = 56 }) {
    if (!ART[name]) return null;
    return (
        <svg className="page-art" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="pa-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#7c3aed" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#a78bfa" stopOpacity="0.08" />
                </linearGradient>
            </defs>
            <rect x="1" y="1" width="62" height="62" rx="20" fill="url(#pa-bg)" stroke="#a78bfa" strokeOpacity="0.25" />
            {ART[name]}
        </svg>
    );
}