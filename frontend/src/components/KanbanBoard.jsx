import { localDate } from './TaskOverview';

const columns = [['todo', 'Todo'], ['in-progress', 'In Progress'], ['done', 'Done']];

export default function KanbanBoard({ tasks, canManage, readOnly = false, pendingTasks = [], onMoveTask, onEditTask, onDeleteTask }) {
    return <div className="kanban-board" aria-label="Task board">{columns.map(([status, label]) => {
        const items = tasks.filter(task => task.status === status);
        return <section className="kanban-column" key={status} aria-label={label}>
            <h3>{label} <span>{items.length}</span></h3>
            {!items.length && <p className="no-projects">No tasks</p>}
            {items.map(task => <article className="kanban-card" key={task._id}>
                <h4>{task.title}</h4><p>{task.description}</p>
                <span className={`priority-badge priority-${task.priority || 'medium'}`}>{task.priority || 'medium'}</span>
                <p>{task.assignedTo?.name || 'Unassigned'}</p>
                {task.dueDate && <p className={status !== 'done' && task.dueDate.slice(0, 10) < localDate() ? 'overdue' : ''}>Due {task.dueDate.slice(0, 10)}</p>}
                <label>Move {task.title}<select value={status} disabled={readOnly || pendingTasks.includes(task._id)} onChange={event => onMoveTask(task._id, event.target.value)}>
                    {columns.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                </select></label>
                {canManage && <div className="task-actions"><button className="btn-secondary" disabled={pendingTasks.includes(task._id)} onClick={() => onEditTask(task)}>Edit {task.title}</button><button className="btn-secondary" disabled={pendingTasks.includes(task._id)} onClick={() => onDeleteTask(task._id)}>Delete {task.title}</button></div>}
            </article>)}
        </section>;
    })}</div>;
}
