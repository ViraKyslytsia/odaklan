import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children }) {
    return (
        <div className="auth-page">
            <div className="card auth-card">
                <Logo />
                <h1 className="auth-title">{title}</h1>
                {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
}