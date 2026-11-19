import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Home() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        api.getProfile().then(setProfile).catch(() => { });
    }, []);

    return (
        <div className="card">
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>
                Hoş geldin{profile ? `, ${profile.name}` : ''}!
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
                Burada zamanlayıcı ve bugünün görevleri olacak.
            </p>
        </div>
    );
}