import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import Logo from './Logo';

const NAV_ITEMS = [
    { to: '/', labelKey: 'nav.home', end: true },
    { to: '/tasks', labelKey: 'nav.tasks' },
    { to: '/stats', labelKey: 'nav.stats' },
    { to: '/exams', labelKey: 'nav.exams' },
    { to: '/music', labelKey: 'nav.music' },
    { to: '/profile', labelKey: 'nav.profile' },
];

export default function AppLayout() {
    const { t, lang } = useT();
    const { pathname } = useLocation();
    const navRef = useRef(null);
    const [edges, setEdges] = useState({ left: false, right: false });

    // где в меню ещё есть что прокручивать: там показываем плавное затухание края
    const updateEdges = useCallback(() => {
        const el = navRef.current;
        if (!el) return;
        setEdges({
            left: el.scrollLeft > 4,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        });
    }, []);

    useEffect(() => {
        const el = navRef.current;
        updateEdges();

        // колесо мыши прокручивает меню вбок
        const onWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
            e.preventDefault();
            el.scrollBy({ left: e.deltaY, behavior: 'instant' });
        };

        const observer = new ResizeObserver(updateEdges);
        observer.observe(el);
        el.addEventListener('scroll', updateEdges, { passive: true });
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', updateEdges);
            el.removeEventListener('wheel', onWheel);
        };
    }, [updateEdges, lang]);

    // активная вкладка плавно подъезжает в видимую область
    useEffect(() => {
        navRef.current
            ?.querySelector('.nav-link.active')
            ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, [pathname, lang]);

    return (
        <div className="container">
            <header className="app-header">
                <Logo size={44} />
                <nav
                    ref={navRef}
                    className={`nav${edges.left ? ' fade-left' : ''}${edges.right ? ' fade-right' : ''}`}
                >
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        >
                            {t(item.labelKey)}
                        </NavLink>
                    ))}
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
}