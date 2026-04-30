import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	loadRun,
	startRun,
	getActiveRun,
	clearActiveRun,
	resetRun,
	tickItem,
	loadRunSummaries,
	getRunSummary,
	_resetForTests
} from './run-store.svelte';
import { StorageError } from '$lib/storage/storage-error';
import { _setStorageForTests } from '$lib/storage';
import type { StorageBackend, Run } from '$lib/storage';
import type { Template } from '$lib/schemas/template';

function makeFakeBackend(): StorageBackend & { _runs: Map<string, Run> } {
	const store = new Map<string, import('$lib/schemas/template').Template>();
	const runs = new Map<string, Run>();
	return {
		_runs: runs,
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
		async archiveRun() {}
	};
}

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		id: '01TEMPLATE00000000000000001',
		name: 'Test',
		items: [
			{ id: 'I1', text: 'Step 1', order: 0 },
			{ id: 'I2', text: 'Step 2', order: 1 }
		],
		createdAt: '2026-04-30T10:00:00.000Z',
		updatedAt: '2026-04-30T10:00:00.000Z',
		...overrides
	};
}

beforeEach(() => {
	_resetForTests();
});

describe('run-store', () => {
	it('loadRun sets activeRun from backend', async () => {
		const fake = makeFakeBackend();
		const run: Run = {
			templateId: '01TEMPLATE00000000000000001',
			startedAt: '2026-04-30T10:00:00.000Z',
			itemStates: []
		};
		fake._runs.set('01TEMPLATE00000000000000001', run);
		_setStorageForTests(fake);
		await loadRun('01TEMPLATE00000000000000001');
		expect(getActiveRun()).toEqual(run);
	});

	it('loadRun with no stored run sets activeRun to null', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		await loadRun('NONEXISTENT');
		expect(getActiveRun()).toBeNull();
	});

	it('startRun creates run with correct templateId and all items unchecked', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		const template = makeTemplate();
		const run = await startRun(template);
		expect(run.templateId).toBe(template.id);
		expect(run.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(run.itemStates).toEqual([
			{ itemId: 'I1', checked: false },
			{ itemId: 'I2', checked: false }
		]);
		expect(getActiveRun()).toEqual(run);
	});

	it('startRun persists run to backend', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		const template = makeTemplate();
		await startRun(template);
		expect(fake._runs.get(template.id)).toBeDefined();
	});

	it('startRun replaces an existing run (only one run per templateId in storage)', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		const template = makeTemplate();
		await startRun(template);
		await startRun(template);
		expect(fake._runs.size).toBe(1);
		expect(fake._runs.get(template.id)).toBeDefined();
	});

	describe('resetRun', () => {
		it('clears the run from storage backend', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			const template = makeTemplate();
			await startRun(template);
			expect(fake._runs.has(template.id)).toBe(true);
			await resetRun(template.id);
			expect(fake._runs.has(template.id)).toBe(false);
		});

		it('sets activeRun to null', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			const template = makeTemplate();
			await startRun(template);
			expect(getActiveRun()).not.toBeNull();
			await resetRun(template.id);
			expect(getActiveRun()).toBeNull();
		});
	});

	it('clearActiveRun sets activeRun to null without touching storage', async () => {
		const fake = makeFakeBackend();
		_setStorageForTests(fake);
		const template = makeTemplate();
		await startRun(template);
		expect(getActiveRun()).not.toBeNull();
		clearActiveRun();
		expect(getActiveRun()).toBeNull();
		expect(fake._runs.has(template.id)).toBe(true);
	});

	describe('tickItem', () => {
		it('flips checked on the matching item', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await startRun(makeTemplate());
			await tickItem('I1');
			expect(getActiveRun()!.itemStates.find((s) => s.itemId === 'I1')!.checked).toBe(true);
		});

		it('toggling twice restores original state', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await startRun(makeTemplate());
			await tickItem('I1');
			await tickItem('I1');
			expect(getActiveRun()!.itemStates.find((s) => s.itemId === 'I1')!.checked).toBe(false);
		});

		it('persists updated run to backend', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await startRun(makeTemplate());
			await tickItem('I1');
			expect(fake._runs.get('01TEMPLATE00000000000000001')!.itemStates[0].checked).toBe(true);
		});

		it('reverts optimistic state on storage failure', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await startRun(makeTemplate());
			vi.spyOn(fake, 'saveRun').mockRejectedValueOnce(new StorageError('QUOTA_EXCEEDED', 'full'));
			await expect(tickItem('I1')).rejects.toBeInstanceOf(StorageError);
			expect(getActiveRun()!.itemStates.find((s) => s.itemId === 'I1')!.checked).toBe(false);
		});

		it('throws if no active run', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await expect(tickItem('I1')).rejects.toThrow('no active run');
		});
	});

	describe('loadRunSummaries / getRunSummary', () => {
		it('loads runs for all provided templateIds', async () => {
			const fake = makeFakeBackend();
			const run: Run = {
				templateId: '01TEMPLATE00000000000000001',
				startedAt: '2026-04-30T10:00:00.000Z',
				itemStates: [{ itemId: 'I1', checked: true }]
			};
			fake._runs.set('01TEMPLATE00000000000000001', run);
			_setStorageForTests(fake);
			await loadRunSummaries(['01TEMPLATE00000000000000001']);
			expect(getRunSummary('01TEMPLATE00000000000000001')).toEqual(run);
		});

		it('stores null for templateIds with no run', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadRunSummaries(['NO_RUN_HERE']);
			expect(getRunSummary('NO_RUN_HERE')).toBeNull();
		});

		it('returns undefined for a templateId that was never loaded', async () => {
			const fake = makeFakeBackend();
			_setStorageForTests(fake);
			await loadRunSummaries([]);
			expect(getRunSummary('NEVER_LOADED')).toBeUndefined();
		});

		it('loads multiple templateIds correctly', async () => {
			const fake = makeFakeBackend();
			const run: Run = {
				templateId: 'T1',
				startedAt: '2026-04-30T10:00:00.000Z',
				itemStates: []
			};
			fake._runs.set('T1', run);
			_setStorageForTests(fake);
			await loadRunSummaries(['T1', 'T2']);
			expect(getRunSummary('T1')).toEqual(run);
			expect(getRunSummary('T2')).toBeNull();
		});
	});
});
