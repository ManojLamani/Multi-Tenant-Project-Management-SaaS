import { useState } from 'react';

function ProjectCard({ project, canCreate, canDelete, onOpenProject, onDeleteProject, onUpdateProject, onArchiveProject }) {
    const [editing, setEditing] = useState(false);
    const [values, setValues] = useState({ name: project.name, description: project.description || '' });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    async function save(event) {
        event.preventDefault();
        setPending(true);
        setError('');
        try {
            if (await onUpdateProject(project._id, values) !== false) setEditing(false);
            else setError('Could not save. Your changes are still here.');
        } catch { setError('Could not save. Please try again.'); }
        finally { setPending(false); }
    }
    async function remove() {
        setPending(true);
        try { await onDeleteProject(project._id); }
        finally { setPending(false); }
    }
    async function archive() {
        setPending(true);
        setError('');
        try {
            if (await onArchiveProject(project._id, !project.archivedAt) === false) setError('Could not change the archive status. Please try again.');
        } catch { setError('Could not change the archive status. Please try again.'); }
        finally { setPending(false); }
    }
    return <article className="project-card">
        {editing && !project.archivedAt ? <form className="create-form" onSubmit={save}>
            {error && <p role="alert">{error}</p>}
            <label>Project name<input value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} maxLength={200} required /></label>
            <label>Description<textarea value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} maxLength={5000} /></label>
            <div className="task-actions"><button className="btn-primary" disabled={pending}>Save Project</button><button type="button" className="btn-secondary" disabled={pending} onClick={() => setEditing(false)}>Cancel</button></div>
        </form> : <>
            <h3><button className="project-title" disabled={pending} aria-label={`Open ${project.name}`} onClick={() => onOpenProject(project)}>{project.name}</button></h3>
            {project.archivedAt && <p className="archived-badge">Archived · Read only</p>}
            <p>{project.description || 'No description provided.'}</p>
            {error && <p role="alert">{error}</p>}
            <div className="task-actions">
                {canCreate && !project.archivedAt && <button className="btn-secondary" disabled={pending} onClick={() => { setValues({ name: project.name, description: project.description || '' }); setError(''); setEditing(true); }}>Edit {project.name}</button>}
                {canCreate && <button className="btn-secondary" disabled={pending} onClick={archive}>{project.archivedAt ? 'Restore' : 'Archive'} {project.name}</button>}
                {canDelete && <button className="btn-secondary" disabled={pending} onClick={remove}>Delete {project.name}</button>}
            </div>
        </>}
    </article>;
}

export default function ProjectList({ projects, canCreate, canDelete, onCreateProject, ...actions }) {
    const [values, setValues] = useState({ name: '', description: '' });
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('active');
    const visibleProjects = projects.filter(project => filter === 'all' || (filter === 'archived' ? Boolean(project.archivedAt) : !project.archivedAt));
    async function submit(event) {
        event.preventDefault();
        setPending(true);
        setError('');
        try {
            if (await onCreateProject(values) !== false) setValues({ name: '', description: '' });
            else setError('Could not create the project. Your draft is still here.');
        } catch { setError('Could not create the project. Please try again.'); }
        finally { setPending(false); }
    }
    return <>
        {canCreate && <section className="create-section"><h2>Create New Project</h2><form className="create-form" onSubmit={submit}>
            {error && <p role="alert">{error}</p>}
            <label>Project name<input placeholder="Project Name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} maxLength={200} required /></label>
            <label>Description<textarea value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} maxLength={5000} /></label>
            <button className="btn-primary" disabled={pending}>{pending ? 'Creating…' : 'Create Project'}</button>
        </form></section>}
        <section className="projects-section"><h2>Your Projects</h2>
            <label className="project-filter">Project status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="active">Active projects</option><option value="archived">Archived projects</option><option value="all">All projects</option></select></label>
            <p role="status">Showing {visibleProjects.length} of {projects.length} projects</p>
            {!visibleProjects.length ? <p>No {filter === 'all' ? '' : `${filter} `}projects found.</p> : <div className="projects-grid">{visibleProjects.map(project => <ProjectCard key={project._id} project={project} canCreate={canCreate} canDelete={canDelete} {...actions} />)}</div>}
        </section>
    </>;
}
