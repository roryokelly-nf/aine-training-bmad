import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import type { Template } from '$lib/schemas/template';

const { updateTemplate } = vi.hoisted(() => ({ updateTemplate: vi.fn() }));
vi.mock('$lib/state/template-store.svelte', () => ({ updateTemplate }));

import TemplateNameEditor from './TemplateNameEditor.svelte';

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

beforeEach(() => {
	updateTemplate.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('TemplateNameEditor', () => {
	it('renders with the template name as input value', () => {
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		expect(input.value).toBe('Deploy checklist');
	});

	it('valid rename: debounced save fires after 400ms', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateTemplate.mockResolvedValue(undefined);
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		await user.type(input, 'New name');
		vi.advanceTimersByTime(399);
		expect(updateTemplate).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(updateTemplate).toHaveBeenCalledTimes(1);
		expect(updateTemplate).toHaveBeenCalledWith(
			expect.objectContaining({ id: '01TEMPLATE00000000000000001', name: 'New name' })
		);
	});

	it('blur flushes debounce immediately', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateTemplate.mockResolvedValue(undefined);
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name');
		await user.clear(input);
		await user.type(input, 'Flushed');
		await user.tab();
		expect(updateTemplate).toHaveBeenCalledTimes(1);
		expect(updateTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Flushed' }));
	});

	it('trims whitespace before saving', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateTemplate.mockResolvedValue(undefined);
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		await user.type(input, '  trimmed  ');
		vi.advanceTimersByTime(400);
		expect(updateTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: 'trimmed' }));
	});

	it('empty name: shows "Name is required" error, does not call updateTemplate', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		vi.advanceTimersByTime(400);
		await tick();
		expect(updateTemplate).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('Name is required');
	});

	it('empty name: restores previous name on blur', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		await user.tab();
		expect(input.value).toBe('Deploy checklist');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(updateTemplate).not.toHaveBeenCalled();
	});

	it('whitespace-only treated as empty', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		await user.type(input, '   ');
		vi.advanceTimersByTime(400);
		await tick();
		expect(updateTemplate).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('Name is required');
	});

	it('error clears on next keystroke', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateTemplate.mockResolvedValue(undefined);
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		// trigger error
		await user.clear(input);
		vi.advanceTimersByTime(400);
		await tick();
		expect(screen.getByRole('alert')).not.toBeNull();
		// type to fix
		await user.type(input, 'A');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('aria-invalid is true when error is set', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		await user.clear(input);
		vi.advanceTimersByTime(400);
		await tick();
		expect(input.getAttribute('aria-invalid')).toBe('true');
	});

	it('aria-invalid is not true when no error', () => {
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		expect(input.getAttribute('aria-invalid')).not.toBe('true');
	});

	it('input has maxlength="200"', () => {
		render(TemplateNameEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Template name');
		expect(input.getAttribute('maxlength')).toBe('200');
	});

	it('restores to last saved name (not original) when cleared after a successful rename', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateTemplate.mockResolvedValue(undefined);
		render(TemplateNameEditor, { template: makeTemplate({ name: 'Alpha' }) });
		const input = screen.getByLabelText('Template name') as HTMLInputElement;
		// rename to Beta
		await user.clear(input);
		await user.type(input, 'Beta');
		vi.advanceTimersByTime(400);
		expect(updateTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Beta' }));
		// now clear
		await user.clear(input);
		await user.tab();
		// should restore to Beta (the last saved), not Alpha
		expect(input.value).toBe('Beta');
	});
});
