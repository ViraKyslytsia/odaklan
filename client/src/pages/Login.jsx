import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { setPendingEmail } from '../utils/pendingEmail';

export default function Login() {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const email = form.email.trim().toLowerCase();
            const { token } = await api.login({ email, password: form.password, remember });
            signIn(token, remember);
            navigate('/', { replace: true });
        } catch (err) {
            // 403 = почта ещё не подтверждена: отправляем на ввод кода
            if (err.status === 403) {
                const email = form.email.trim().toLowerCase();
                setPendingEmail(email);
                api.resend({ email }).catch(() => { });
                navigate('/verify');
                return;
            }
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Giriş yap" subtitle="Tekrar hoş geldin!">
            <form onSubmit={onSubmit}>
                <div className="field">
                    <label htmlFor="email">E-posta</label>
                    <input id="email" name="email" type="email" className="input" value={form.email}
                        onChange={onChange} autoComplete="username" required />
                </div>
                <div className="field">
                    <label htmlFor="password">Şifre</label>
                    <input id="password" name="password" type="password" className="input"
                        value={form.password} onChange={onChange} autoComplete="current-password"
                        required />
                </div>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Beni hatırla</span>
                </label>
                {error && <p className="form-error">{error}</p>}

                <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
                </button>
            </form>
            <p className="auth-footer">
                Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
            </p>
        </AuthLayout>
    );
}