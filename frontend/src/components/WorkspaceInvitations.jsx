import { useEffect, useState } from 'react';
import api from '../services/api';

export default function WorkspaceInvitations() {
    const [email, setEmail] = useState('');
    const [invitations, setInvitations] = useState([]);
    const [generated, setGenerated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [pending, setPending] = useState('');
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError('');
        api.get('/invitations').then(response => { if (active) setInvitations(response.data); })
            .catch(() => { if (active) setLoadError('Could not load invitations.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [refresh]);

    async function create(event) {
        event.preventDefault();
        setPending('create');
        setError('');
        setNotice('');
        setGenerated(null);
        try {
            const { data } = await api.post('/invitations', { email });
            setGenerated({ ...data.invitation, link: `${window.location.origin}/register#invite=${data.token}` });
            setEmail('');
            setRefresh(value => value + 1);
        } catch (failure) { setError(failure.response?.data?.message || 'Could not create the invitation. Please try again.'); }
        finally { setPending(''); }
    }

    async function revoke(invitation) {
        setPending(invitation._id);
        setError('');
        setNotice('');
        try {
            await api.delete(`/invitations/${invitation._id}`);
            if (generated?._id === invitation._id) setGenerated(null);
            setNotice(`Invitation revoked for ${invitation.email}.`);
            setRefresh(value => value + 1);
        } catch (failure) { setError(failure.response?.data?.message || 'Could not revoke this invitation. Please try again.'); }
        finally { setPending(''); }
    }

    async function copy() {
        try { await navigator.clipboard.writeText(generated.link); setNotice('Invitation link copied.'); }
        catch { setNotice('Select the invitation link field and copy it to share.'); }
    }

    return <section className="create-section" aria-label="Workspace invitations">
        <h2>Invite a teammate</h2>
        <p>Create a link for a new teammate's email address. It expires in 7 days and can be used once. Creating another link for the same email invalidates the previous link.</p>
        {error && <p className="feedback" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <form className="create-form" onSubmit={create}>
            <label>Teammate email<input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required /></label>
            <button className="btn-primary" disabled={Boolean(pending)}>{pending === 'create' ? 'Creating invitation…' : 'Create invite link'}</button>
        </form>
        {generated && <div className="invitation-link">
            <p>Share this link privately with <strong>{generated.email}</strong>. Copy it now; it is only shown when created.</p>
            <label>Invitation link<input className="invite-code" readOnly value={generated.link} onFocus={event => event.target.select()} /></label>
            <button className="btn-secondary" onClick={copy}>Copy invite link</button>
            <p>Expires {new Date(generated.expiresAt).toLocaleString()}.</p>
        </div>}
        <h3>Recent invitations</h3><p>Latest 50 invitations.</p>
        {loading ? <p role="status">Loading invitations…</p> : loadError ? <div role="alert">{loadError} <button className="btn-secondary" onClick={() => setRefresh(value => value + 1)}>Retry invitations</button></div> :
            !invitations.length ? <p>No invitations yet.</p> : <ul className="invitation-list">{invitations.map(invitation => {
                const status = invitation.status === 'pending' && Date.parse(invitation.expiresAt) <= Date.now() ? 'expired' : invitation.status;
                return <li key={invitation._id}>
                    <div><strong>{invitation.email}</strong><p>Status: {status} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>
                    {invitation.status === 'pending' && <button className="btn-secondary" disabled={Boolean(pending)} onClick={() => revoke(invitation)}>Revoke invitation for {invitation.email}</button>}
                </li>;
            })}</ul>}
    </section>;
}
