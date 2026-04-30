import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';
import type { Run } from '$lib/schemas/run';
import { StorageError } from '$lib/storage/storage-error';

const { tickItemMock, getActiveRunMock, toastErrorMock, resetRunMock, gotoMock, toastSuccessMock } =
	vi.hoisted(() => ({
		tickItemMock: vi.fn(),
		getActiveRunMock: vi.fn(),
		toastErrorMock: vi.fn(),
		resetRunMock: vi.fn(),
		gotoMock: vi.fn(),
		toastSuccessMock: vi.fn()
	}));

vi.mock('$app/state', () => ({
	page: { params: { id: '01TEMPLATE00000000000000001' } }
}));
vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$lib/state/run-store.svelte', () => ({
	getActiveRun: getActiveRunMock,
	tickItem: tickItemMock,
	resetRun: resetRunMock
}));
vi.mock('$lib/state/toast-store.svelte', () => ({
	toastStore: { error: toastErrorMock, success: toastSuccessMock, info: vi.fn() }
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
	resetRunMock.mockReset().mockResolvedValue(undefined);
	gotoMock.mockReset();
	toastSuccessMock.mockReset();
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

	it('ticked item text renders with ticked color class', () => {
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
		const textSpan = btn.querySelector('span:not([aria-hidden])');
		expect(textSpan?.className).toContain('text-[#3A5247]');
	});

	it('items render in template order', () => {
		templatesState = [makeTemplate()];
		getActiveRunMock.mockReturnValue(makeRun());
		render(Page);
		const buttons = screen.getAllByRole('button');
		expect(buttons[0].textContent).toContain('Step 1');
		expect(buttons[1].textContent).toContain('Step 2');
	});

	describe('go-state', () => {
		it('renders "Done." when all items are checked', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(
				makeRun({
					itemStates: [
						{ itemId: 'I1', checked: true },
						{ itemId: 'I2', checked: true }
					]
				})
			);
			render(Page);
			expect(screen.getByText('Done.')).not.toBeNull();
		});

		it('does not render "Done." when not all items are checked', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(makeRun());
			render(Page);
			expect(screen.queryByText('Done.')).toBeNull();
		});

		it('does not render "Done." when run has zero items', () => {
			templatesState = [{ ...makeTemplate(), items: [] }];
			getActiveRunMock.mockReturnValue({
				templateId: '01TEMPLATE00000000000000001',
				startedAt: '2026-04-30T10:00:00.000Z',
				itemStates: []
			});
			render(Page);
			expect(screen.queryByText('Done.')).toBeNull();
		});

		it('counter is not rendered when in go-state', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(
				makeRun({
					itemStates: [
						{ itemId: 'I1', checked: true },
						{ itemId: 'I2', checked: true }
					]
				})
			);
			render(Page);
			expect(screen.queryByText('2 of 2')).toBeNull();
		});

		it('items remain visible in go-state', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(
				makeRun({
					itemStates: [
						{ itemId: 'I1', checked: true },
						{ itemId: 'I2', checked: true }
					]
				})
			);
			render(Page);
			expect(screen.getByRole('button', { name: 'Step 1' })).not.toBeNull();
			expect(screen.getByRole('button', { name: 'Step 2' })).not.toBeNull();
		});
	});

	describe('reset', () => {
		it('renders Reset button when run is active', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(makeRun());
			render(Page);
			expect(screen.getByRole('button', { name: 'Reset' })).not.toBeNull();
		});

		it('clicking Reset opens confirm modal', async () => {
			const user = userEvent.setup();
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(makeRun());
			render(Page);
			await user.click(screen.getByRole('button', { name: 'Reset' }));
			expect(screen.getByText('Reset this run?')).not.toBeNull();
		});

		it('confirming reset calls resetRun, toasts success, and navigates', async () => {
			const user = userEvent.setup();
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(makeRun());
			render(Page);
			await user.click(screen.getByRole('button', { name: 'Reset' }));
			const dialog = screen.getByRole('dialog');
			await user.click(within(dialog).getByRole('button', { name: 'Reset' }));
			expect(resetRunMock).toHaveBeenCalledWith('01TEMPLATE00000000000000001');
			expect(toastSuccessMock).toHaveBeenCalledWith('Run reset.');
			expect(gotoMock).toHaveBeenCalled();
		});

		it('cancelling reset does not call resetRun', async () => {
			const user = userEvent.setup();
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(makeRun());
			render(Page);
			await user.click(screen.getByRole('button', { name: 'Reset' }));
			await user.click(screen.getByRole('button', { name: 'Cancel' }));
			expect(resetRunMock).not.toHaveBeenCalled();
		});

		it('Reset button has primary style in go-state', () => {
			templatesState = [makeTemplate()];
			getActiveRunMock.mockReturnValue(
				makeRun({
					itemStates: [
						{ itemId: 'I1', checked: true },
						{ itemId: 'I2', checked: true }
					]
				})
			);
			render(Page);
			const btn = screen.getByRole('button', { name: 'Reset' });
			expect(btn.className).toContain('bg-slate-900');
		});
	});
});
