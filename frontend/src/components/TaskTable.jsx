import React, { useState, memo } from 'react';

// Memoized individual row to prevent the entire table from re-rendering when one task changes
const TaskRow = memo(({ task, onMoveTask }) => {
    return (
        <tr key={task._id}>
            <td><strong>{task.title}</strong></td>
            <td>{task.description || "No description"}</td>
            {/* Show who completed it, or just a dash if not done */}
            <td>
                {task.status === 'done' && task.completedBy 
                    ? task.completedBy.name 
                    : '-'
                }
            </td>
            <td>
                <select
                    className="table-status-select"
                    value={task.status}
                    onChange={(e) => onMoveTask(task._id, e.target.value)}
                >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
            </td>
        </tr>
    );
});

const TaskTable = ({ project, tasks, canCreate, onBack, onCreateTask, onMoveTask }) => {
    // Local state for the "Add Task" form
    const [newTask, setNewTask] = useState({ 
        title: '', 
        description: '', 
        status: 'todo' 
    });

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onCreateTask(newTask);
        // Reset form after successful submission
        setNewTask({ title: '', description: '', status: 'todo' });
    };

    return (
        <div className="task-table-view fade-in">
            {/* Header with Back Button */}
            <div className="kanban-header">
                <div>
                    <button className="btn-secondary" onClick={onBack}>
                        ← Back to Projects
                    </button>
                    <h2>{project.name} - Tasks</h2>
                </div>
            </div>

            {/* "Add New Task" Section - Only shown if user has permissions */}
            {canCreate && (
                <section className="create-section">
                    <h3>Create New Task</h3>
                    <form onSubmit={handleFormSubmit} className="create-form">
                        <input
                            type="text"
                            placeholder="Task Title"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            required
                        />
                        <textarea
                            placeholder="Task Description"
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        ></textarea>
                        
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <label style={{ fontSize: '14px', color: '#5e6c84' }}>Initial Status:</label>
                            <select
                                value={newTask.status}
                                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                                className="status-select"
                                style={{ flex: 1 }}
                            >
                                <option value="todo">Todo</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary">Add Task</button>
                    </form>
                </section>
            )}

            {/* Tasks Table Section */}
            <section className="table-container">
                {!tasks.length ? (
                    <p className="no-projects" style={{ padding: '20px' }}>
                        No tasks found for this project yet.
                    </p>
                ) : (
                    <table className="task-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Completed By</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <TaskRow 
                                    key={task._id} 
                                    task={task} 
                                    onMoveTask={onMoveTask} 
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
};

export default TaskTable;
