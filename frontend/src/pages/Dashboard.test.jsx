import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../services/api';
import Dashboard from './Dashboard';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); localStorage.setItem('token', 'test-token'); });
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
    await userEvent.click(screen.getByRole('button', { name: /Back to Projects/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Second' }));
    expect(await screen.findByText('Second task')).toBeInTheDocument();
    await act(async () => finishFirst({ data: [{ _id: 'old-task', title: 'First task', status: 'todo' }] }));
    expect(screen.queryByText('First task')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Second task')).toBeInTheDocument();
});

it('ignores the first response after leaving and reopening the same project', async () => {
    let finishOldVisit;
    let visits = 0;
    api.get.mockImplementation((url) => {
        if (url === '/tasks') {
            visits += 1;
            if (visits === 1) return new Promise(resolve => { finishOldVisit = resolve; });
            return Promise.resolve({ data: [{ _id: 'current-task', title: 'Current visit task', status: 'todo' }] });
        }
        return workspace(url);
    });
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Open First' }));
    await userEvent.click(screen.getByRole('button', { name: /Back to Projects/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Open First' }));
    expect(await screen.findByText('Current visit task')).toBeInTheDocument();
    await act(async () => finishOldVisit({ data: [{ _id: 'old-task', title: 'Previous visit task', status: 'todo' }] }));
    expect(screen.queryByText('Previous visit task')).not.toBeInTheDocument();
    expect(screen.getByText('Current visit task')).toBeInTheDocument();
});

it('does not duplicate a task when its create response arrives during a later visit', async () => {
    let finishCreate;
    let visits = 0;
    const created = { _id: 'created-task', title: 'Created once', status: 'todo' };
    api.get.mockImplementation(url => {
        if (url === '/tasks') return Promise.resolve({ data: ++visits === 1 ? [] : [created] });
        return workspace(url);
    });
    api.post.mockImplementation(() => new Promise(resolve => { finishCreate = resolve; }));
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Open First' }));
    await userEvent.type(await screen.findByPlaceholderText('Task Title'), 'Created once');
    await userEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    await userEvent.click(screen.getByRole('button', { name: /Back to Projects/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Open First' }));
    expect(await screen.findByText('Created once')).toBeInTheDocument();
    await act(async () => finishCreate({ data: created }));
    expect(screen.getAllByText('Created once')).toHaveLength(1);
});

it('does not show an old task failure on a different project visit', async () => {
    let failUpdate;
    api.get.mockImplementation((url, config) => url === '/tasks'
        ? Promise.resolve({ data: [{ _id: config.params.projectId, title: `${config.params.projectId} task`, status: 'todo' }] })
        : workspace(url));
    api.put.mockImplementation(() => new Promise((_resolve, reject) => { failUpdate = reject; }));
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Open First' }));
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Status for one task' }), 'done');
    await userEvent.click(screen.getByRole('button', { name: /Back to Projects/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Second' }));
    expect(await screen.findByText('two task')).toBeInTheDocument();
    await act(async () => failUpdate(new Error('Old request failed')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
