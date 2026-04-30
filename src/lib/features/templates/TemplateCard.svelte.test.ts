import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';
import type { Run } from '$lib/schemas/run';

vi.mock('$app/paths', () => ({
	resolve: (p: string) => p
}));

import TemplateCard from './TemplateCard.svelte';

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

describe('TemplateCard', () => {
	it('renders the template name', () => {
		render(TemplateCard, { template: makeTemplate({ name: 'Deploy runbook' }) });
		expect(screen.getByText('Deploy runbook')).not.toBeNull();
	});

	it('renders "0 items" for an empty list', () => {
		render(TemplateCard, { template: makeTemplate({ items: [] }) });
		expect(screen.getByText('0 items')).not.toBeNull();
	});

	it('renders "1 item" (singular) for a one-item list', () => {
		render(TemplateCard, {
			template: makeTemplate({ items: [{ id: 'i1', text: 'one', order: 0 }] })
		});
		expect(screen.getByText('1 item')).not.toBeNull();
	});

	it('renders "3 items" (plural) for a three-item list', () => {
		render(TemplateCard, {
			template: makeTemplate({
				items: [
					{ id: 'i1', text: 'a', order: 0 },
					{ id: 'i2', text: 'b', order: 1 },
					{ id: 'i3', text: 'c', order: 2 }
				]
			})
		});
		expect(screen.getByText('3 items')).not.toBeNull();
	});

	it('renders an anchor whose href contains the template id', () => {
		render(TemplateCard, { template: makeTemplate({ id: '01ABCXYZ' }) });
		const link = screen.getByRole('link');
		expect(link.getAttribute('href')).toBe('/templates/01ABCXYZ');
	});

	describe('run indicator', () => {
		function makeRun(overrides: Partial<Run> = {}): Run {
			return {
				templateId: '01H0000000000000000000000A',
				startedAt: '2026-04-30T10:00:00.000Z',
				itemStates: [],
				...overrides
			};
		}

		it('shows "Run in progress — 2 of 3" when run has 2 checked items', () => {
			const template = makeTemplate({
				items: [
					{ id: 'i1', text: 'a', order: 0 },
					{ id: 'i2', text: 'b', order: 1 },
					{ id: 'i3', text: 'c', order: 2 }
				]
			});
			const run = makeRun({
				itemStates: [
					{ itemId: 'i1', checked: true },
					{ itemId: 'i2', checked: true },
					{ itemId: 'i3', checked: false }
				]
			});
			render(TemplateCard, { template, run });
			expect(screen.getByText('Run in progress — 2 of 3')).not.toBeNull();
		});

		it('does not render run indicator when run is null', () => {
			render(TemplateCard, { template: makeTemplate(), run: null });
			expect(screen.queryByText(/Run in progress/)).toBeNull();
		});

		it('does not render run indicator when run is undefined (default)', () => {
			render(TemplateCard, { template: makeTemplate() });
			expect(screen.queryByText(/Run in progress/)).toBeNull();
		});
	});
});
