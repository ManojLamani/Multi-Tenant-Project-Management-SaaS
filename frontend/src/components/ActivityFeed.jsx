import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ActivityFeed({ projectId, version, team = [] }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    function describe(field, value) {
        if (value == null) return 'None';
        if (field === 'assignedTo') return team.find(member => member._id === value)?.name || 'Former team member';
        if (field === 'dueDate') return String(value).slice(0, 10);
        return String(value);
    }
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        api.get(`/projects/${projectId}/activity`).then(response => {
            if (active) setEvents(response.data);
        }).catch(() => {
            if (active) setError('Could not load recent activity.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [projectId, version, retry]);
    return <section className="create-section" aria-label="Recent activity">
        <h3>Recent activity</h3>
        <p>Latest 50 task changes in this project.</p>
        {loading ? <p role="status">Loading activity…</p> : error ? <div role="alert">{error} <button className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry activity</button></div> :
            !events.length ? <p>No task activity yet.</p> : <ol className="activity-feed">{events.map(event => <li key={event._id}>
                <p><strong>{event.actor?.name || 'Former team member'}</strong> {event.action} <strong>{event.taskTitle}</strong></p>
                {event.changes.filter(change => change.field !== 'completedBy').map(change => <p key={change.field}>{({ assignedTo: 'Assignee', dueDate: 'Due date' })[change.field] || change.field}: {describe(change.field, change.from)} → {describe(change.field, change.to)}</p>)}
                <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
            </li>)}</ol>}
    </section>;
}
