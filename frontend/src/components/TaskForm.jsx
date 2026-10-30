import { useId, useState } from 'react';

function initialValues(task) {
    return {
        title: task?.title || '', description: task?.description || '', status: task?.status || 'todo',
        priority: task?.priority || 'medium', assignedTo: task?.assignedTo?._id || task?.assignedTo || '',
        dueDate: task?.dueDate?.slice(0, 10) || '',
    };
}

export default function TaskForm({ task, team, onSave, onSaved, onCancel, submitLabel }) {
    const id = useId();
    const [values, setValues] = useState(() => initialValues(task));
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const change = event => setValues(previous => ({ ...previous, [event.target.name]: event.target.value }));
    async function submit(event) {
        event.preventDefault();
        setPending(true);
        setError('');
        try {
            const result = await onSave({ ...values, assignedTo: values.assignedTo || null, dueDate: values.dueDate || null });
            if (result === false) setError('Could not save this task. Your changes are still here.');
            else {
                if (!task) setValues(initialValues());
                onSaved?.();
            }
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not save this task. Please try again.');
        } finally {
            setPending(false);
        }
    }
    return <form className="create-form" onSubmit={submit}>
        {error && <p role="alert" className="error-message">{error}</p>}
        <label htmlFor={`${id}-title`}>Task title</label>
        <input id={`${id}-title`} name="title" placeholder="Task Title" value={values.title} onChange={change} maxLength={200} required />
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea id={`${id}-description`} name="description" value={values.description} onChange={change} maxLength={5000} />
        <div className="task-fields">
            <label>Status<select name="status" value={values.status} onChange={change}><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></label>
            <label>Priority<select name="priority" value={values.priority} onChange={change}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label>Assignee<select name="assignedTo" value={values.assignedTo} onChange={change}><option value="">Unassigned</option>{team.map(member => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
            <label>Due date<input type="date" name="dueDate" value={values.dueDate} onChange={change} /></label>
        </div>
        <div className="task-actions"><button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : submitLabel}</button>{onCancel && <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>Cancel</button>}</div>
    </form>;
}
