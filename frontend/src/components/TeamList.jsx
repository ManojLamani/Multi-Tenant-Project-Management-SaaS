import React, { useState, useEffect } from 'react';
import api from '../services/api';

const TeamList = ({ onBack, currentUserRole }) => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await api.get('/users');
                setTeam(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, []);

    const handleChangeRole = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            setTeam(team.map(u => u._id === userId ? { ...u, role: newRole } : u));
            alert("Role updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update role. Only owners can do this.");
        }
    };

    if (loading) return <div className="loading-screen" style={{ height: '50vh' }}>Fetching team records...</div>;

    const canManageRoles = currentUserRole === 'owner';

    return (
        <div className="fade-in">
            <div className="kanban-header" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="btn-secondary" onClick={onBack}>← Back to Projects</button>
                    <h2>Manage Team Roles</h2>
                </div>
            </div>

            <div className="projects-grid">
                {team.map(member => (
                    <div key={member._id} className="project-card" style={{ cursor: 'default' }}>
                        <h3>{member.name}</h3>
                        <p style={{ marginBottom: '5px' }}><strong>Email:</strong> {member.email}</p>
                        <p><strong>Tier:</strong> <span style={{ textTransform: 'capitalize', color: '#0052cc', fontWeight: '600' }}>{member.role}</span></p>

                        {canManageRoles && member.role !== 'owner' && (
                            <div style={{ marginTop: '15px', borderTop: '1px solid #ebecf0', paddingTop: '15px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5e6c84', display: 'block', marginBottom: '6px' }}>Assign New Role</label>
                                <select
                                    className="status-select"
                                    style={{ width: '100%', padding: '8px 12px' }}
                                    defaultValue={member.role}
                                    onChange={(e) => handleChangeRole(member._id, e.target.value)}
                                >
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamList;
