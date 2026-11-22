import { todayStr } from './date';

// Сетка месяца для календаря: всегда 6 недель (42 клетки), неделя начинается с понедельника.
// month: 0-11. Клетки соседних месяцев помечены inMonth: false, чтобы их можно было приглушить.
export function buildMonthGrid(year, month) {
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // сколько клеток до 1-го числа
    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(year, month, 1 - offset + i);
        return { date: todayStr(d), day: d.getDate(), inMonth: d.getMonth() === month };
    });
}

// Листаем месяцы: Date сам переносит через границу года (month = 12 → январь следующего)
export function shiftMonth(year, month, delta) {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
}
