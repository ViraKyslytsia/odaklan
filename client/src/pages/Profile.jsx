import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { LanguageButtons } from '../components/LanguageSwitcher';
import RegionPicker from '../components/RegionPicker';
import { useT } from '../i18n/LanguageContext';

const NO_STATUS = { field: '', kind: '' };

export default function Profile() {
    const { signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const { t } = useT();
    const [editing, setEditing] = useState(''); // какое поле сейчас правится: '' | 'name' | 'email'
    const [draft, setDraft] = useState('');
    // field — к какому полю относится сообщение: 'name' | 'email' | 'region'
    const [status, setStatus] = useState(NO_STATUS); // kind: 'saved' | 'error' | 'taken'

    useEffect(() => {
        api.getProfile().then(setProfile).catch(() => { });
    }, []);

    // одна функция сохранения для имени, почты и региона; возвращает true, если получилось
    async function save(data, field) {
        try {
            const updated = await api.updateProfile(data);
            setProfile(updated);
            setStatus({ field, kind: 'saved' });
            return true;
        } catch (err) {
            setStatus({ field, kind: err.status === 409 ? 'taken' : 'error' });
            return false;
        }
    }

    function startEdit(field) {
        setDraft(profile?.[field] || '');
        setEditing(field);
        setStatus(NO_STATUS);
    }

    function cancelEdit() {
        setEditing('');
        setStatus(NO_STATUS);
    }

    async function commitEdit(field) {
        if (await save({ [field]: draft.trim() }, field)) setEditing('');
    }

    function note(field) {
        if (status.field !== field) return null;
        if (status.kind === 'saved') return <p className="profile-ok">{t('profile.saved')}</p>;
        if (status.kind === 'taken') return <p className="form-error">{t('profile.emailTaken')}</p>;
        if (status.kind === 'error') return <p className="form-error">{t('profile.error')}</p>;
        return null;
    }

    // одна и та же строка для имени и почты: значение + «Изменить», в режиме правки — поле + «Сохранить»/«Отмена»
    function renderField(field, labelKey, inputType) {
        const current = profile?.[field] || '';
        const unchanged = draft.trim().toLowerCase() === current.toLowerCase();
        const canSave = Boolean(draft.trim()) && !unchanged;
        return (
            <div className="field">
                <label htmlFor={`p-${field}`}>{t(labelKey)}</label>
                {editing === field ? (
                    <div className="profile-row">
                        <input id={`p-${field}`} className="input" type={inputType} value={draft} autoFocus
                            maxLength={field === 'name' ? 60 : undefined}
                            onChange={(e) => { setDraft(e.target.value); setStatus(NO_STATUS); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && canSave) commitEdit(field);
                                if (e.key === 'Escape') cancelEdit();
                            }} />
                        <button type="button" className="btn btn-primary btn-sm"
                            disabled={!canSave} onClick={() => commitEdit(field)}>
                            {t('common.save')}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                            {t('common.cancel')}
                        </button>
                    </div>
                ) : (
                    <div className="input profile-box">
                        <span className="profile-row-value">{current}</span>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(field)}>
                            {t('profile.change')}
                        </button>
                    </div>
                )}
                {note(field)}
            </div>
        );
    }

    return (
        <div className="card profile-card">
            <h1 style={{ marginTop: 0, fontSize: 'var(--fs-xl)' }}>{t('profile.title')}</h1>

            {renderField('name', 'profile.name', 'text')}
            {renderField('email', 'profile.email', 'email')}

            <RegionPicker
                value={profile?.settings?.region}
                onSelect={(region) => save({ settings: { region } }, 'region')}
            />
            {note('region')}

            <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{t('profile.language')}</p>
            <div style={{ marginBottom: 24 }}><LanguageButtons /></div>
            <button className="btn btn-secondary" onClick={signOut}>{t('profile.logout')}</button>
        </div>
    );
}