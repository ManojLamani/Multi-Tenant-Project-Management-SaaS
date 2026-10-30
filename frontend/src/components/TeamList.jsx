import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

export default function TeamList({ onBack, currentUserRole }) {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [roleError, setRoleError] = useState('');
    const [notice, setNotice] = useState('');
    const [retry, setRetry] = useState(0);
    const [pending, setPending] = useState([]);
    const locks = useRef(new Set());
    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError('');
        api.get('/users').then(response => { if (active) setTeam(response.data); })
            .catch(() => { if (active) setLoadError('Could not load the team. Please try again.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [retry]);

    async function changeRole(member, role) {
        if (locks.current.has(member._id)) return;
        locks.current.add(member._id);
        setPending([...locks.current]);
        setRoleError('');
        setNotice('');
        try {
            const response = await api.put(`/users/${member._id}/role`, { role });
            setTeam(previous => previous.map(user => user._id === member._id ? { ...user, role: response.data.user.role } : user));
            setNotice(`Role updated for ${member.name}.`);
        } catch (error) {
            setRoleError(error.response?.data?.message || 'Could not update the role. The saved role is unchanged.');
        } finally {
            locks.current.delete(member._id);
            setPending([...locks.current]);
        }
    }

    return <section className="fade-in" aria-label="Team management">
        <div className="kanban-header"><div><button className="btn-secondary" onClick={onBack}>← Back to Projects</button><h2>Manage Team Roles</h2></div></div>
        {roleError && <p className="feedback" role="alert">{roleError}</p>}
        {notice && <p role="status">{notice}</p>}
        {loading ? <p role="status">Fetching team records…</p> : loadError ? <div className="feedback" role="alert">{loadError} <button className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry team</button></div> :
            !team.length ? <p>No team members found.</p> : <div className="projects-grid">{team.map(member => <article className="project-card" key={member._id}>
                <h3>{member.name}</h3><p><strong>Email:</strong> {member.email}</p><p><strong>Role:</strong> {member.role}</p>
                {currentUserRole === 'owner' && member.role !== 'owner' && <label>Role for {member.name}
                    <select className="status-select" value={member.role} disabled={pending.includes(member._id)} onChange={event => changeRole(member, event.target.value)}>
                        <option value="member">Member</option><option value="manager">Manager</option>
                    </select>
                </label>}
            </article>)}</div>}
    </section>;
}
