import { useState } from 'react';
import TaskForm from './TaskForm';
import KanbanBoard from './KanbanBoard';
import TaskOverview from './TaskOverview';

export default function TaskTable({ project, tasks, team = [], pendingTasks = [], canCreate, onBack, onCreateTask, onMoveTask, onUpdateTask, onDeleteTask }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [assignee, setAssignee] = useState('');
    const [editing, setEditing] = useState(null);
    const [view, setView] = useState('table');
    const visibleTasks = tasks.filter(task =>
        `${task.title} ${task.description || ''}`.toLowerCase().includes(search.toLowerCase()) &&
        (!status || task.status === status) &&
        (!priority || (task.priority || 'medium') === priority) &&
        (!assignee || (assignee === 'unassigned' ? !task.assignedTo : (task.assignedTo?._id || task.assignedTo) === assignee))
    );

    return (
        <div className="task-table-view fade-in">
            <div className="kanban-header">
                <div>
                    <button className="btn-secondary" onClick={onBack}>← Back to Projects</button>
                    <h2>{project.name} - Tasks</h2>
                </div>
            </div>
            <TaskOverview tasks={tasks} />
            {canCreate && <section className="create-section">
                <h3>Create New Task</h3>
                <TaskForm team={team} onSave={onCreateTask} submitLabel="Add Task" />
            </section>}
            <section className="task-filters" aria-label="Task filters">
                <label>Search tasks<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title or description" /></label>
                <label>Filter by status<select value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="">All statuses</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option>
                </select></label>
                <label>Filter by priority<select value={priority} onChange={event => setPriority(event.target.value)}>
                    <option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select></label>
                <label>Filter by assignee<select value={assignee} onChange={event => setAssignee(event.target.value)}>
                    <option value="">Everyone</option><option value="unassigned">Unassigned</option>
                    {team.map(member => <option key={member._id} value={member._id}>{member.name}</option>)}
                </select></label>
            </section>
            <p role="status">Showing {visibleTasks.length} of {tasks.length} tasks</p>
            <div className="task-actions" aria-label="Task view"><button className="btn-secondary" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table view</button><button className="btn-secondary" aria-pressed={view === 'board'} onClick={() => setView('board')}>Board view</button></div>
            {editing && <section className="create-section" aria-label="Edit task">
                <h3>Edit Task</h3>
                <TaskForm key={editing._id} task={editing} team={team} onSave={values => onUpdateTask(editing._id, values)} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} submitLabel="Save Task" />
            </section>}
            {view === 'board' ? <KanbanBoard tasks={visibleTasks} canManage={canCreate} pendingTasks={pendingTasks} onMoveTask={onMoveTask} onEditTask={setEditing} onDeleteTask={onDeleteTask} /> : <section className="table-container">
                {!visibleTasks.length ? <p className="no-projects empty-state">{tasks.length ? 'No tasks match your filters.' : 'No tasks found for this project yet.'}</p> :
                    <table className="task-table">
                        <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Due date</th><th>Completed by</th><th>Status</th>{canCreate && <th>Actions</th>}</tr></thead>
                        <tbody>{visibleTasks.map(task => <tr key={task._id}>
                            <td><strong>{task.title}</strong><p>{task.description}</p></td>
                            <td>{task.assignedTo?.name || 'Unassigned'}</td>
                            <td><span className={`priority-badge priority-${task.priority || 'medium'}`}>{task.priority || 'medium'}</span></td>
                            <td>{task.dueDate?.slice(0, 10) || 'No due date'}</td>
                            <td>{task.status === 'done' ? task.completedBy?.name || '—' : '—'}</td>
                            <td><select aria-label={`Status for ${task.title}`} className="table-status-select" value={task.status} disabled={pendingTasks.includes(task._id)} onChange={event => onMoveTask(task._id, event.target.value)}>
                                <option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option>
                            </select></td>
                            {canCreate && <td className="task-actions"><button className="btn-secondary" disabled={pendingTasks.includes(task._id)} onClick={() => setEditing(task)}>Edit {task.title}</button><button className="btn-secondary" disabled={pendingTasks.includes(task._id)} onClick={() => onDeleteTask(task._id)}>Delete {task.title}</button></td>}
                        </tr>)}</tbody>
                    </table>}
            </section>}
        </div>
    );
}
