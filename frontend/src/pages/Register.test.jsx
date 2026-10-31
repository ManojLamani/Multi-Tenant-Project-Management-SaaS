import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../services/api';
import Register from './Register';

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
function show(url = '/register') {
    render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/register" element={<Register />} /><Route path="/" element={<p>Sign in next</p>} /></Routes></MemoryRouter>);
}
async function credentials() {
    await userEvent.type(screen.getByRole('textbox', { name: 'Full Name' }), 'Sam');
    await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), 'sam@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
}

it('opens invitation links in join mode and registers using the token', async () => {
    const token = 'a'.repeat(64);
    api.post.mockResolvedValue({ data: {} });
    show(`/register#invite=${token}`);
    expect(screen.getByRole('textbox', { name: 'Invitation link or code' })).toHaveValue(token);
    await credentials();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(api.post).toHaveBeenCalledWith('/auth/register', { name: 'Sam', email: 'sam@example.com', password: 'password123', inviteToken: token });
    expect(await screen.findByText('Sign in next')).toBeInTheDocument();
});

it('accepts a pasted invitation link and rejects workspace IDs', async () => {
    api.post.mockResolvedValue({ data: {} });
    show();
    await credentials();
    await userEvent.click(screen.getByRole('button', { name: 'Join with Invitation' }));
    const input = screen.getByRole('textbox', { name: 'Invitation link or code' });
    await userEvent.type(input, 'a'.repeat(24));
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid invitation');
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, `https://taskforge.example/register#invite=${'b'.repeat(64)}`);
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ inviteToken: 'b'.repeat(64) }));
});

it('still creates new workspaces without an invitation', async () => {
    api.post.mockResolvedValue({ data: {} });
    show();
    await credentials();
    await userEvent.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Design team');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ organizationName: 'Design team' }));
});
