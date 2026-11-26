import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../components/AuthLayout';
import { useT } from '../i18n/LanguageContext';
import { setPendingEmail } from '../utils/pendingEmail';

export default function Register() {
    const { t } = useT();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function onSubmit(e) {
        e.preventDefault();
        setError('');

        if (form.password.length < 6) {
            setError(t('register.passwordMin'));
            return;
        }

        setLoading(true);
        try {
            const email = form.email.trim().toLowerCase();
            await api.register({ name: form.name.trim(), email, password: form.password });
            setPendingEmail(email);
            navigate('/verify');
        } catch (err) {
            setError(err.status === 0 ? t('toast.network') : err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title={t('register.title')} subtitle={t('register.subtitle')}>
            <form onSubmit={onSubmit}>
                <div className="field">
                    <label htmlFor="name">{t('field.name')}</label>
                    <input id="name" name="name" className="input" value={form.name}
                        onChange={onChange} autoComplete="name" required />
                </div>
                <div className="field">
                    <label htmlFor="email">{t('field.email')}</label>
                    <input id="email" name="email" type="email" className="input" value={form.email}
                        onChange={onChange} autoComplete="username" required />
                </div>
                <div className="field">
                    <label htmlFor="password">{t('field.password')}</label>
                    <input id="password" name="password" type="password" className="input"
                        value={form.password} onChange={onChange} autoComplete="new-password"
                        placeholder={t('register.passwordHint')} required />
                </div>

                {error && <p className="form-error">{error}</p>}

                <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? t('register.loading') : t('register.submit')}
                </button>
            </form>
            <p className="auth-footer">
                {t('register.haveAccount')} <Link to="/login">{t('register.toLogin')}</Link>
            </p>
        </AuthLayout>
    );
}