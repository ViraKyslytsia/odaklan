import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/LanguageContext';

const ToastContext = createContext(null);

const MAX_TOASTS = 4;
const DURATION = { success: 3500, error: 6000 }; // мс до автозакрытия

export function ToastProvider({ children }) {
    const { t } = useT();
    const [toasts, setToasts] = useState([]);
    const live = useRef(new Map()); // id -> { key, timer }
    const nextId = useRef(1);

    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    const dismiss = useCallback((id) => {
        const item = live.current.get(id);
        if (item) clearTimeout(item.timer);
        live.current.delete(id);
        setToasts((list) => list.filter((x) => x.id !== id));
    }, []);

    const push = useCallback(
        (type, message) => {
            if (!message) return;
            const key = `${type}:${message}`;

            const schedule = (id) => {
                const item = live.current.get(id);
                clearTimeout(item.timer);
                item.timer = setTimeout(() => dismiss(id), DURATION[type]);
            };

            // такой же тост уже на экране: продлеваем его, а не дублируем
            for (const [id, item] of live.current) {
                if (item.key === key) {
                    schedule(id);
                    return;
                }
            }

            const id = nextId.current++;
            live.current.set(id, { key, timer: null });
            schedule(id);
            setToasts((list) => [...list, { id, type, message }]);
            if (live.current.size > MAX_TOASTS) dismiss(live.current.keys().next().value);
        },
        [dismiss]
    );

    useEffect(() => {
        const items = live.current;
        return () => items.forEach((item) => clearTimeout(item.timer));
    }, []);

    const value = useMemo(
        () => ({
            success: (message) => push('success', message),
            error: (message) => push('error', message),
            apiError: (err, key = 'toast.actionError') => {
                if (err?.status === 401) return; // api/client.js сам разлогинит
                const text =
                    err?.status === 0
                        ? tRef.current('toast.network')
                        : tRef.current(key, { message: err?.message ?? '' });
                push('error', text);
            },
            dismiss,
        }),
        [push, dismiss]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-region" aria-live="polite">
                {toasts.map((x) => (
                    <div
                        key={x.id}
                        className={`toast toast-${x.type}`}
                        role={x.type === 'error' ? 'alert' : 'status'}
                    >
                        <span className="toast-msg">{x.message}</span>
                        <button
                            type="button"
                            className="toast-close"
                            aria-label={t('common.close')}
                            onClick={() => dismiss(x.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);