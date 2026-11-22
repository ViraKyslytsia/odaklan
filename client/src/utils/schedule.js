// Вспомогательные функции для расписания

// «09:30» → 570 (минуты от полуночи)
export const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

// 570 → «09:30»
export const toHHMM = (min) => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, min));
    return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

// Названия дней недели на языке интерфейса: индекс 0 = понедельник (1 января 2024 был понедельником)
export function weekdayNames(locale, style = 'short') {
    return Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: style })
    );
}

// Если занятия в один день пересекаются по времени, ставим их рядом (в «дорожки»), а не друг на друга.
// Возвращает занятия с полями start, end (минуты), lane (номер дорожки) и lanes (сколько дорожек в группе).
export function layoutDay(list) {
    const sorted = [...list].sort(
        (a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(a.endTime) - toMin(b.endTime)
    );
    const result = [];
    let cluster = [];
    let clusterEnd = 0;

    const flush = () => {
        const lanes = []; // во сколько минут заканчивается последнее занятие на каждой дорожке
        cluster.forEach((it) => {
            let lane = lanes.findIndex((end) => end <= it.start);
            if (lane === -1) {
                lane = lanes.length;
                lanes.push(0);
            }
            lanes[lane] = it.end;
            it.lane = lane;
        });
        cluster.forEach((it) => {
            it.lanes = lanes.length;
            result.push(it);
        });
        cluster = [];
    };

    sorted.forEach((raw) => {
        const it = { ...raw, start: toMin(raw.startTime), end: toMin(raw.endTime) };
        if (cluster.length && it.start >= clusterEnd) flush();
        cluster.push(it);
        clusterEnd = cluster.length === 1 ? it.end : Math.max(clusterEnd, it.end);
    });
    if (cluster.length) flush();
    return result;
}
