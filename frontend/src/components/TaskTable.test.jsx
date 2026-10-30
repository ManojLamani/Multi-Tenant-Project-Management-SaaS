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
        await userEvent.selectOptions(screen.getByRole('combobox'), 'done');
        expect(onMoveTask).toHaveBeenCalledWith('task-1', 'done');
    });

    it('lets owners create completed tasks', async () => {
        const onCreateTask = vi.fn().mockResolvedValue(true);
        view({ userRole: 'owner', canCreate: true, onCreateTask });
        await userEvent.type(screen.getByPlaceholderText('Task Title'), 'Already finished');
        await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'done');
        await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));
        expect(onCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Already finished', status: 'done' }));
    });
});
