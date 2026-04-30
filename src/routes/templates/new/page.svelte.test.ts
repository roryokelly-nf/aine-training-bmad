import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageError } from '$lib/storage/storage-error';

const gotoMock = vi.fn();
const addTemplateMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));
vi.mock('$app/paths', () => ({
	resolve: (p: string) => p
}));
vi.mock('$lib/state/template-store.svelte', () => ({
	addTemplate: (...args: unknown[]) => addTemplateMock(...args)
}));
vi.mock('$lib/state/toast-store.svelte', () => ({
	toastStore: {
		error: (m: string) => toastErrorMock(m),
		success: vi.fn(),
		info: vi.fn()
	}
}));

import Page from './+page.svelte';

beforeEach(() => {
	gotoMock.mockReset();
	addTemplateMock.mockReset();
	toastErrorMock.mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

function getInput(): HTMLInputElement {
	return screen.getByLabelText('Template name') as HTMLInputElement;
}

function getSubmit(): HTMLButtonElement {
	return screen.getByRole('button', { name: /creat/i }) as HTMLButtonElement;
}

describe('/templates/new', () => {
	it('autofocuses the name input on render', () => {
		render(Page);
		expect(document.activeElement).toBe(getInput());
	});

	it('shows required error and does not call addTemplate on empty submit', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(getSubmit());
		expect(screen.getByRole('alert').textContent).toBe('Template name is required');
		expect(addTemplateMock).not.toHaveBeenCalled();
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('treats whitespace-only input as empty (trim)', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(getInput(), '   ');
		await user.click(getSubmit());
		expect(screen.getByRole('alert').textContent).toBe('Template name is required');
		expect(addTemplateMock).not.toHaveBeenCalled();
	});

	it('shows max-length error on 201 chars and does not call addTemplate', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(getInput());
		await user.paste('a'.repeat(201));
		await user.click(getSubmit());
		expect(screen.getByRole('alert').textContent).toBe(
			'Template name must be 200 characters or fewer'
		);
		expect(addTemplateMock).not.toHaveBeenCalled();
	});

	it('happy path: calls addTemplate with trimmed name and navigates to detail', async () => {
		const user = userEvent.setup();
		addTemplateMock.mockResolvedValueOnce({ id: '01TESTID', name: 'Deploy', items: [] });
		render(Page);
		await user.type(getInput(), '  Deploy  ');
		await user.click(getSubmit());
		expect(addTemplateMock).toHaveBeenCalledWith({ name: 'Deploy', items: [] });
		expect(gotoMock).toHaveBeenCalledWith('/templates/01TESTID');
	});

	it('Enter key submits the form', async () => {
		const user = userEvent.setup();
		addTemplateMock.mockResolvedValueOnce({ id: '01ENTER', name: 'X', items: [] });
		render(Page);
		await user.type(getInput(), 'X');
		await user.keyboard('{Enter}');
		expect(addTemplateMock).toHaveBeenCalledTimes(1);
		expect(gotoMock).toHaveBeenCalledWith('/templates/01ENTER');
	});

	it('Escape key navigates to /templates', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(getInput(), 'partial');
		await user.keyboard('{Escape}');
		expect(gotoMock).toHaveBeenCalledWith('/templates');
		expect(addTemplateMock).not.toHaveBeenCalled();
	});

	it('QUOTA_EXCEEDED: shows toast, stays on page, preserves input', async () => {
		const user = userEvent.setup();
		addTemplateMock.mockRejectedValueOnce(new StorageError('QUOTA_EXCEEDED', 'full'));
		render(Page);
		await user.type(getInput(), 'My template');
		await user.click(getSubmit());
		expect(toastErrorMock).toHaveBeenCalledWith('Storage is full. Free up space and try again.');
		expect(gotoMock).not.toHaveBeenCalled();
		expect(getInput().value).toBe('My template');
	});

	it('disables the submit button while addTemplate is pending', async () => {
		const user = userEvent.setup();
		let resolveAdd!: (t: { id: string; name: string; items: [] }) => void;
		addTemplateMock.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveAdd = resolve;
				})
		);
		render(Page);
		await user.type(getInput(), 'Slow');
		await user.click(getSubmit());
		expect(getSubmit().disabled).toBe(true);
		expect(getSubmit().textContent?.trim()).toBe('Creating…');
		resolveAdd({ id: '01SLOW', name: 'Slow', items: [] });
	});

	it('returns focus to the name input on validation error', async () => {
		const user = userEvent.setup();
		render(Page);
		// Click submit (which moves focus to the button), then assert focus returns.
		await user.click(getSubmit());
		expect(document.activeElement).toBe(getInput());
	});
});
