import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
    const { signOut } = useAuth();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        api.getProfile().then(setProfile).catch(() => { });
    }, []);

    return (
        <div className="card" style={{ maxWidth: 480 }}>
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>Profil</h1>
            <p style={{ margin: 0 }}>{profile?.name}</p>
            <p style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
            <button className="btn btn-secondary" onClick={signOut}>Çıkış yap</button>
        </div>
    );
}