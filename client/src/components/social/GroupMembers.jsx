import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n/LanguageContext';
import ConfirmDialog from '../ConfirmDialog';
import { Avatar, EmptyText, StatusBadge } from './Common';

// Участники группы: друзья/блок прямо из группы, зам админа (назначает только админ), удаление (админ и зам)
export default function GroupMembers({ group, reload, onOpenUser }) {
    const { t } = useT();
    const toast = useToast();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // { kind: 'block' | 'kick', user }

    const load = useCallback(
        () => api.getGroupMembers(group.id).then(setData),
        [group.id]
    );

    useEffect(() => {
        let cancelled = false;
        api.getGroupMembers(group.id)
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && toast.apiError(err, 'social.loadError'));
        return () => {
            cancelled = true;
        };
    }, [group.id, group.membersCount, group.role, toast]);

    async function run(action, { reloadOverview = false } = {}) {
        if (busy) return;
        setBusy(true);
        try {
            await action();
            await load();
            if (reloadOverview) await reload();
        } catch (err) {
            toast.apiError(err, 'social.actionError');
        } finally {
            setBusy(false);
        }
    }

    async function onConfirm() {
        const { kind, user } = confirm;
        setConfirm(null);
        if (kind === 'kick') await run(() => api.removeGroupMember(group.id, user.id), { reloadOverview: true });
        else await run(() => api.blockUser(user.id));
    }

    if (!data) return <p className="soc-empty">…</p>;

    const myRole = data.role;
    const roleLabel = { owner: t('social.roleOwner'), deputy: t('social.roleDeputy') };

    function friendControl(u) {
        if (u.blockedByMe) return null;
        if (u.relation === 'friend') return <span className="soc-tag">{t('social.relFriend')}</span>;
        if (u.relation === 'outgoing') return <span className="soc-tag">{t('social.relSent')}</span>;
        if (u.relation === 'incoming') {
            return (
                <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                    onClick={() => run(() => api.acceptFriendRequest(u.id))}>{t('social.accept')}</button>
            );
        }
        return (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                onClick={() => run(() => api.sendFriendRequest(u.id))}>{t('social.add')}</button>
        );
    }

    const canKick = (u) =>
        !u.isMe && (myRole === 'owner' ? u.role !== 'owner' : myRole === 'deputy' && u.role === 'member');

    return (
        <div className="soc-members">
            {data.members.length === 0 && <EmptyText>{t('social.friendsEmpty')}</EmptyText>}
            <ul className="soc-list">
                {data.members.map((u) => (
                    <li key={u.id} className="soc-row">
                        <Avatar name={u.nickname} />
                        <div className="soc-row-main">
                            <div className="soc-row-top">
                                <span className="soc-name static">
                                    {u.nickname}
                                    {u.isMe && <span className="soc-you">{t('social.you')}</span>}
                                </span>
                                {roleLabel[u.role] && <span className="soc-tag">{roleLabel[u.role]}</span>}
                            </div>
                            <StatusBadge status={u.status} />
                        </div>
                        <div className="soc-actions">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenUser(u)}>
                                {t('social.monthStats')}
                            </button>
                            {!u.isMe && friendControl(u)}
                            {!u.isMe && u.role !== 'owner' && (u.blockedByMe ? (
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => run(() => api.unblockUser(u.id))}>{t('social.unblock')}</button>
                            ) : (
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => setConfirm({ kind: 'block', user: u })}>{t('social.block')}</button>
                            ))}
                            {myRole === 'owner' && !u.isMe && u.role !== 'owner' && (
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => run(() => api.setGroupDeputy(group.id, u.role === 'deputy' ? null : u.id))}>
                                    {u.role === 'deputy' ? t('social.removeDeputy') : t('social.makeDeputy')}
                                </button>
                            )}
                            {canKick(u) && (
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => setConfirm({ kind: 'kick', user: u })}>{t('social.kick')}</button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {confirm && (
                <ConfirmDialog
                    title={t(confirm.kind === 'kick' ? 'social.kickTitle' : 'social.blockTitle')}
                    text={t(confirm.kind === 'kick' ? 'social.kickText' : 'social.blockText', {
                        name: confirm.user.nickname,
                        group: group.name,
                    })}
                    confirmLabel={t(confirm.kind === 'kick' ? 'social.kick' : 'social.block')}
                    onConfirm={onConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}