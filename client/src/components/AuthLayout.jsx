import LanguageMenu from './LanguageSwitcher';
import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="auth-page">
            <LanguageMenu />
            <div className="card auth-card">
                <Logo />
                <h1 className="auth-title">{title}</h1>
                {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
}