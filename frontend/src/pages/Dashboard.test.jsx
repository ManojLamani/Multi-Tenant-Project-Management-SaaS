import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../services/api';
import Dashboard from './Dashboard';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); localStorage.setItem('token', 'test-token'); });
const projects = [{ _id: 'one', name: 'First' }, { _id: 'two', name: 'Second' }];
function renderDashboard() { render(<MemoryRouter><Dashboard /></MemoryRouter>); }
function workspace(url) {
    if (url === '/auth/me') return Promise.resolve({ data: { user: { name: 'Owner', role: 'owner', workspaceId: 'workspace' } } });
    if (url === '/projects') return Promise.resolve({ data: projects });
    return Promise.resolve({ data: [] });
}

it('shows a retry screen instead of crashing when workspace loading fails', async () => {
    api.get.mockRejectedValue(new Error('Offline'));
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your workspace');
    api.get.mockImplementation(workspace);
    await userEvent.click(screen.getByRole('button', { name: 'Retry workspace' }));
    expect(await screen.findByRole('button', { name: 'Open First' })).toBeInTheDocument();
});

it('ignores an old project response after the user opens another project', async () => {
    let finishFirst;
    api.get.mockImplementation((url, config) => {
        if (url === '/tasks' && config.params.projectId === 'one') return new Promise(resolve => { finishFirst = resolve; });
        if (url === '/tasks') return Promise.resolve({ data: [{ _id: 'new-task', title: 'Second task', status: 'todo' }] });
        return workspace(url);
    });
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Open First' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to Projects' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Second' }));
    expect(await screen.findByText('Second task')).toBeInTheDocument();
    finishFirst({ data: [{ _id: 'old-task', title: 'First task', status: 'todo' }] });
    expect(screen.queryByText('First task')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Second task')).toBeInTheDocument();
});
