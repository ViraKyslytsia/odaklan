import { useEffect, useState } from 'react';

// Текущее время, которое обновляется каждую секунду: на нём держится живой отсчёт
export function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}