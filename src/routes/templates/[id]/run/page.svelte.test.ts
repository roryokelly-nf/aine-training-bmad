import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';
import type { Run } from '$lib/schemas/run';
import { StorageError } from '$lib/storage/storage-error';

const { tickItemMock, getActiveRunMock, toastErrorMock } = vi.hoisted(() => ({
	tickItemMock: vi.fn(),
	getActiveRunMock: vi.fn(),
	toastErrorMock: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { params: { id: '01TEMPLATE00000000000000001' } }
}));
vi.mock('$lib/state/run-store.svelte', () => ({
	getActiveRun: getActiveRunMock,
	tickItem: tickItemMock
}));
vi.mock('$lib/state/toast-store.svelte', () => ({
	toastStore: { error: toastErrorMock, success: vi.fn(), info: vi.fn() }
}));

let templatesState: Template[] = [];
vi.mock('$lib/state/template-store.svelte', () => ({
	getTemplates: () => templatesState
}));

import Page from './+page.svelte';

function makeTemplate(): Template {
	return {
		id: '01TEMPLATE00000000000000001',
		name: 'Deploy',
		items: [
			{ id: 'I1', text: 'Step 1', order: 0 },
			{ id: 'I2', text: 'Step 2', order: 1 }
		],
		createdAt: '2026-04-30T10:00:00.000Z',
		updatedAt: '2026-04-30T10:00:00.000Z'
	};
}

function makeRun(overrides: Partial<Run> = {}): Run {
	return {
		templateId: '01TEMPLATE00000000000000001',
		startedAt: '2026-04-30T10:00:00.000Z',
		itemStates: [
			{ itemId: 'I1', checked: false },
			{ itemId: 'I2', checked: false }
		],
		...overrides
	};
}

beforeEach(() => {
	templatesState = [];
	tickItemMock.mockReset().mockResolvedValue(undefined);
	getActiveRunMock.mockReset().mockReturnValue(null);
	toastErrorMock.mockReset();
});

describe('/templates/[id]/run page', () => {
	it('renders "0 of 2" counter when no items checked', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		expect(screen.getByText('0 of 2')).not.toBeNull();
	});

	it('renders "1 of 2" counter when one item checked', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(
			makeRun({
				itemStates: [
					{ itemId: 'I1', checked: true },
					{ itemId: 'I2', checked: false }
				]
			})
		);
		render(Page);
		expect(screen.getByText('1 of 2')).not.toBeNull();
	});

	it('renders each item as a button', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		expect(screen.getByRole('button', { name: 'Step 1' })).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Step 2' })).not.toBeNull();
	});

	it('unchecked item has aria-pressed="false"', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		const btn = screen.getByRole('button', { name: 'Step 1' });
		expect(btn.getAttribute('aria-pressed')).toBe('false');
	});

	it('checked item has aria-pressed="true"', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(
			makeRun({
				itemStates: [
					{ itemId: 'I1', checked: true },
					{ itemId: 'I2', checked: false }
				]
			})
		);
		render(Page);
		const btn = screen.getByRole('button', { name: 'Step 1' });
		expect(btn.getAttribute('aria-pressed')).toBe('true');
	});

	it('clicking item calls tickItem with correct id', async () => {
		const user = userEvent.setup();
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Step 1' }));
		expect(tickItemMock).toHaveBeenCalledWith('I1');
	});

	it('storage failure calls toastStore.error', async () => {
		const user = userEvent.setup();
		tickItemMock.mockRejectedValueOnce(new StorageError('QUOTA_EXCEEDED', 'full'));
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Step 1' }));
		expect(toastErrorMock).toHaveBeenCalledWith('Failed to save tick state. Please try again.');
	});

	it('renders fallback when no active run', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(null);
		render(Page);
		expect(screen.getByText(/No active run/)).not.toBeNull();
	});
});
