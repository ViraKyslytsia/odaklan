import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import AuthLayout from '../components/AuthLayout';
import { setPendingEmail } from '../utils/pendingEmail';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function onSubmit(e) {
        e.preventDefault();
        setError('');

        if (form.password.length < 6) {
            setError('Şifre en az 6 karakter olmalı');
            return;
        }

        setLoading(true);
        try {
            const email = form.email.trim().toLowerCase();
            await api.register({ name: form.name.trim(), email, password: form.password });
            setPendingEmail(email);
            navigate('/verify');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Kayıt ol" subtitle="Hesabını oluştur, e-postana kod göndereceğiz.">
            <form onSubmit={onSubmit}>
                <div className="field">
                    <label htmlFor="name">Ad</label>
                    <input id="name" name="name" className="input" value={form.name}
                        onChange={onChange} autoComplete="name" required />
                </div>
                <div className="field">
                    <label htmlFor="email">E-posta</label>
                    <input id="email" name="email" type="email" className="input" value={form.email}
                        onChange={onChange} autoComplete="username" required />
                </div>
                <div className="field">
                    <label htmlFor="password">Şifre</label>
                    <input id="password" name="password" type="password" className="input"
                        value={form.password} onChange={onChange} autoComplete="new-password"
                        placeholder="En az 6 karakter" required />
                </div>

                {error && <p className="form-error">{error}</p>}

                <button className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Gönderiliyor...' : 'Kod gönder'}
                </button>
            </form>
            <p className="auth-footer">
                Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
            </p>
        </AuthLayout>
    );
}