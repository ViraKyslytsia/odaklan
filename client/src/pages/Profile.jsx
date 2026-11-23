import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { LanguageButtons } from '../components/LanguageSwitcher';
import RegionPicker from '../components/RegionPicker';
import { useT } from '../i18n/LanguageContext';
import PageArt from '../components/PageArt';
import { useToast } from '../context/ToastContext';
const NO_STATUS = { field: '', kind: '' };
const NICKNAME_RE = /^[\p{L}\p{N}_.]{3,20}$/u; // те же правила, что на сервере
const TEAM_EMAIL = 'verakislisa@gmail.com';
const TEAM_TELEGRAM = 'virakyslytsia';

// карточки возможностей в блоке «О нас»: тексты берутся из about.<key> и about.<key>Text
const ABOUT_FEATURES = [
    { icon: '⏱️', key: 'timer' },
    { icon: '✅', key: 'tasks' },
    { icon: '📅', key: 'schedule' },
    { icon: '🎯', key: 'exams' },
];

export default function Profile() {
    const { signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const { t } = useT();
    const toast = useToast();
    const [editing, setEditing] = useState(''); // какое поле сейчас правится: '' | 'name' | 'email'
    const [draft, setDraft] = useState('');
    // field — к какому полю относится сообщение: 'name' | 'email' | 'region'
    const [status, setStatus] = useState(NO_STATUS); // kind: 'saved' | 'error' | 'taken'
    // результат последней проверки на сервере: для какого значения и свободно ли оно (null: проверить не удалось)
    const [nickCheck, setNickCheck] = useState({ value: '', available: null });
    useEffect(() => {
        api.getProfile().then(setProfile).catch((err) => toast.apiError(err, 'toast.loadError'));
    }, [toast]);
    // проверяем никнейм на сервере через полсекунды после последней введённой буквы
    useEffect(() => {
        if (editing !== 'nickname') return;
        const value = draft.trim().toLowerCase();
        if (!NICKNAME_RE.test(value) || value === (profile?.nickname || '').toLowerCase()) return;
        const timer = setTimeout(() => {
            api.checkNickname(value)
                .then((r) => setNickCheck({ value, available: r.available }))
                .catch(() => setNickCheck({ value, available: null }));
        }, 500);
        return () => clearTimeout(timer);
    }, [editing, draft, profile?.nickname]);
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
        if (status.kind === 'taken') return <p className="form-error">{t(field === 'nickname' ? 'profile.nicknameTaken' : 'profile.emailTaken')}</p>;
        if (status.kind === 'error') return <p className="form-error">{t('profile.error')}</p>;
        return null;
    }

    // одна и та же строка для имени и почты: значение + «Изменить», в режиме правки — поле + «Сохранить»/«Отмена»
    function renderField(field, labelKey, inputType) {
        // что показать под полем никнейма
        const nickValue = draft.trim().toLowerCase();
        let nickKind = 'idle';
        if (editing === 'nickname' && nickValue && nickValue !== (profile?.nickname || '').toLowerCase()) {
            if (!NICKNAME_RE.test(nickValue)) nickKind = 'invalid';
            else if (nickCheck.value !== nickValue) nickKind = 'checking';
            else if (nickCheck.available === null) nickKind = 'error';
            else nickKind = nickCheck.available ? 'free' : 'taken';
        }

        function nickHint() {
            const map = {
                free: ['profile-ok', 'profile.nicknameFree'],
                taken: ['form-error', 'profile.nicknameTaken'],
                invalid: ['form-error', 'profile.nicknameInvalid'],
                error: ['form-error', 'profile.nicknameCheckError'],
                checking: ['', 'profile.nicknameChecking'],
            };
            const item = map[nickKind];
            return item ? <p className={item[0]}>{t(item[1])}</p> : null;
        }
        const current = profile?.[field] || '';
        const unchanged = draft.trim().toLowerCase() === current.toLowerCase();
        const canSave = Boolean(draft.trim()) && !unchanged && (field !== 'nickname' || nickKind === 'free');
        return (
            <div className="field">
                <label htmlFor={`p-${field}`}>{t(labelKey)}</label>
                {editing === field ? (
                    <div className="profile-row">
                        <input id={`p-${field}`} className="input" type={inputType} value={draft} autoFocus
                            maxLength={field === 'name' ? 60 : field === 'nickname' ? 20 : undefined}
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
                        <span className="profile-row-value">{current || '—'}</span>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(field)}>
                            {t('profile.change')}
                        </button>
                    </div>
                )}
                {note(field)}
                {field === 'nickname' && editing === 'nickname' && nickHint()}
            </div>
        );
    }

    return (
        <div className="profile-page">
            <aside className="card about-card">
                <h2 className="about-name">Odaklan</h2>
                <p className="about-meaning">{t('about.meaning')}</p>
                <p className="about-text">{t('about.text')}</p>

                <ul className="about-features">
                    {ABOUT_FEATURES.map(({ icon, key }) => (
                        <li key={key} className="about-feature">
                            <span className="about-feature-icon" aria-hidden="true">{icon}</span>
                            <span className="about-feature-title">{t(`about.${key}`)}</span>
                            <span className="about-feature-text">{t(`about.${key}Text`)}</span>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className="card profile-card">
                <h1 className="page-title"><PageArt name="profile" size={56} /><span>{t('profile.title')}</span></h1>

                {renderField('name', 'profile.name', 'text')}
                {renderField('nickname', 'profile.nickname', 'text')}
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

            <section className="card profile-info-card">
                <h2 className="profile-info-title">{t('team.title')}</h2>
                <p className="profile-info-text">{t('team.text')}</p>
                <a className="profile-mail" href={`mailto:${TEAM_EMAIL}`}>{TEAM_EMAIL}</a>
                <a className="profile-mail" href={`https://t.me/${TEAM_TELEGRAM}`} target="_blank" rel="noopener noreferrer">
                    @{TEAM_TELEGRAM}
                </a>
            </section>
        </div>
    );
}