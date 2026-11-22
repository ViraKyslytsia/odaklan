// Локальная дата в формате YYYY-MM-DD (так её ждёт сервер)
export function todayStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
// 3725 → "1 ч 2 мин" (подписи единиц приходят из переводов)
export function formatStudied(totalSeconds, hourLabel, minuteLabel) {
    const minutes = Math.floor((totalSeconds || 0) / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} ${hourLabel} ${m} ${minuteLabel}` : `${m} ${minuteLabel}`;
}
// 3725 → "1:02:05" (как на фото: часы:минуты:секунды)
export function formatHMS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
// Сдвиг даты YYYY-MM-DD на n дней (n может быть отрицательным): 2026-11-30 + 1 → 2026-12-01
export function addDays(str, n) {
    const [y, m, d] = str.split('-').map(Number);
    return todayStr(new Date(y, m - 1, d + n));
}