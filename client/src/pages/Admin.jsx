import { useState } from 'react';
import Content from '../components/admin/Content';
import Groups from '../components/admin/Groups';
import Logins from '../components/admin/Logins';
import Overview from '../components/admin/Overview';
import Study from '../components/admin/Study';
import Users from '../components/admin/Users';
import Announcements from '../components/admin/Announcements';
import Log from '../components/admin/Log';

const TABS = [
    { id: 'overview', label: 'Overview', Component: Overview },
    { id: 'users', label: 'Users', Component: Users },
    { id: 'study', label: 'Study', Component: Study },
    { id: 'logins', label: 'Logins', Component: Logins },
    { id: 'content', label: 'Content', Component: Content },
    { id: 'groups', label: 'Groups', Component: Groups },
    { id: 'announcements', label: 'Announcements', Component: Announcements },
    { id: 'log', label: 'Admin log', Component: Log },];

export default function Admin() {
    const [tab, setTab] = useState('overview');
    const { Component } = TABS.find((x) => x.id === tab);

    return (
        <div className="admin-page">
            <h1 className="admin-title">Admin panel</h1>
            <div className="admin-tabs">
                {TABS.map((x) => (
                    <button
                        key={x.id}
                        className={`admin-tab${tab === x.id ? ' active' : ''}`}
                        onClick={() => setTab(x.id)}
                    >
                        {x.label}
                    </button>
                ))}
            </div>
            <Component />
        </div>
    );
}