import { useEffect, useState } from 'react';

// true, если запрос идёт дольше ms миллисекунд (на бесплатном хостинге сервер просыпается около минуты)
export function useSlowHint(active, ms = 4000) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (!active) return undefined;
        const id = setTimeout(() => setSlow(true), ms);
        return () => {
            clearTimeout(id);
            setSlow(false);
        };
    }, [active, ms]);

    return slow;
}