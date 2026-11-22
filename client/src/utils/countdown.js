import { todayStr } from './date';

export const pad2 = (n) => String(n).padStart(2, '0');

// миллисекунды → дни, часы, минуты, секунды
export function splitDiff(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
    };
}

// ISO-дата экзамена → значения для <input type="date"> и <input type="time"> в местном времени
export function toLocalInputs(iso) {
    const d = new Date(iso);
    return { date: todayStr(d), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` };
}

// значения полей → ISO-строка для сервера
export function fromLocalInputs(date, time) {
    return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function formatExamDate(iso, locale) {
    return new Date(iso).toLocaleString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// «2026-11-21» → Date в местном времени (new Date('YYYY-MM-DD') даёт UTC и может сдвинуть день)
export function parseDay(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}