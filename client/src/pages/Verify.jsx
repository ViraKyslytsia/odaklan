import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/LanguageContext';
import { clearPendingEmail, getPendingEmail } from '../utils/pendingEmail';

const RESEND_SECONDS = 60;

export default function Verify() {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const { t } = useT();
    const email = getPendingEmail();

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(RESEND_SECONDS);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    if (!email) return <Navigate to="/register" replace />;

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const { token } = await api.verify({ email, code });
            clearPendingEmail();
            signIn(token);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.status === 0 ? t('toast.network') : err.message);
        } finally {
            setLoading(false);
        }
    }

    async function onResend() {
        setError('');
        setInfo('');
        try {
            await api.resend({ email });
            setInfo(t('verify.resent'));
            setCooldown(RESEND_SECONDS);
        } catch (err) {
            setError(err.status === 0 ? t('toast.network') : err.message);
        }
    }

    return (
        <AuthLayout title={t('verify.title')} subtitle={t('verify.subtitle', { email })}>
            <form onSubmit={onSubmit}>
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

                {error && <p className="form-error">{error}</p>}
                {info && <p className="form-note">{info}</p>}

                <button className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
                    {loading ? t('verify.loading') : t('verify.submit')}
                </button>
            </form>
            <p className="auth-footer">
                <button className="link-button" onClick={onResend} disabled={cooldown > 0}>
                    {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
                </button>
            </p>
        </AuthLayout>
    );
}