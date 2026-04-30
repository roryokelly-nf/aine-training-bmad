import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '$lib/schemas/template';
import { StorageError } from '$lib/storage/storage-error';

const { addItem, updateItemText, removeItem, toastErrorMock } = vi.hoisted(() => ({
	addItem: vi.fn(),
	updateItemText: vi.fn(),
	removeItem: vi.fn(),
	toastErrorMock: vi.fn()
}));
vi.mock('$lib/state/template-store.svelte', () => ({ addItem, updateItemText, removeItem }));
vi.mock('$lib/state/toast-store.svelte', () => ({
	toastStore: { error: toastErrorMock, success: vi.fn(), info: vi.fn() }
}));

import ItemEditor from './ItemEditor.svelte';

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		id: '01TEMPLATE00000000000000001',
		name: 'Test Template',
		items: [],
		createdAt: '2026-04-29T12:00:00.000Z',
		updatedAt: '2026-04-29T12:00:00.000Z',
		...overrides
	};
}

beforeEach(() => {
	addItem.mockReset();
	updateItemText.mockReset();
	removeItem.mockReset();
	toastErrorMock.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('ItemEditor', () => {
	it('renders only the add-item input when template has 0 items', () => {
		render(ItemEditor, { template: makeTemplate() });
		expect(screen.getByLabelText('Add item')).not.toBeNull();
		expect(screen.queryAllByRole('button', { name: /Remove/ })).toHaveLength(0);
	});

	it('renders 2 row inputs + 2 Remove buttons + the add input for a 2-item template', () => {
		const template = makeTemplate({
			items: [
				{ id: 'I1', text: 'First', order: 0 },
				{ id: 'I2', text: 'Second', order: 1 }
			]
		});
		render(ItemEditor, { template });
		expect(screen.getByLabelText('Item 1 text')).not.toBeNull();
		expect(screen.getByLabelText('Item 2 text')).not.toBeNull();
		expect(screen.getAllByRole('button', { name: /Remove/ })).toHaveLength(2);
		expect(screen.getByLabelText('Add item')).not.toBeNull();
	});

	it('add: commit on Enter with non-empty text calls addItem and clears draft', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		addItem.mockResolvedValue(undefined);
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item') as HTMLInputElement;
		await user.type(input, 'Pack toothbrush');
		await user.keyboard('{Enter}');
		expect(addItem).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'Pack toothbrush');
		expect(input.value).toBe('');
	});

	it('add: Enter with empty text does NOT call addItem', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(ItemEditor, { template: makeTemplate() });
		await user.keyboard('{Enter}');
		expect(addItem).not.toHaveBeenCalled();
	});

	it('add: commit on non-empty blur calls addItem', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		addItem.mockResolvedValue(undefined);
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item');
		await user.type(input, 'Sunscreen');
		await user.tab();
		expect(addItem).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'Sunscreen');
	});

	it('add: blur with empty input does NOT call addItem', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item');
		await user.click(input);
		await user.tab();
		expect(addItem).not.toHaveBeenCalled();
	});

	it('add: trims whitespace before committing', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		addItem.mockResolvedValue(undefined);
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item');
		await user.type(input, '  hat  ');
		await user.keyboard('{Enter}');
		expect(addItem).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'hat');
	});

	it('edit: debounces — no call before 400ms, one call after', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateItemText.mockResolvedValue(undefined);
		const template = makeTemplate({ items: [{ id: 'I1', text: 'old', order: 0 }] });
		render(ItemEditor, { template });
		const rowInput = screen.getByLabelText('Item 1 text') as HTMLInputElement;
		await user.type(rowInput, 'x');
		vi.advanceTimersByTime(200);
		expect(updateItemText).not.toHaveBeenCalled();
		vi.advanceTimersByTime(200);
		expect(updateItemText).toHaveBeenCalledTimes(1);
		expect(updateItemText).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'I1', 'oldx');
	});

	it('edit: Enter flushes debounce immediately', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateItemText.mockResolvedValue(undefined);
		const template = makeTemplate({ items: [{ id: 'I1', text: 'old', order: 0 }] });
		render(ItemEditor, { template });
		const rowInput = screen.getByLabelText('Item 1 text');
		await user.type(rowInput, 'y');
		await user.keyboard('{Enter}');
		expect(updateItemText).toHaveBeenCalledTimes(1);
		expect(updateItemText).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'I1', 'oldy');
	});

	it('edit: blur flushes debounce', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		updateItemText.mockResolvedValue(undefined);
		const template = makeTemplate({ items: [{ id: 'I1', text: 'old', order: 0 }] });
		render(ItemEditor, { template });
		const rowInput = screen.getByLabelText('Item 1 text');
		await user.type(rowInput, 'z');
		await user.tab();
		expect(updateItemText).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'I1', 'oldz');
	});

	it('edit: empty text alone does NOT call updateItemText (guarded)', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const template = makeTemplate({ items: [{ id: 'I1', text: 'hello', order: 0 }] });
		render(ItemEditor, { template });
		const rowInput = screen.getByLabelText('Item 1 text') as HTMLInputElement;
		await user.clear(rowInput);
		vi.advanceTimersByTime(400);
		expect(updateItemText).not.toHaveBeenCalled();
	});

	it('remove: clicking Remove calls removeItem', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		removeItem.mockResolvedValue(undefined);
		const template = makeTemplate({ items: [{ id: 'I1', text: 'First', order: 0 }] });
		render(ItemEditor, { template });
		const btn = screen.getByRole('button', { name: 'Remove item: First' });
		await user.click(btn);
		expect(removeItem).toHaveBeenCalledWith('01TEMPLATE00000000000000001', 'I1');
	});

	it('add: QUOTA_EXCEEDED on addItem shows storage-full toast and preserves draft', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		addItem.mockRejectedValueOnce(new StorageError('QUOTA_EXCEEDED', 'full'));
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item') as HTMLInputElement;
		await user.type(input, 'My item');
		await user.keyboard('{Enter}');
		expect(toastErrorMock).toHaveBeenCalledWith(
			'Storage is full. Delete templates or archived runs to free space.'
		);
		expect(input.value).toBe('My item');
	});

	it('add input has maxlength="280"', () => {
		render(ItemEditor, { template: makeTemplate() });
		const input = screen.getByLabelText('Add item');
		expect(input.getAttribute('maxlength')).toBe('280');
	});

	it('row input has maxlength="280"', () => {
		const template = makeTemplate({ items: [{ id: 'I1', text: 'x', order: 0 }] });
		render(ItemEditor, { template });
		const input = screen.getByLabelText('Item 1 text');
		expect(input.getAttribute('maxlength')).toBe('280');
	});
});
