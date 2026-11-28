export function fmtDuration(seconds) {
    const s = Math.floor(seconds || 0);
    if (s > 0 && s < 60) return `${s} s`;
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h} h ${m % 60} min` : `${m} min`;
}

export function fmtDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export function ago(value) {
    if (!value) return 'never';
    const min = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h ago`;
    return `${Math.floor(h / 24)} d ago`;
}
// 'YYYY-MM-DD' -> '28 Nov'
export function fmtDay(key) {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', timeZone: 'UTC',
    });
}

// 'YYYY-MM-DD' -> 'Sat, 28 Nov 2026' (для подсказок при наведении)
export function fmtDayLong(key) {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
}

// подпись под графиком: раз в 7 дней, считая от последнего дня
export function dayLabel(key, index, total) {
    return (total - 1 - index) % 7 === 0 ? fmtDay(key) : '';
}