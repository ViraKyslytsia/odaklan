import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';

const NAV_ITEMS = [
    { to: '/', label: 'Ana sayfa', end: true },
    { to: '/tasks', label: 'Görevler' },
    { to: '/calendar', label: 'Takvim' },
    { to: '/stats', label: 'İstatistik' },
    { to: '/exams', label: 'Sınavlar' },
    { to: '/music', label: 'Müzik' },
    { to: '/profile', label: 'Profil' },
];

export default function AppLayout() {
    return (
        <div className="container">
            <header className="app-header">
                <Logo size={44} />
                <nav className="nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                        >
                            {item.label}
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