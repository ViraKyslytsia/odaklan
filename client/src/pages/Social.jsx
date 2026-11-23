import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import FriendsTab from '../components/social/FriendsTab';
import GroupsTab from '../components/social/GroupsTab';
import Leaderboard from '../components/social/Leaderboard';
import MonthModal from '../components/social/MonthModal';
import PageArt from '../components/PageArt';
import { useToast } from '../context/ToastContext';
import { useT } from '../i18n/LanguageContext';

const TABS = ['rating', 'friends', 'groups'];
const REFRESH_MS = 30000;
const EMPTY = { friends: [], incoming: [], outgoing: [], blocked: [], groups: [] };

export default function Social() {
    const { t } = useT();
    const toast = useToast();
    const [tab, setTab] = useState('rating');
    const [scope, setScope] = useState(''); // '' = друзья, иначе id группы
    const [overview, setOverview] = useState(null);
    const [openUser, setOpenUser] = useState(null);

    const reload = useCallback(() => api.getSocial().then(setOverview), []);

    useEffect(() => {
        reload().catch((err) => toast.apiError(err, 'social.loadError'));
        const id = setInterval(() => {
            if (!document.hidden) reload().catch(() => {});
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [reload, toast]);

    const data = overview ?? EMPTY;
    const studyingNow = data.friends.filter((f) => f.status === 'studying').length;

    function openGroup(id) {
        setScope(id);
        setTab('rating');
    }

    return (
        <div className="card social-page">
            <h1 className="page-title"><PageArt name="social" size={56} /><span>{t('social.title')}</span></h1>

            <div className="soc-stats">
                <div className="soc-stat"><strong>{data.friends.length}</strong><span>{t('social.statFriends')}</span></div>
                <div className="soc-stat"><strong>{studyingNow}</strong><span>{t('social.statStudying')}</span></div>
                <div className="soc-stat"><strong>{data.groups.length}</strong><span>{t('social.statGroups')}</span></div>
                {data.incoming.length > 0 && (
                    <div className="soc-stat accent"><strong>{data.incoming.length}</strong><span>{t('social.statRequests')}</span></div>
                )}
            </div>

            <div className="segmented segmented-slide soc-tabs" style={{ '--seg': TABS.indexOf(tab), '--count': TABS.length }}>
                {TABS.map((key) => (
                    <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                        {t(`social.tab.${key}`)}
                    </button>
                ))}
            </div>

            {tab === 'rating' && (
                <Leaderboard groups={data.groups} scope={scope} onScopeChange={setScope} onOpenUser={setOpenUser} />
            )}
            {tab === 'friends' && overview && <FriendsTab overview={overview} reload={reload} onOpenUser={setOpenUser} />}
            {tab === 'groups' && overview && <GroupsTab groups={data.groups} reload={reload} onOpenGroup={openGroup} />}

            {openUser && <MonthModal user={openUser} onClose={() => setOpenUser(null)} />}
        </div>
    );
}
