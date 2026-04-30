import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
	it('renders the message', () => {
		render(EmptyState, { message: 'Nothing here yet' });
		expect(screen.getByText('Nothing here yet')).not.toBeNull();
	});

	it('renders the CTA button when cta prop is provided', () => {
		render(EmptyState, {
			message: 'No templates yet — create your first one.',
			cta: { label: 'Create template', onClick: () => {} }
		});
		const btn = screen.getByRole('button', { name: 'Create template' });
		expect(btn).not.toBeNull();
	});

	it('does not render any button when cta is omitted', () => {
		render(EmptyState, { message: 'Empty' });
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('invokes the cta.onClick handler when CTA is clicked', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(EmptyState, {
			message: 'Empty',
			cta: { label: 'Go', onClick }
		});
		await user.click(screen.getByRole('button', { name: 'Go' }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
