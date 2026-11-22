import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

// Иконка-глобус с выпадающим списком языков: для экранов входа и регистрации
export default function LanguageMenu() {
    const { lang, setLang, t } = useT();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // закрываем список по клику вне него и по Escape
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!ref.current?.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const current = LANGUAGES.find((l) => l.code === lang);

    function choose(code) {
        setLang(code);
        setOpen(false);
    }

    return (
        <div className="lang-menu" ref={ref}>
            <button
                type="button"
                className="lang-trigger"
                onClick={() => setOpen(!open)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('lang.choose')}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
                </svg>
                {current?.label}
            </button>

            {open && (
                <ul className="lang-list" role="listbox">
                    {LANGUAGES.map((l) => (
                        <li key={l.code}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={l.code === lang}
                                className={`lang-option${l.code === lang ? ' active' : ''}`}
                                onClick={() => choose(l.code)}
                            >
                                {l.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Ряд кнопок EN / TR / RU / UA: для вкладки «Профиль»
export function LanguageButtons() {
    const { lang, setLang } = useT();

    return (
        <div
            className="segmented segmented-slide"
            style={{ '--seg': LANGUAGES.findIndex((l) => l.code === lang), '--count': LANGUAGES.length }}
        >
            {LANGUAGES.map((l) => (
                <button
                    key={l.code}
                    type="button"
                    className={l.code === lang ? 'active' : ''}
                    onClick={() => setLang(l.code)}
                >
                    {l.label}
                </button>
            ))}
        </div>
    );
}
