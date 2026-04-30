import { describe, it, expect, beforeEach } from 'vitest';
import {
	loadTemplates,
	addTemplate,
	updateTemplate,
	deleteTemplate,
	addItem,
	updateItemText,
	removeItem,
	getTemplates,
	_resetForTests
} from './template-store.svelte';
import { _setStorageForTests } from '$lib/storage';
import type { StorageBackend, Run } from '$lib/storage';
import type { Template } from '$lib/schemas/template';

function makeFakeBackend(): StorageBackend & { _store: Map<string, Template> } {
	const store = new Map<string, Template>();
	const runs = new Map<string, Run>();
	return {
		_store: store,
		async getTemplates() {
			return Array.from(store.values());
		},
		async getTemplate(id) {
			return store.get(id) ?? null;
		},
		async saveTemplate(t) {
			store.set(t.id, t);
		},
		async deleteTemplate(id) {
			store.delete(id);
		},
		async getActiveRun(templateId) {
			return runs.get(templateId) ?? null;
		},
		async saveRun(r) {
			runs.set(r.templateId, r);
		},
		async clearRun(templateId) {
			runs.delete(templateId);
		},
		async archiveRun() {
			/* not exercised here */
		}
	};
}

describe('template-store', () => {
	beforeEach(() => {
		_resetForTests();
	});

	it('loadTemplates hydrates from backend', async () => {
		const fake = makeFakeBackend();
		fake._store.set('A', {
			id: 'A',
			name: 'A',
			items: [],
			createdAt: '2026-04-29T10:00:00.000Z',
			updatedAt: '2026-04-29T10:00:00.000Z'
		});
		_setStorageForTests(fake);
		await loadTemplates();
		expect(getTemplates()).toHaveLength(1);
		expect(getTemplates()[0].id).toBe('A');
	});

	it('addTemplate generates id + persists + appends to state', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		await loadTemplates();
		const created = await addTemplate({ name: 'New', items: [] });
		expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
		expect(fake._store.has(created.id)).toBe(true);
		expect(getTemplates()).toHaveLength(1);
	});

	it('updateTemplate refreshes updatedAt and replaces in state', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		await loadTemplates();
		const t = await addTemplate({ name: 'Old', items: [] });
		const before = t.updatedAt;
		await new Promise((r) => setTimeout(r, 5));
		await updateTemplate({ ...t, name: 'New' });
		const updated = getTemplates()[0];
		expect(updated.name).toBe('New');
		expect(updated.updatedAt).not.toBe(before);
	});

	it('deleteTemplate removes from backend and state', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		await loadTemplates();
		const t = await addTemplate({ name: 'X', items: [] });
		await deleteTemplate(t.id);
		expect(getTemplates()).toHaveLength(0);
		expect(fake._store.has(t.id)).toBe(false);
	});

	it('deleteTemplate also clears the active run for that template', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		await loadTemplates();
		const t = await addTemplate({ name: 'X', items: [] });
		await fake.saveRun({ templateId: t.id, startedAt: '2026-04-29T10:00:00.000Z', itemStates: [] });
		expect(await fake.getActiveRun(t.id)).not.toBeNull();
		await deleteTemplate(t.id);
		expect(await fake.getActiveRun(t.id)).toBeNull();
	});

	describe('item helpers', () => {
		it('addItem appends a new item with order 0 when list is empty and refreshes updatedAt', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			const t = await addTemplate({ name: 'T', items: [] });
			const before = t.updatedAt;
			await new Promise((r) => setTimeout(r, 5));
			await addItem(t.id, 'first');
			const after = getTemplates()[0];
			expect(after.items).toHaveLength(1);
			expect(after.items[0].text).toBe('first');
			expect(after.items[0].order).toBe(0);
			expect(after.items[0].id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
			expect(after.updatedAt).not.toBe(before);
			expect(fake._store.get(t.id)!.items).toHaveLength(1);
		});

		it('addItem assigns order = max(existing) + 1 for subsequent items', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			const t = await addTemplate({ name: 'T', items: [] });
			await addItem(t.id, 'a');
			await addItem(t.id, 'b');
			await addItem(t.id, 'c');
			const items = getTemplates()[0].items;
			expect(items.map((i) => i.order)).toEqual([0, 1, 2]);
		});

		it('addItem after removeItem chooses an order greater than highest remaining (gap-preserving)', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			const t = await addTemplate({ name: 'T', items: [] });
			await addItem(t.id, 'a');
			await addItem(t.id, 'b');
			await addItem(t.id, 'c');
			const items = getTemplates()[0].items;
			// remove the middle one (order 1)
			await removeItem(t.id, items[1].id);
			await addItem(t.id, 'd');
			const after = getTemplates()[0].items;
			expect(after).toHaveLength(3);
			expect(after.map((i) => i.text)).toEqual(['a', 'c', 'd']);
			// new item's order should exceed max remaining (which was 2)
			expect(after[after.length - 1].order).toBe(3);
		});

		it('updateItemText updates only the matching item and refreshes updatedAt', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			const t = await addTemplate({ name: 'T', items: [] });
			await addItem(t.id, 'a');
			await addItem(t.id, 'b');
			const before = getTemplates()[0].updatedAt;
			await new Promise((r) => setTimeout(r, 5));
			const items = getTemplates()[0].items;
			await updateItemText(t.id, items[0].id, 'A!');
			const after = getTemplates()[0];
			expect(after.items[0].text).toBe('A!');
			expect(after.items[1].text).toBe('b');
			expect(after.updatedAt).not.toBe(before);
		});

		it('removeItem filters out the matching item and refreshes updatedAt', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			const t = await addTemplate({ name: 'T', items: [] });
			await addItem(t.id, 'a');
			await addItem(t.id, 'b');
			const before = getTemplates()[0].updatedAt;
			await new Promise((r) => setTimeout(r, 5));
			const items = getTemplates()[0].items;
			await removeItem(t.id, items[0].id);
			const after = getTemplates()[0];
			expect(after.items).toHaveLength(1);
			expect(after.items[0].text).toBe('b');
			expect(after.updatedAt).not.toBe(before);
		});

		it('addItem throws when template id is unknown', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			await expect(addItem('NOPE', 'x')).rejects.toThrow('template not found');
		});

		it('updateItemText throws when template id is unknown', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			await expect(updateItemText('NOPE', 'I1', 'x')).rejects.toThrow('template not found');
		});

		it('removeItem throws when template id is unknown', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadTemplates();
			await expect(removeItem('NOPE', 'I1')).rejects.toThrow('template not found');
		});
	});
});
