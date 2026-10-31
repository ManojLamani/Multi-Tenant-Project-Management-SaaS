import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ProjectList from './ProjectList';

const active = { _id: 'active', name: 'Launch' };
const archived = { _id: 'archived', name: 'Previous release', archivedAt: '2026-10-01T10:00:00Z' };
function show(props = {}) {
    return render(<ProjectList projects={[active, archived]} canCreate onCreateProject={vi.fn()} onArchiveProject={vi.fn()} {...props} />);
}

it('filters active, archived, and all projects while keeping archived projects readable', async () => {
    const onOpenProject = vi.fn();
    show({ onOpenProject });
    expect(screen.getByRole('button', { name: 'Open Launch' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Previous release' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Project status' }), 'archived');
    expect(screen.queryByRole('button', { name: 'Open Launch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Previous release' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore Previous release' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open Previous release' }));
    expect(onOpenProject).toHaveBeenCalledWith(archived);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Project status' }), 'all');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 2 projects');
});

it('reports archive failures and restores action availability for retry', async () => {
    const onArchiveProject = vi.fn().mockResolvedValue(false);
    show({ onArchiveProject });
    await userEvent.click(screen.getByRole('button', { name: 'Archive Launch' }));
    expect(onArchiveProject).toHaveBeenCalledWith('active', true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not change the archive status');
    expect(screen.getByRole('button', { name: 'Archive Launch' })).toBeEnabled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Project status' }), 'archived');
    await userEvent.click(screen.getByRole('button', { name: 'Restore Previous release' }));
    expect(onArchiveProject).toHaveBeenCalledWith('archived', false);
});

it('shows members archived projects without archive, restore, or edit controls', async () => {
    show({ canCreate: false });
    expect(screen.queryByRole('button', { name: 'Archive Launch' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Project status' }), 'archived');
    expect(screen.getByRole('button', { name: 'Open Previous release' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore Previous release' })).not.toBeInTheDocument();
});
