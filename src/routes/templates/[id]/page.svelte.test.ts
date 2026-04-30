import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';
import type { Run } from '$lib/schemas/run';

const {
	gotoMock,
	deleteTemplateMock,
	toastSuccessMock,
	startRunMock,
	loadRunMock,
	getActiveRunMock,
	clearActiveRunMock
} = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	deleteTemplateMock: vi.fn(),
	toastSuccessMock: vi.fn(),
	startRunMock: vi.fn(),
	loadRunMock: vi.fn(),
	getActiveRunMock: vi.fn(),
	clearActiveRunMock: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { params: { id: '01TEMPLATE00000000000000001' } }
}));
vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/state/toast-store.svelte', () => ({
	toastStore: { success: toastSuccessMock, error: vi.fn(), info: vi.fn() }
}));

let templatesState: Template[] = [];
vi.mock('$lib/state/template-store.svelte', () => ({
	getTemplates: () => templatesState,
	addItem: vi.fn(),
	updateItemText: vi.fn(),
	removeItem: vi.fn(),
	updateTemplate: vi.fn(),
	deleteTemplate: deleteTemplateMock
}));

vi.mock('$lib/state/run-store.svelte', () => ({
	getActiveRun: getActiveRunMock,
	loadRun: loadRunMock,
	startRun: startRunMock,
	clearActiveRun: clearActiveRunMock
}));

import Page from './+page.svelte';

beforeEach(() => {
	templatesState = [];
	gotoMock.mockReset();
	deleteTemplateMock.mockReset();
	toastSuccessMock.mockReset();
	startRunMock.mockReset().mockResolvedValue({} as Run);
	loadRunMock.mockReset().mockResolvedValue(undefined);
	getActiveRunMock.mockReset().mockReturnValue(null);
	HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	});
	HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
		this.removeAttribute('open');
	});
});

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		id: '01TEMPLATE00000000000000001',
		name: 'Deploy checklist',
		items: [],
		createdAt: '2026-04-29T12:00:00.000Z',
		updatedAt: '2026-04-29T12:00:00.000Z',
		...overrides
	};
}

describe('/templates/[id] page', () => {
	it('renders the template name as an editable input', () => {
		templatesState = [makeTemplate()];
		render(Page);
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		expect(input.value).toBe('Deploy checklist');
	});

	it('renders "0 items" count line', () => {
		templatesState = [makeTemplate()];
		render(Page);
		expect(screen.getByText('0 items')).not.toBeNull();
	});

	it('mounts ItemEditor — add input is in the DOM', () => {
		templatesState = [makeTemplate()];
		render(Page);
		expect(screen.getByLabelText('Add item')).not.toBeNull();
	});

	it('renders nothing when the store does not contain the id', () => {
		templatesState = [];
		render(Page);
		expect(screen.queryByLabelText('Template name')).toBeNull();
	});

	// Run button (no active run)
	it('Run button has aria-disabled="true" when template has 0 items', () => {
		getActiveRunMock.mockReturnValue(null);
		templatesState = [makeTemplate({ items: [] })];
		render(Page);
		const btn = screen.getByRole('button', { name: 'Run' });
		expect(btn.getAttribute('aria-disabled')).toBe('true');
	});

	it('Run button has aria-disabled="false" when template has items', () => {
		getActiveRunMock.mockReturnValue(null);
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		const btn = screen.getByRole('button', { name: 'Run' });
		expect(btn.getAttribute('aria-disabled')).toBe('false');
	});

	// Resume run (active run exists)
	it('shows "Resume run" link when active run exists', () => {
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		expect(screen.getByRole('link', { name: 'Resume run' })).not.toBeNull();
	});

	it('"Resume run" link points to run route', () => {
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		const link = screen.getByRole('link', { name: 'Resume run' });
		expect(link.getAttribute('href')).toBe('/templates/01TEMPLATE00000000000000001/run');
	});

	it('secondary "Run" button visible when active run exists and template has items', () => {
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		expect(screen.getByRole('button', { name: 'Run' })).not.toBeNull();
	});

	it('secondary "Run" button hidden when active run exists but template has no items', () => {
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [] })];
		render(Page);
		expect(screen.queryByRole('button', { name: 'Run' })).toBeNull();
	});

	it('clicking Run with no existing run calls startRun and navigates', async () => {
		const user = userEvent.setup();
		getActiveRunMock.mockReturnValue(null);
		startRunMock.mockResolvedValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Run' }));
		expect(startRunMock).toHaveBeenCalled();
		expect(gotoMock).toHaveBeenCalledWith('/templates/01TEMPLATE00000000000000001/run');
	});

	it('clicking Run with existing run opens replace modal', async () => {
		const user = userEvent.setup();
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Run' }));
		expect(screen.getByText('Replace existing run?')).not.toBeNull();
	});

	it('Cancel in replace modal does not start run', async () => {
		const user = userEvent.setup();
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Run' }));
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(startRunMock).not.toHaveBeenCalled();
	});

	it('Continue in replace modal starts run and navigates', async () => {
		const user = userEvent.setup();
		getActiveRunMock.mockReturnValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		startRunMock.mockResolvedValue({
			templateId: '01TEMPLATE00000000000000001',
			startedAt: 'x',
			itemStates: []
		});
		templatesState = [makeTemplate({ items: [{ id: 'I1', text: 'step', order: 0 }] })];
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Run' }));
		await user.click(screen.getByRole('button', { name: 'Continue' }));
		expect(startRunMock).toHaveBeenCalled();
		expect(gotoMock).toHaveBeenCalledWith('/templates/01TEMPLATE00000000000000001/run');
	});

	// Delete flow (preserved from 1.7)
	it('renders "Delete template" button', () => {
		templatesState = [makeTemplate()];
		render(Page);
		expect(screen.getByRole('button', { name: 'Delete template' })).not.toBeNull();
	});

	it('clicking Delete in the delete modal calls deleteTemplate and navigates', async () => {
		const user = userEvent.setup();
		deleteTemplateMock.mockResolvedValue(undefined);
		templatesState = [makeTemplate()];
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Delete template' }));
		await user.click(screen.getByRole('button', { name: 'Delete' }));
		expect(deleteTemplateMock).toHaveBeenCalledWith('01TEMPLATE00000000000000001');
		expect(toastSuccessMock).toHaveBeenCalledWith('Template deleted.');
		expect(gotoMock).toHaveBeenCalledWith('/templates');
	});
});
