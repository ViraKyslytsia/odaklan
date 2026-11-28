import { Fragment, useEffect, useState } from 'react';
import { api } from '../../api';
import ConfirmDialog from '../ConfirmDialog';
import { fmtDate, fmtDuration } from './format';

const ROLES = { owner: 'Admin', deputy: 'Deputy', member: 'Member' };
const STATUSES = { online: 'Online', studying: 'Studying', offline: 'Offline' };

function GroupMembers({ id, reloadKey, onRemove }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api.adminGroup(id)
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(err.message));
        return () => {
            cancelled = true;
        };
    }, [id, reloadKey]);

    if (error) return <p className="form-error">{error}</p>;
    if (!data) return <p className="form-note">Loading…</p>;

    return (
        <table className="admin-table">
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Study time</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {data.members.map((m) => (
                    <tr key={m.id}>
                        <td>
                            {m.name}
                            <span className="admin-sub">{m.email}</span>
                        </td>
                        <td>{ROLES[m.role]}</td>
                        <td><span className={`admin-badge ${m.status}`}>{STATUSES[m.status]}</span></td>
                        <td>{fmtDuration(m.totalSeconds)}</td>
                        <td>
                            <button className="btn btn-secondary" onClick={() => onRemove(data, m)}>
                                Remove
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function Groups() {
    const [groups, setGroups] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [toRemove, setToRemove] = useState(null); // { group, member }
    const [removeReason, setRemoveReason] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    async function removeMember() {
        const { group, member } = toRemove;
        const reason = removeReason.trim();
        if (!reason) return;
        setToRemove(null);
        setRemoveReason('');
        setDeleteError('');
        try {
            await api.adminRemoveMember(group.id, member.id, reason);
            setReloadKey((k) => k + 1);
        } catch (err) {
            setDeleteError(err.message);
        }
    }

    async function removeGroup() {
        const id = toDelete.id;
        const reason = deleteReason.trim();
        if (!reason) return;
        setToDelete(null);
        setDeleteReason('');
        setDeleteError('');
        try {
            await api.adminDeleteGroup(id, reason);
            setGroups((list) => list.filter((g) => g.id !== id));
            setOpenId(null);
        } catch (err) {
            setDeleteError(err.message);
        }
    }
    const [error, setError] = useState('');

    useEffect(() => {
        api.adminGroups()
            .then((d) => setGroups(d.groups))
            .catch((err) => setError(err.message));
}, [reloadKey]);
    if (error) return <p className="form-error">{error}</p>;
    if (!groups) return <p className="form-note">Loading…</p>;

    return (
        <section className="card">
            {deleteError && <p className="form-error">{deleteError}</p>}
            {toRemove && (
                <ConfirmDialog
                    title="Remove this member?"
                    text={`${toRemove.member.name} (${toRemove.member.email}) will be removed from "${toRemove.group.name}". Their account and data are not affected.`}
                    hint={
                        toRemove.member.role === 'owner'
                            ? 'This member is the group admin: the deputy (or the next member) becomes the new admin.'
                            : undefined
                    }
                    confirmLabel="Remove"
                    cancelLabel="Cancel"
                    confirmDisabled={!removeReason.trim()}
                    onConfirm={removeMember}
                    onCancel={() => {
                        setToRemove(null);
                        setRemoveReason('');
                    }}
                >
                    <input
                        className="input"
                        style={{ marginTop: 20, marginBottom: 12 }}
                        placeholder="Reason for removal (required)"
                        maxLength={140}
                        value={removeReason}
                        autoFocus
                        onChange={(e) => setRemoveReason(e.target.value)}
                    />
                </ConfirmDialog>
            )}
            {toDelete && (
                <ConfirmDialog
                    title="Delete this group?"
                    text={`"${toDelete.name}" will be removed for all ${toDelete.membersCount} members. Their accounts and data are not affected.`}
                    hint="This cannot be undone."
                    confirmLabel="Delete group"
                    cancelLabel="Cancel"
                    confirmDisabled={!deleteReason.trim()}
                    onConfirm={removeGroup}
                    onCancel={() => {
                        setToDelete(null);
                        setDeleteReason('');
                    }}
                >
                    <input
                        className="input"
                        style={{ marginTop: 20, marginBottom: 12 }}
                        placeholder="Reason for deletion (required)"
                        maxLength={170}
                        value={deleteReason}
                        autoFocus
                        onChange={(e) => setDeleteReason(e.target.value)}
                    />
                </ConfirmDialog>
            )}
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Group</th>
                            <th>Admin</th>
                            <th>Deputy</th>
                            <th>Members</th>
                            <th>Study time</th>
                            <th>Created</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((g) => (
                            <Fragment key={g.id}>
                                <tr className="admin-row-click" onClick={() => setOpenId(openId === g.id ? null : g.id)}>
                                    <td>{g.name}</td>
                                    <td>{g.owner || '—'}</td>
                                    <td>{g.deputy || '—'}</td>
                                    <td>{g.membersCount}</td>
                                    <td>{fmtDuration(g.totalSeconds)}</td>
                                    <td>{fmtDate(g.createdAt)}</td>
                                    <td className="admin-muted">{openId === g.id ? '▲' : '▼'}</td>
                                </tr>
                                {openId === g.id && (
                                    <tr>
                                        <td colSpan="7" className="admin-details">
                                            <GroupMembers
                                                id={g.id}
                                                reloadKey={reloadKey}
                                                onRemove={(group, member) => {
                                                    setRemoveReason('');
                                                    setToRemove({ group, member });
                                                }}
                                            />
                                            <div className="admin-card-actions">
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => {
                                                        setDeleteReason('');
                                                        setToDelete(g);
                                                    }}
                                                >
                                                    Delete group
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {groups.length === 0 && (
                            <tr><td colSpan="7">No groups yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}