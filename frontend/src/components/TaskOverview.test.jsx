import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import TaskOverview from './TaskOverview';

it('counts overdue unfinished tasks and reports project completion', () => {
    render(<TaskOverview tasks={[
        { status: 'todo', dueDate: '2000-01-01T00:00:00Z' },
        { status: 'done', dueDate: '2000-01-01T00:00:00Z' },
        { status: 'todo' }, { status: 'in-progress', dueDate: '2999-01-01T00:00:00Z' },
    ]} />);
    const overview = screen.getByRole('region', { name: 'Project progress' });
    expect(within(overview).getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Overdue').parentElement).toHaveTextContent('1');
    expect(screen.getByRole('progressbar', { name: 'Completion' })).toHaveAttribute('value', '1');
});
