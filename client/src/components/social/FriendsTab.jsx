import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n/LanguageContext';
import ConfirmDialog from '../ConfirmDialog';
import { Avatar, EmptyText, StatusBadge } from './Common';

// Друзья: поиск по никнейму, заявки, список друзей и заблокированных
export default function FriendsTab({ overview, reload, onOpenUser }) {
    const { t } = useT();
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [confirm, setConfirm] = useState(null); // { kind: 'remove' | 'block', user }
    const [busy, setBusy] = useState(false);

    const q = query.trim();

    // поиск с небольшой задержкой, чтобы не слать запрос на каждую букву
    useEffect(() => {
        if (q.length < 2) {
            setResults([]);
            setSearched(false);
            return undefined;
        }
        let cancelled = false;
        const id = setTimeout(() => {
            api.searchUsers(q)
                .then((list) => {
                    if (cancelled) return;
                    setResults(list);
                    setSearched(true);
                })
                .catch((err) => !cancelled && toast.apiError(err, 'social.loadError'));
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(id);
        };
    }, [q, overview, toast]);

    async function run(action) {
        if (busy) return;
        setBusy(true);
        try {
            await action();
            await reload();
        } catch (err) {
            toast.apiError(err, 'social.actionError');
        } finally {
            setBusy(false);
        }
    }

    const sendRequest = (id) => run(() => api.sendFriendRequest(id));

    async function onConfirm() {
        const { kind, user } = confirm;
        setConfirm(null);
        await run(() => (kind === 'block' ? api.blockUser(user.id) : api.removeFriend(user.id)));
    }

    function relationButton(u) {
        if (u.relation === 'friend') return <span className="soc-tag">{t('social.relFriend')}</span>;
        if (u.relation === 'outgoing') return <span className="soc-tag">{t('social.relSent')}</span>;
        if (u.relation === 'incoming') {
            return (
                <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                    onClick={() => run(() => api.acceptFriendRequest(u.id))}>
                    {t('social.accept')}
                </button>
            );
        }
        return (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => sendRequest(u.id)}>
                {t('social.add')}
            </button>
        );
    }

    const { friends, incoming, outgoing, blocked } = overview;

    return (
        <section>
            <div className="field">
                <label htmlFor="soc-search">{t('social.search')}</label>
                <input
                    id="soc-search"
                    className="input"
                    type="search"
                    autoComplete="off"
                    maxLength={20}
                    placeholder={t('social.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {q.length >= 2 && searched && (
                <ul className="soc-list soc-search-results">
                    {results.length === 0 && <EmptyText>{t('social.searchEmpty')}</EmptyText>}
                    {results.map((u) => (
                        <li key={u.id} className="soc-row">
                            <Avatar name={u.nickname} />
                            <span className="soc-row-main"><span className="soc-name static">{u.nickname}</span></span>
                            {relationButton(u)}
                        </li>
                    ))}
                </ul>
            )}

            {incoming.length > 0 && (
                <>
                    <h3 className="soc-subtitle">{t('social.incoming')} <span className="section-count">{incoming.length}</span></h3>
                    <ul className="soc-list">
                        {incoming.map((u) => (
                            <li key={u.id} className="soc-row">
                                <Avatar name={u.nickname} />
                                <span className="soc-row-main"><span className="soc-name static">{u.nickname}</span></span>
                                <div className="soc-actions">
                                    <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                                        onClick={() => run(() => api.acceptFriendRequest(u.id))}>{t('social.accept')}</button>
                                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                        onClick={() => run(() => api.cancelFriendRequest(u.id))}>{t('social.decline')}</button>
                                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                        onClick={() => setConfirm({ kind: 'block', user: u })}>{t('social.block')}</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <h3 className="soc-subtitle">{t('social.friends')} <span className="section-count">{friends.length}</span></h3>
            {friends.length === 0 ? (
                <EmptyText>{t('social.friendsEmpty')}</EmptyText>
            ) : (
                <ul className="soc-list">
                    {friends.map((u) => (
                        <li key={u.id} className="soc-row">
                            <Avatar name={u.nickname} />
                            <div className="soc-row-main">
                                <span className="soc-name static">{u.nickname}</span>
                                <StatusBadge status={u.status} />
                            </div>
                            <div className="soc-actions">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenUser(u)}>
                                    {t('social.monthStats')}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => setConfirm({ kind: 'remove', user: u })}>{t('social.remove')}</button>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => setConfirm({ kind: 'block', user: u })}>{t('social.block')}</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {outgoing.length > 0 && (
                <>
                    <h3 className="soc-subtitle">{t('social.outgoing')} <span className="section-count">{outgoing.length}</span></h3>
                    <ul className="soc-list">
                        {outgoing.map((u) => (
                            <li key={u.id} className="soc-row">
                                <Avatar name={u.nickname} />
                                <span className="soc-row-main"><span className="soc-name static">{u.nickname}</span></span>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => run(() => api.cancelFriendRequest(u.id))}>{t('social.cancelRequest')}</button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {blocked.length > 0 && (
                <>
                    <h3 className="soc-subtitle">{t('social.blocked')} <span className="section-count">{blocked.length}</span></h3>
                    <ul className="soc-list">
                        {blocked.map((u) => (
                            <li key={u.id} className="soc-row">
                                <Avatar name={u.nickname} />
                                <span className="soc-row-main"><span className="soc-name static">{u.nickname}</span></span>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                                    onClick={() => run(() => api.unblockUser(u.id))}>{t('social.unblock')}</button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {confirm && (
                <ConfirmDialog
                    title={t(confirm.kind === 'block' ? 'social.blockTitle' : 'social.removeTitle')}
                    text={t(confirm.kind === 'block' ? 'social.blockText' : 'social.removeText', { name: confirm.user.nickname })}
                    confirmLabel={t(confirm.kind === 'block' ? 'social.block' : 'social.remove')}
                    onConfirm={onConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </section>
    );
}
