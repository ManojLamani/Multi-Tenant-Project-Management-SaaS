import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProjectList from '../components/ProjectList';
import TaskTable from '../components/TaskTable';
import TeamList from '../components/TeamList';
import ActivityFeed from '../components/ActivityFeed';
import WorkspaceInvitations from '../components/WorkspaceInvitations';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [projects, setProjects] = useState([]);
    const [team, setTeam] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [view, setView] = useState('projects');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [retry, setRetry] = useState(0);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [activityVersion, setActivityVersion] = useState(0);
    const [pendingTasks, setPendingTasks] = useState([]);
    const activeProject = useRef(null);
    const taskLocks = useRef(new Set());

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/');
            return;
        }
        let active = true;
        setLoading(true);
        setLoadError('');
        Promise.all([api.get('/auth/me'), api.get('/projects'), api.get('/users')]).then(([profile, projectList, members]) => {
            if (!active) return;
            setUser(profile.data.user);
            setProjects(projectList.data);
            setTeam(members.data);
        }).catch(error => {
            if (!active) return;
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            } else setLoadError('Could not load your workspace. Please try again.');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; activeProject.current = null; };
    }, [navigate, retry]);

    function failure(error, fallback) {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            navigate('/');
        } else setFeedback(error.response?.data?.message || fallback);
        return false;
    }

    function back() {
        activeProject.current = null;
        setSelectedProject(null);
        setView('projects');
        setFeedback('');
    }

    async function openProject(project) {
        // Each visit has its own identity, including reopening the same project.
        const visit = { projectId: project._id };
        activeProject.current = visit;
        setSelectedProject(project);
        setView('tasks');
        setTasks([]);
        setTasksLoading(true);
        setTasksError('');
        setFeedback('');
        try {
            const response = await api.get('/tasks', { params: { projectId: project._id } });
            if (activeProject.current === visit) setTasks(response.data);
        } catch (error) {
            if (activeProject.current === visit) {
                setTasksError('Could not load tasks for this project.');
                if (error.response?.status === 401) failure(error);
            }
        } finally {
            if (activeProject.current === visit) setTasksLoading(false);
        }
    }

    async function createProject(values) {
        setFeedback('');
        try {
            const response = await api.post('/projects', values);
            setProjects(previous => [...previous, response.data]);
            return true;
        } catch (error) { return failure(error, 'Could not create the project.'); }
    }

    async function updateProject(id, values) {
        setFeedback('');
        try {
            const response = await api.put(`/projects/${id}`, values);
            setProjects(previous => previous.map(project => project._id === id ? response.data : project));
            return true;
        } catch (error) { return failure(error, 'Could not update the project.'); }
    }

    async function deleteProject(id) {
        if (!window.confirm('Delete this project and all its tasks permanently?')) return false;
        setFeedback('');
        try {
            await api.delete(`/projects/${id}`);
            setProjects(previous => previous.filter(project => project._id !== id));
            return true;
        } catch (error) { return failure(error, 'Could not delete the project.'); }
    }

    async function createTask(values) {
        const visit = activeProject.current;
        const projectId = visit.projectId;
        setFeedback('');
        try {
            const response = await api.post('/tasks', { ...values, projectId });
            if (activeProject.current === visit) {
                setTasks(previous => [...previous, response.data]);
                setActivityVersion(value => value + 1);
            }
            return true;
        } catch (error) { return activeProject.current === visit ? failure(error, 'Could not create the task.') : false; }
    }

    async function mutateTask(id, values, deleting = false) {
        if (taskLocks.current.has(id)) return false;
        const visit = activeProject.current;
        taskLocks.current.add(id);
        setPendingTasks([...taskLocks.current]);
        setFeedback('');
        try {
            const response = deleting ? await api.delete(`/tasks/${id}`) : await api.put(`/tasks/${id}`, values);
            if (activeProject.current === visit) {
                setTasks(previous => deleting ? previous.filter(task => task._id !== id) : previous.map(task => task._id === id ? response.data : task));
                setActivityVersion(value => value + 1);
            }
            return true;
        } catch (error) { return activeProject.current === visit ? failure(error, 'Could not save the task change.') : false; }
        finally {
            taskLocks.current.delete(id);
            setPendingTasks([...taskLocks.current]);
        }
    }

    if (loading) return <div className="loading-screen" role="status">Loading workspace…</div>;
    if (loadError || !user) return <main className="main-content"><div className="feedback" role="alert">{loadError || 'Your workspace is unavailable.'}</div><button className="btn-primary" onClick={() => setRetry(value => value + 1)}>Retry workspace</button></main>;
    const canManage = ['owner', 'manager'].includes(user.role);
    return <div className="dashboard-container">
        <nav className="navbar">
            <button className="navbar-brand project-title" onClick={back}>TaskForge</button>
            <div className="navbar-user"><span>{user.name}</span>{user.role === 'owner' && <button className="btn-secondary" onClick={() => { activeProject.current = null; setView('team'); }}>Manage Team</button>}<button className="btn-logout" onClick={() => { localStorage.removeItem('token'); navigate('/'); }}>Logout</button></div>
        </nav>
        <main className="main-content">
            {feedback && <div className="feedback" role="alert">{feedback} <button className="btn-secondary" onClick={() => setFeedback('')}>Dismiss</button></div>}
            {view === 'projects' && <ProjectList projects={projects} canCreate={canManage} canDelete={user.role === 'owner'} onCreateProject={createProject} onUpdateProject={updateProject} onDeleteProject={deleteProject} onOpenProject={openProject} />}
            {view === 'tasks' && selectedProject && <>
                {tasksLoading ? <><button className="btn-secondary" onClick={back}>Back to Projects</button><p role="status">Loading tasks…</p></> : tasksError ? <><button className="btn-secondary" onClick={back}>Back to Projects</button><p role="alert">{tasksError}</p><button className="btn-primary" onClick={() => openProject(selectedProject)}>Retry tasks</button></> :
                    <TaskTable key={`tasks-${selectedProject._id}`} project={selectedProject} tasks={tasks} team={team} pendingTasks={pendingTasks} canCreate={canManage} onBack={back} onCreateTask={createTask} onUpdateTask={mutateTask} onMoveTask={(id, status) => mutateTask(id, { status })} onDeleteTask={id => window.confirm('Delete this task permanently?') && mutateTask(id, null, true)} />}
                <ActivityFeed key={`activity-${selectedProject._id}`} projectId={selectedProject._id} version={activityVersion} team={team} />
            </>}
            {view === 'team' && <><TeamList onBack={back} currentUserRole={user.role} />{user.role === 'owner' && <WorkspaceInvitations />}</>}
        </main>
    </div>;
}
