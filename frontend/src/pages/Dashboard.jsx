import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProjectList from '../components/ProjectList';
import TaskTable from '../components/TaskTable';
import TeamList from '../components/TeamList';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // View state strings: 'projects' | 'tasks' | 'team'
    const [viewMode, setViewMode] = useState('projects');

    const navigate = useNavigate();

    // 1. Load Initial Data
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const fetchData = async () => {
            try {
                const [userRes, projectsRes] = await Promise.all([
                    api.get('/auth/me'),
                    api.get('/projects')
                ]);
                setUser(userRes.data.user);
                setProjects(projectsRes.data);
            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    // 2. Project Actions
    const handleCreateProject = async (newProjectData) => {
        try {
            const res = await api.post('/projects', newProjectData);
            setProjects([...projects, res.data]);
        } catch (error) {
            alert("Failed to create project");
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!window.confirm("Are you sure you want to permanently delete this project?")) return;
        try {
            await api.delete(`/projects/${projectId}`);
            setProjects(projects.filter(p => p._id !== projectId));
        } catch (error) {
            alert("Failed to delete project. Only owners can do this.");
        }
    };

    const handleUpdateProject = async (projectId, updatedData) => {
        try {
            const res = await api.put(`/projects/${projectId}`, updatedData);
            setProjects(projects.map(p => p._id === projectId ? res.data : p));
        } catch (error) {
            alert("Failed to update project. Only managers or owners can do this.");
        }
    };

    const openProject = async (project) => {
        setSelectedProject(project);
        setViewMode('tasks');
        try {
            const res = await api.get('/tasks');
            const projectTasks = res.data.filter(t => (t.projectId?._id || t.projectId) === project._id);
            setTasks(projectTasks);
        } catch (error) {
            console.error(error);
        }
    };

    // 3. Task Actions
    const handleCreateTask = async (newTaskData) => {
        try {
            const res = await api.post('/tasks', { ...newTaskData, projectId: selectedProject._id });
            setTasks([...tasks, { ...res.data, projectId: { _id: selectedProject._id } }]);
        } catch (error) {
            alert("Failed to create task");
        }
    };

    const handleMoveTask = async (taskId, newStatus) => {
        try {
            const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
            setTasks(tasks.map(t => t._id === taskId ? { ...t, status: res.data.status, completedBy: res.data.completedBy } : t));
        } catch (error) {
            alert("Failed to update task status");
        }
    };

    // 4. Render Layout
    if (loading) return <div className="loading-screen">Loading workspace...</div>;

    const canCreate = user && (user.role === 'owner' || user.role === 'manager');
    const isOwner = user && user.role === 'owner';

    return (
        <div className="dashboard-container fade-in">
            <nav className="navbar">
                <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => setViewMode('projects')}>TaskForge</div>

                {canCreate && (
                    <div className="navbar-workspace" style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ color: '#5e6c84', fontSize: '13px', fontWeight: '500' }}>
                            Workspace Invitation Code: <span style={{ background: '#f4f5f7', color: '#172b4d', padding: '6px 12px', borderRadius: '6px', border: '1px dashed #dfe1e6', userSelect: 'all', fontFamily: 'monospace', letterSpacing: '1px', marginLeft: '6px' }}>{user.workspaceId}</span>
                        </div>
                    </div>
                )}

                <div className="navbar-user">
                    <span>{user.name}</span>
                    {isOwner && (
                        <button onClick={() => setViewMode('team')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>Manage Team</button>
                    )}
                    <button onClick={handleLogout} className="btn-logout" style={{ padding: '6px 12px', fontSize: '13px' }}>Logout</button>
                </div>
            </nav>

            <main className="main-content">
                {viewMode === 'projects' && (
                    <ProjectList
                        projects={projects}
                        canCreate={canCreate}
                        canDelete={isOwner}
                        onCreateProject={handleCreateProject}
                        onOpenProject={openProject}
                        onDeleteProject={handleDeleteProject}
                        onUpdateProject={handleUpdateProject}
                    />
                )}

                {viewMode === 'tasks' && selectedProject && (
                    <TaskTable
                        project={selectedProject}
                        tasks={tasks}
                        userRole={user.role}
                        canCreate={canCreate}
                        onBack={() => { setSelectedProject(null); setViewMode('projects'); }}
                        onCreateTask={handleCreateTask}
                        onMoveTask={handleMoveTask}
                    />
                )}

                {viewMode === 'team' && (
                    <TeamList
                        onBack={() => setViewMode('projects')}
                        currentUserRole={user.role}
                    />
                )}
            </main>
        </div>
    );
};

export default Dashboard;
