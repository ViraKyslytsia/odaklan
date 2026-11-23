import { api } from '../api';

// «Я в приложении» для друзей. Раз в 30 секунд шлём пинг; во время таймера фокуса пометка «учится».
const INTERVAL_MS = 30000;

let studying = false;
let timerId = null;

function ping() {
    // свёрнутую вкладку онлайн не считаем, кроме случая, когда в ней идёт таймер
    if (document.hidden && !studying) return;
    api.sendPresence(studying).catch(() => {});
}

// возвращает функцию остановки (для useEffect)
export function startPresence() {
    ping();
    timerId = setInterval(ping, INTERVAL_MS);
    const onVisible = () => {
        if (!document.hidden) ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
        clearInterval(timerId);
        timerId = null;
        studying = false;
        document.removeEventListener('visibilitychange', onVisible);
    };
}

// вызывается таймером: сразу сообщаем, что начали или закончили учиться
export function setStudying(value) {
    if (studying === value) return;
    studying = value;
    if (timerId !== null) ping();
}
