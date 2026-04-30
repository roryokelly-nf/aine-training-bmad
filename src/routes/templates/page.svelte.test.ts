import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';

const gotoMock = vi.fn();
const { loadRunSummariesMock, getRunSummaryMock } = vi.hoisted(() => ({
	loadRunSummariesMock: vi.fn().mockResolvedValue(undefined),
	getRunSummaryMock: vi.fn().mockReturnValue(undefined)
}));
let templatesState: Template[] = [];

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));
vi.mock('$app/paths', () => ({
	resolve: (p: string) => p
}));
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$lib/state/template-store.svelte', () => ({
	getTemplates: () => templatesState
}));
vi.mock('$lib/state/run-store.svelte', () => ({
	loadRunSummaries: loadRunSummariesMock,
	getRunSummary: getRunSummaryMock
}));

import Page from './+page.svelte';

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		id: '01H0000000000000000000000A',
		name: 'A template',
		items: [],
		createdAt: '2026-04-29T12:00:00.000Z',
		updatedAt: '2026-04-29T12:00:00.000Z',
		...overrides
	};
}

beforeEach(() => {
	gotoMock.mockReset();
	loadRunSummariesMock.mockReset().mockResolvedValue(undefined);
	getRunSummaryMock.mockReset().mockReturnValue(undefined);
	templatesState = [];
});

describe('/templates list page', () => {
	it('renders the header Create template button always', () => {
		render(Page);
		const headerBtns = screen.getAllByRole('button', { name: 'Create template' });
		expect(headerBtns.length).toBeGreaterThanOrEqual(1);
	});

	it('renders EmptyState with exact copy when there are no templates', () => {
		render(Page);
		expect(screen.getByText('No templates yet — create your first one.')).not.toBeNull();
	});

	it('EmptyState CTA navigates to /templates/new', async () => {
		const user = userEvent.setup();
		render(Page);
		const buttons = screen.getAllByRole('button', { name: 'Create template' });
		// EmptyState button is the second one (header button is first).
		await user.click(buttons[1]);
		expect(gotoMock).toHaveBeenCalledWith('/templates/new');
	});

	it('header Create template button navigates to /templates/new', async () => {
		const user = userEvent.setup();
		render(Page);
		const headerBtn = screen.getAllByRole('button', { name: 'Create template' })[0];
		await user.click(headerBtn);
		expect(gotoMock).toHaveBeenCalledWith('/templates/new');
	});

	it('renders one anchor per template when populated', () => {
		templatesState = [
			makeTemplate({ id: '01A', name: 'Alpha' }),
			makeTemplate({ id: '01B', name: 'Beta' })
		];
		render(Page);
		const links = screen.getAllByRole('link');
		expect(links.length).toBe(2);
	});

	it('does NOT render EmptyState when templates exist', () => {
		templatesState = [makeTemplate({ id: '01A', name: 'Alpha' })];
		render(Page);
		expect(screen.queryByText('No templates yet — create your first one.')).toBeNull();
	});

	it('shows run indicator when getRunSummary returns a run', () => {
		templatesState = [
			makeTemplate({
				id: '01A',
				name: 'Alpha',
				items: [
					{ id: 'i1', text: 'a', order: 0 },
					{ id: 'i2', text: 'b', order: 1 }
				]
			})
		];
		getRunSummaryMock.mockReturnValue({
			templateId: '01A',
			startedAt: '2026-04-30T10:00:00.000Z',
			itemStates: [
				{ itemId: 'i1', checked: true },
				{ itemId: 'i2', checked: false }
			]
		});
		render(Page);
		expect(screen.getByText('Run in progress — 1 of 2')).not.toBeNull();
	});

	it('sorts templates by updatedAt descending', () => {
		templatesState = [
			makeTemplate({ id: '01OLD', name: 'Oldest', updatedAt: '2026-01-01T00:00:00.000Z' }),
			makeTemplate({ id: '01NEW', name: 'Newest', updatedAt: '2026-12-01T00:00:00.000Z' }),
			makeTemplate({ id: '01MID', name: 'Middle', updatedAt: '2026-06-01T00:00:00.000Z' })
		];
		render(Page);
		const links = screen.getAllByRole('link');
		expect(links[0].getAttribute('href')).toBe('/templates/01NEW');
		expect(links[1].getAttribute('href')).toBe('/templates/01MID');
		expect(links[2].getAttribute('href')).toBe('/templates/01OLD');
	});
});
