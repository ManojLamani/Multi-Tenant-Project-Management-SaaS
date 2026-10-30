import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import api from '../services/api';
import ActivityFeed from './ActivityFeed';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

it('shows task history with the actor and field change', async () => {
    api.get.mockResolvedValue({ data: [{ _id: 'event', actor: { name: 'Sam' }, action: 'updated', taskTitle: 'Launch', changes: [{ field: 'status', from: 'todo', to: 'done' }], createdAt: '2026-10-31T00:00:00Z' }] });
    render(<ActivityFeed projectId="project" version={0} />);
    expect(await screen.findByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('status: todo → done')).toBeInTheDocument();
});

it('offers retry after a history request fails', async () => {
    api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: [] });
    render(<ActivityFeed projectId="project" version={0} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry activity' }));
    expect(await screen.findByText('No task activity yet.')).toBeInTheDocument();
});
