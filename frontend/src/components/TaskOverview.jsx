export function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TaskOverview({ tasks }) {
    const completed = tasks.filter(task => task.status === 'done').length;
    const overdue = tasks.filter(task => task.status !== 'done' && task.dueDate && task.dueDate.slice(0, 10) < localDate()).length;
    const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    return <section className="project-overview" aria-label="Project progress">
        <div><strong>{tasks.length}</strong><span>Total tasks</span></div>
        <div><strong>{completed}</strong><span>Completed</span></div>
        <div><strong>{overdue}</strong><span>Overdue</span></div>
        <div><strong>{progress}%</strong><label htmlFor="project-progress">Completion</label><progress id="project-progress" value={completed} max={tasks.length || 1} /></div>
    </section>;
}
