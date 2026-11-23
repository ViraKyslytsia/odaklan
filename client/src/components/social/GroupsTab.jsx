import { useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n/LanguageContext';
import ConfirmDialog from '../ConfirmDialog';
import { EmptyText } from './Common';

// Группы: создать, вступить по коду, открыть рейтинг группы
export default function GroupsTab({ groups, reload, onOpenGroup }) {
    const { t } = useT();
    const toast = useToast();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // группа, которую покидаем или удаляем

    async function run(action, successKey) {
        if (busy) return false;
        setBusy(true);
        try {
            await action();
            await reload();
            if (successKey) toast.success(t(successKey));
            return true;
        } catch (err) {
            const known = err?.status === 404 ? 'social.groupNotFound' : 'social.actionError';
            toast.apiError(err, known);
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function create(e) {
        e.preventDefault();
        if (await run(() => api.createGroup(name.trim()), 'social.groupCreated')) setName('');
    }

    async function join(e) {
        e.preventDefault();
        if (await run(() => api.joinGroup(code.trim()), 'social.groupJoined')) setCode('');
    }

    async function copy(group) {
        try {
            await navigator.clipboard.writeText(group.code);
            toast.success(t('social.codeCopied'));
        } catch {
            // буфер обмена недоступен: код всё равно виден на экране
        }
    }

    async function onConfirm() {
        const group = confirm;
        setConfirm(null);
        await run(() => (group.isOwner && group.membersCount === 1 ? api.deleteGroup(group.id) : api.leaveGroup(group.id)));
    }

    return (
        <section>
            <div className="soc-forms">
                <form onSubmit={create} className="soc-inline-form">
                    <label htmlFor="soc-group-name">{t('social.createGroup')}</label>
                    <div className="soc-inline">
                        <input id="soc-group-name" className="input" maxLength={40} value={name}
                            placeholder={t('social.groupNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
                        <button className="btn btn-primary btn-sm" disabled={busy || name.trim().length < 2}>
                            {t('social.create')}
                        </button>
                    </div>
                </form>

                <form onSubmit={join} className="soc-inline-form">
                    <label htmlFor="soc-group-code">{t('social.joinGroup')}</label>
                    <div className="soc-inline">
                        <input id="soc-group-code" className="input" maxLength={8} value={code}
                            placeholder={t('social.codePlaceholder')} autoCapitalize="characters"
                            onChange={(e) => setCode(e.target.value.toUpperCase())} />
                        <button className="btn btn-primary btn-sm" disabled={busy || code.trim().length !== 8}>
                            {t('social.join')}
                        </button>
                    </div>
                </form>
            </div>

            <h3 className="soc-subtitle">{t('social.groups')} <span className="section-count">{groups.length}</span></h3>
            {groups.length === 0 ? (
                <EmptyText>{t('social.groupsEmpty')}</EmptyText>
            ) : (
                <ul className="soc-list">
                    {groups.map((g) => (
                        <li key={g.id} className="soc-row soc-group-row">
                            <div className="soc-row-main">
                                <span className="soc-name static">{g.name}</span>
                                <span className="soc-group-meta">
                                    {t('social.members', { n: g.membersCount })} ·{' '}
                                    <button type="button" className="soc-code" onClick={() => copy(g)} title={t('social.copyCode')}>
                                        {g.code}
                                    </button>
                                </span>
                            </div>
                            <div className="soc-actions">
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenGroup(g.id)}>
                                    {t('social.openRating')}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setConfirm(g)}>
                                    {g.isOwner && g.membersCount === 1 ? t('common.delete') : t('social.leave')}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {confirm && (
                <ConfirmDialog
                    title={t(confirm.isOwner && confirm.membersCount === 1 ? 'social.deleteGroupTitle' : 'social.leaveTitle')}
                    text={t(confirm.isOwner && confirm.membersCount === 1 ? 'social.deleteGroupText' : 'social.leaveText', { name: confirm.name })}
                    confirmLabel={confirm.isOwner && confirm.membersCount === 1 ? t('common.delete') : t('social.leave')}
                    onConfirm={onConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </section>
    );
}
