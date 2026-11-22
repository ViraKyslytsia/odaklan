import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { LOCALES, translations } from './translations';

const KEY = 'odaklan_lang';
const DEFAULT_LANG = 'tr';

const LanguageContext = createContext(null);

// Какой язык показать при первом запуске: сохранённый, иначе язык браузера, иначе турецкий
function detectLanguage() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved && translations[saved]) return saved;
    } catch {
        // хранилище недоступно
    }
    const browser = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
    return translations[browser] ? browser : DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(detectLanguage);
    const fadeTimer = useRef(null);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const value = useMemo(() => {
        function setLang(next) {
            if (!translations[next] || next === lang) return;

            const root = document.documentElement;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                root.classList.remove('lang-anim');
                void root.offsetWidth; // перезапускаем анимацию, если язык сменили второй раз подряд
                root.classList.add('lang-anim');
                clearTimeout(fadeTimer.current);
                fadeTimer.current = setTimeout(() => root.classList.remove('lang-anim'), 700);
            }

            setLangState(next);
            try {
                localStorage.setItem(KEY, next);
            } catch {
                // язык будет действовать до перезагрузки
            }
        }
        

        // t('ключ') возвращает текст на текущем языке, t('ключ', { name: 'Vira' }) подставляет {name}
        function t(key, params = {}) {
            const text = translations[lang][key] ?? translations[DEFAULT_LANG][key] ?? key;
            return text.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
        }

        return { lang, setLang, t, locale: LOCALES[lang] };
    }, [lang]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
    return useContext(LanguageContext);
}
