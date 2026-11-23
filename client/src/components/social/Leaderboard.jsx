import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n/LanguageContext';
import { formatStudied, todayStr } from '../../utils/date';
import DayNav from '../DayNav';
import { Avatar, EmptyText, StatusBadge } from './Common';

const REFRESH_MS = 30000;
const MEDALS = ['🥇', '🥈', '🥉'];

// Рейтинг за день: среди друзей или внутри выбранной группы
export default function Leaderboard({ groups, scope, onScopeChange, onOpenUser }) {
    const { t } = useT();
    const toast = useToast();
    const [date, setDate] = useState(todayStr());
    const [data, setData] = useState(null);

    // выбранную группу удалили или мы из неё вышли: возвращаемся к друзьям
    const groupId = groups.some((g) => g.id === scope) ? scope : '';

    const load = useCallback(
        (silent) =>
            api.getLeaderboard(date, groupId).then(setData).catch((err) => {
                if (!silent) toast.apiError(err, 'social.loadError');
            }),
        [date, groupId, toast]
    );

    useEffect(() => {
        setData(null);
        load(false);
        // «учится сейчас» обновляется само, пока страница открыта
        const id = setInterval(() => {
            if (!document.hidden) load(true);
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [load]);

    const entries = data?.entries ?? [];
    const max = Math.max(...entries.map((e) => e.seconds), 1);
    const ranked = entries.some((e) => e.seconds > 0);

    return (
        <section>
            <div className="soc-toolbar">
                <select
                    className="input soc-select"
                    value={groupId}
                    onChange={(e) => onScopeChange(e.target.value)}
                    aria-label={t('social.scope')}
                >
                    <option value="">{t('social.scopeFriends')}</option>
                    {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <DayNav date={date} onChange={setDate} />
            </div>

            {data && entries.length <= 1 && !groupId && (
                <EmptyText>{t('social.noFriendsRating')}</EmptyText>
            )}
            {data && !ranked && entries.length > 1 && <EmptyText>{t('social.noStudyToday')}</EmptyText>}

            <ol className="soc-list">
                {entries.map((e, i) => (
                    <li key={e.id} className={`soc-row${e.isMe ? ' me' : ''}`}>
                        <span className="soc-rank">{ranked && e.seconds > 0 && i < 3 ? MEDALS[i] : i + 1}</span>
                        <Avatar name={e.nickname} />
                        <div className="soc-row-main">
                            <div className="soc-row-top">
                                <button
                                    type="button"
                                    className="soc-name"
                                    onClick={() => onOpenUser(e)}
                                >
                                    {e.nickname}
                                    {e.isMe && <span className="soc-you">{t('social.you')}</span>}
                                </button>
                                <StatusBadge status={e.status} />
                            </div>
                            <span className="soc-bar" aria-hidden="true">
                                <span style={{ width: `${(e.seconds / max) * 100}%` }} />
                            </span>
                        </div>
                        <span className="soc-time">
                            {e.seconds > 0 ? formatStudied(e.seconds, t('unit.h'), t('unit.m')) : '—'}
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
