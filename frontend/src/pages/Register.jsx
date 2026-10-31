import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Register = () => {
    const location = useLocation();
    const linkedInvitation = new URLSearchParams(location.hash.slice(1)).get('invite') || '';
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [orgMode, setOrgMode] = useState(linkedInvitation ? 'join' : 'create');
    const [orgInput, setOrgInput] = useState(linkedInvitation);

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload = {
                name,
                email,
                password
            };

            if (orgMode === 'create') {
                payload.organizationName = orgInput;
            } else {
                let token = orgInput.trim();
                try {
                    const link = new URL(token);
                    token = new URLSearchParams(link.hash.slice(1)).get('invite') || '';
                } catch { /* A raw invitation code is also accepted. */ }
                if (!/^[a-f0-9]{64}$/i.test(token)) {
                    setError('Paste a valid invitation link or 64-character invitation code from the workspace owner.');
                    return;
                }
                payload.inviteToken = token.toLowerCase();
            }

            await api.post('/auth/register', payload);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Get Started</h2>
                    <p>Create a new TaskForge account</p>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}
                {orgMode === 'join' && <p>Use the email address the workspace owner invited.</p>}

                <form className="auth-form" onSubmit={handleRegister}>
                    <div className="input-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            minLength={8}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="workspace-setup">{orgMode === 'create' ? 'Workspace name' : 'Invitation link or code'}</label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-btn ${orgMode === 'create' ? 'active' : ''}`}
                                onClick={() => { setOrgMode('create'); setOrgInput(''); setError(null); }}
                            >
                                Create Workspace
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${orgMode === 'join' ? 'active' : ''}`}
                                onClick={() => { setOrgMode('join'); setOrgInput(linkedInvitation); setError(null); }}
                            >
                                Join with Invitation
                            </button>
                        </div>
                        <input
                            id="workspace-setup"
                            type="text"
                            placeholder={orgMode === 'create' ? "Your Workspace Name" : "Paste invitation link or code"}
                            value={orgInput}
                            onChange={(e) => setOrgInput(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/" className="auth-link">Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
