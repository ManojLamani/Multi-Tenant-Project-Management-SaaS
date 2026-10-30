import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TaskTable from './TaskTable';

const task = { _id: 'task-1', title: 'Review release', description: 'Check changes', status: 'todo' };
function view(props = {}) {
    return render(<TaskTable project={{ _id: 'project-1', name: 'Release' }} tasks={[task]} userRole="member" canCreate={false} onBack={vi.fn()} onCreateTask={vi.fn()} onMoveTask={vi.fn()} {...props} />);
}

describe('task permissions in the interface', () => {
    it('lets members update status without displaying task creation', async () => {
        const onMoveTask = vi.fn();
        view({ onMoveTask });
        expect(screen.queryByRole('button', { name: 'Add Task' })).not.toBeInTheDocument();
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status for Review release' }), 'done');
        expect(onMoveTask).toHaveBeenCalledWith('task-1', 'done');
    });

    it('lets owners create completed tasks', async () => {
        const onCreateTask = vi.fn().mockResolvedValue(true);
        view({ userRole: 'owner', canCreate: true, onCreateTask });
        await userEvent.type(screen.getByPlaceholderText('Task Title'), 'Already finished');
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'done');
        await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));
        expect(onCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Already finished', status: 'done' }));
    });
    it('filters tasks and opens the edit form with planning fields', async () => {
        view({ canCreate: true, team: [{ _id: 'user-1', name: 'Sam' }], tasks: [task, { _id: 'task-2', title: 'Fix outage', status: 'todo', priority: 'high' }] });
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by priority' }), 'high');
        expect(screen.queryByText('Review release')).not.toBeInTheDocument();
        expect(screen.getByText('Fix outage')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Edit Fix outage' }));
        expect(screen.getByRole('region', { name: 'Edit task' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Fix outage')).toBeInTheDocument();
    });

    it('preserves task form input when saving fails', async () => {
        view({ canCreate: true, onCreateTask: vi.fn().mockResolvedValue(false) });
        await userEvent.type(screen.getByPlaceholderText('Task Title'), 'Keep this draft');
        await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Your changes are still here');
        expect(screen.getByPlaceholderText('Task Title')).toHaveValue('Keep this draft');
    });
});
