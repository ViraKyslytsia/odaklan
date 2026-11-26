import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../components/AuthLayout';
import { useSlowHint } from '../hooks/useSlowHint';
import { useT } from '../i18n/LanguageContext';

const RESEND_SECONDS = 60;

export default function ForgotPassword() {
    const { t } = useT();
    const navigate = useNavigate();

    const [step, setStep] = useState('email'); // 'email' = вводим почту, 'reset' = вводим код и новый пароль
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const slow = useSlowHint(loading);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const cleanEmail = email.trim().toLowerCase();
    const showError = (err) =>
        setError(err.status === 0 ? t('toast.network') : err.status === 422 ? t('forgot.samePassword') : err.message);

    async function requestCode(e) {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.forgotPassword({ email: cleanEmail });
            setStep('reset');
            setCooldown(RESEND_SECONDS);
        } catch (err) {
            showError(err);
        } finally {
            setLoading(false);
        }
    }

    async function onReset(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.resetPassword({ email: cleanEmail, code, password });
            navigate('/login', { replace: true, state: { passwordChanged: true } });
        } catch (err) {
            showError(err);
        } finally {
            setLoading(false);
        }
    }

    const hint = loading && slow && <p className="form-note">{t('server.waking')}</p>;
    const errorBox = error && <p className="form-error">{error}</p>;

    return (
        <AuthLayout
            title={t('forgot.title')}
            subtitle={step === 'email' ? t('forgot.subtitle') : t('verify.subtitle', { email: cleanEmail })}
        >
            {step === 'email' ? (
                <form onSubmit={requestCode}>
                    <div className="field">
                        <label htmlFor="email">{t('field.email')}</label>
                        <input id="email" type="email" className="input" value={email}
                            onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus required />
                    </div>
                    {hint}
                    {errorBox}
                    <button className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? t('forgot.loading') : t('forgot.send')}
                    </button>
                </form>
            ) : (
                <form onSubmit={onReset}>
                    <div className="field">
                        <input
                            className="input code-input"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="new-password">{t('forgot.newPassword')}</label>
                        <input id="new-password" type="password" className="input" value={password}
                            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                            minLength={6} required />
                    </div>
                    {hint}
                    {errorBox}
                    <button className="btn btn-primary btn-block"
                        disabled={loading || code.length !== 6 || password.length < 6}>
                        {loading ? t('forgot.loading') : t('forgot.submit')}
                    </button>
                    <p className="auth-footer">
                        <button type="button" className="link-button" onClick={() => requestCode()} disabled={cooldown > 0 || loading}>
                            {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
                        </button>
                    </p>
                </form>
            )}
            <p className="auth-footer">
                <Link to="/login">{t('forgot.back')}</Link>
            </p>
        </AuthLayout>
    );
}