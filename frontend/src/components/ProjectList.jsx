import React, { useState } from 'react';

// Memoized card prevents all projects from re-rendering when typing in one 
const ProjectCard = React.memo(({ proj, canCreate, canDelete, onOpenProject, onDeleteProject, onUpdateProject }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: proj.name, description: proj.description || '' });

    if (isEditing) {
        return (
            <div className="project-card" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6' }} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                    <textarea style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6', minHeight: '60px', fontFamily: 'inherit' }} value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { onUpdateProject(proj._id, editData); setIsEditing(false); }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px', flex: 1 }}>Save</button>
                        <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', flex: 1 }}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="project-card" onClick={() => onOpenProject(proj)}>
            <h3>{proj.name}</h3>
            <p>{proj.description || 'No description provided.'}</p>
            {(canCreate || canDelete) && (
                <div style={{ marginTop: 'auto', paddingTop: '15px', display: 'flex', gap: '10px' }}>
                    {canCreate && <button onClick={e => { e.stopPropagation(); setIsEditing(true); }} style={{ background: '#e6effc', color: '#0052cc', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: '600' }}>Edit</button>}
                    {canDelete && <button onClick={e => { e.stopPropagation(); onDeleteProject(proj._id); }} style={{ background: '#ffebe6', color: '#bf2600', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: '600' }}>Delete</button>}
                </div>
            )}
        </div>
    );
});

const ProjectList = ({ projects, canCreate, canDelete, onCreateProject, onOpenProject, onDeleteProject, onUpdateProject }) => {
    const [newProject, setNewProject] = useState({ name: '', description: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreateProject(newProject);
        setNewProject({ name: '', description: '' });
    };

    return (
        <>
            {canCreate && (
                <section className="create-section">
                    <h2>Create New Project</h2>
                    <form onSubmit={handleSubmit} className="create-form">
                        <input placeholder="Project Name" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} required />
                        <textarea placeholder="Description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
                        <button type="submit" className="btn-primary">Create Project</button>
                    </form>
                </section>
            )}

            <section className="projects-section">
                <h2>Your Projects</h2>
                {!projects.length ? <p className="no-projects">No projects found.</p> : (
                    <div className="projects-grid">
                        {projects.map(proj => (
                            <ProjectCard key={proj._id} proj={proj} {...{canCreate, canDelete, onOpenProject, onDeleteProject, onUpdateProject}} />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
};

export default ProjectList;
