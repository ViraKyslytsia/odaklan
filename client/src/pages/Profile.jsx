import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { LanguageButtons } from '../components/LanguageSwitcher';
import { useT } from '../i18n/LanguageContext';

export default function Profile() {
    const { signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const {t} = useT();

    useEffect(() => {
        api.getProfile().then(setProfile).catch(() => { });
    }, []);

    return (
        <div className="card" style={{ maxWidth: 480 }}>
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>{t('profile.title')}</h1>
            <p style={{ margin: 0 }}>{profile?.name}</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{t('profile.language')}: {profile?.language}</p>
            <div style={{ marginBottom: 24 }}><LanguageButtons /></div>
            <button className="btn btn-secondary" onClick={signOut}>{t('profile.logout')}</button>
        </div>
    );
}