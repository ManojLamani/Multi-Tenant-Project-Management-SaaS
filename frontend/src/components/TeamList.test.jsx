import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../services/api';
import TeamList from './TeamList';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const members = [{ _id: 'owner', name: 'Owner', email: 'owner@example.com', role: 'owner' }, { _id: 'member', name: 'Sam', email: 'sam@example.com', role: 'member' }];
beforeEach(() => { vi.resetAllMocks(); vi.spyOn(window, 'alert').mockImplementation(() => {}); });

it('keeps the saved role when an update fails', async () => {
    api.get.mockResolvedValue({ data: members });
    api.put.mockRejectedValue(new Error('Offline'));
    render(<TeamList onBack={vi.fn()} currentUserRole="owner" />);
    const role = await screen.findByRole('combobox');
    await userEvent.selectOptions(role, 'manager');
    await waitFor(() => expect(role).toHaveValue('member'));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update');
});

it('lets users retry a failed team request', async () => {
    api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: members });
    render(<TeamList onBack={vi.fn()} currentUserRole="owner" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry team' }));
    expect(await screen.findByText('Sam')).toBeInTheDocument();
});

it('updates roles after the server confirms and hides role controls from members', async () => {
    api.get.mockResolvedValue({ data: members });
    api.put.mockResolvedValue({ data: { user: { ...members[1], role: 'manager' } } });
    const view = render(<TeamList onBack={vi.fn()} currentUserRole="owner" />);
    const role = await screen.findByRole('combobox');
    await userEvent.selectOptions(role, 'manager');
    expect(await screen.findByRole('status')).toHaveTextContent('Role updated for Sam');
    expect(role).toHaveValue('manager');
    view.rerender(<TeamList onBack={vi.fn()} currentUserRole="member" />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
