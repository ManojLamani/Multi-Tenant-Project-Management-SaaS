import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../services/api';
import WorkspaceInvitations from './WorkspaceInvitations';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
const invitation = { _id: 'invite-1', email: 'sam@example.com', status: 'pending', expiresAt: '2999-01-01T00:00:00Z' };
beforeEach(() => vi.resetAllMocks());

it('creates a shareable fragment link without displaying stored hashes', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { invitation, token: 'a'.repeat(64) } });
    render(<WorkspaceInvitations />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Teammate email' }), 'sam@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create invite link' }));
    const link = await screen.findByRole('textbox', { name: 'Invitation link' });
    expect(link.value).toBe(`${window.location.origin}/register#invite=${'a'.repeat(64)}`);
    expect(api.post).toHaveBeenCalledWith('/invitations', { email: 'sam@example.com' });
});

it('revokes pending invitations and refreshes their status', async () => {
    api.get.mockResolvedValueOnce({ data: [invitation] }).mockResolvedValue({ data: [{ ...invitation, status: 'revoked' }] });
    api.delete.mockResolvedValue({});
    render(<WorkspaceInvitations />);
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke invitation for sam@example.com' }));
    expect(api.delete).toHaveBeenCalledWith('/invitations/invite-1');
    expect(await screen.findByText(/Status: revoked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke invitation for sam@example.com' })).not.toBeInTheDocument();
});

it('retains email after creation fails and lets owners retry a failed listing', async () => {
    api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: [] });
    api.post.mockRejectedValue(new Error('Offline'));
    render(<WorkspaceInvitations />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry invitations' }));
    expect(await screen.findByText('No invitations yet.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Teammate email' }), 'sam@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create invite link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create');
    expect(screen.getByRole('textbox', { name: 'Teammate email' })).toHaveValue('sam@example.com');
});
