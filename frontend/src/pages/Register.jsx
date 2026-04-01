import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [orgMode, setOrgMode] = useState('create');
    const [orgInput, setOrgInput] = useState('');

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
                payload.orgId = orgInput;
            }

            await api.post('/auth/register', payload);
            navigate('/');
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

                {error && <div className="error-message">{error}</div>}

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
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Workspace Setup</label>
                        <div className="toggle-group">
                            <button
                                type="button"
                                className={`toggle-btn ${orgMode === 'create' ? 'active' : ''}`}
                                onClick={() => setOrgMode('create')}
                            >
                                Create Workspace
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${orgMode === 'join' ? 'active' : ''}`}
                                onClick={() => setOrgMode('join')}
                            >
                                Join Existing
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder={orgMode === 'create' ? "Your Workspace Name" : "Paste Workspace ID here"}
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
