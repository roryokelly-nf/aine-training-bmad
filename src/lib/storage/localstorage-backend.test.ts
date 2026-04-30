import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageBackend } from './localstorage-backend';
import { StorageError } from './storage-error';
import { consumeFutureSchemaWarning, _resetFutureSchemaForTests } from './storage-events';
import type { Template } from '$lib/schemas/template';

const validTemplate = (overrides: Partial<Template> = {}): Template => ({
	id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
	name: 'Pre-flight checklist',
	items: [{ id: '01ARZ3NDEKTSV4RRFFQ69G5FAW', text: 'Pack laptop', order: 0 }],
	createdAt: '2026-04-29T10:00:00.000Z',
	updatedAt: '2026-04-29T10:00:00.000Z',
	...overrides
});

describe('LocalStorageBackend (happy path)', () => {
	beforeEach(() => {
		localStorage.clear();
		_resetFutureSchemaForTests();
	});

	it('saves and retrieves a template', async () => {
		const backend = new LocalStorageBackend();
		await backend.saveTemplate(validTemplate());
		const all = await backend.getTemplates();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe('Pre-flight checklist');
	});

	it('getTemplate returns null for missing id', async () => {
		const backend = new LocalStorageBackend();
		const out = await backend.getTemplate('NONEXISTENT');
		expect(out).toBeNull();
	});

	it('deleteTemplate removes from index and key', async () => {
		const backend = new LocalStorageBackend();
		const t = validTemplate();
		await backend.saveTemplate(t);
		await backend.deleteTemplate(t.id);
		const all = await backend.getTemplates();
		expect(all).toHaveLength(0);
		expect(localStorage.getItem(`cl:tpl:${t.id}`)).toBeNull();
	});

	it('persists schemaVersion: 1 envelope', async () => {
		const backend = new LocalStorageBackend();
		const t = validTemplate();
		await backend.saveTemplate(t);
		const raw = localStorage.getItem(`cl:tpl:${t.id}`);
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw!);
		expect(parsed.schemaVersion).toBe(1);
		expect(parsed.template.id).toBe(t.id);
	});
});

describe('LocalStorageBackend (failure modes)', () => {
	beforeEach(() => {
		localStorage.clear();
		_resetFutureSchemaForTests();
		vi.restoreAllMocks();
	});

	it('rejects with INVALID when template fails schema parse', async () => {
		const backend = new LocalStorageBackend();
		const bad = { ...validTemplate(), name: '' };
		await expect(backend.saveTemplate(bad as Template)).rejects.toBeInstanceOf(StorageError);
		await expect(backend.saveTemplate(bad as Template)).rejects.toMatchObject({ kind: 'INVALID' });
	});

	it('rejects with QUOTA_EXCEEDED when setItem throws QuotaExceededError', async () => {
		const backend = new LocalStorageBackend();
		const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});
		try {
			await expect(backend.saveTemplate(validTemplate())).rejects.toMatchObject({
				kind: 'QUOTA_EXCEEDED'
			});
		} finally {
			spy.mockRestore();
		}
	});

	it('skips malformed blobs in getTemplates and continues', async () => {
		const backend = new LocalStorageBackend();
		const good = validTemplate();
		await backend.saveTemplate(good);
		// pollute the index with a bad id whose blob is malformed
		const ids = JSON.parse(localStorage.getItem('cl:tpl:index')!);
		ids.push('BADID');
		localStorage.setItem('cl:tpl:index', JSON.stringify(ids));
		localStorage.setItem('cl:tpl:BADID', '{not json');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const all = await backend.getTemplates();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(good.id);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('rolls back per-template write if index write fails', async () => {
		const backend = new LocalStorageBackend();
		const t = validTemplate();
		const spy = vi.spyOn(localStorage, 'setItem');
		spy.mockImplementationOnce((k, v) => {
			localStorage.setItem.call(localStorage, k, v);
		});
		spy.mockImplementationOnce(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});
		try {
			await expect(backend.saveTemplate(t)).rejects.toMatchObject({ kind: 'QUOTA_EXCEEDED' });
		} finally {
			spy.mockRestore();
		}
		expect(localStorage.getItem(`cl:tpl:${t.id}`)).toBeNull();
	});
});

describe('LocalStorageBackend (UNAVAILABLE)', () => {
	it('rejects all methods when probe fails', async () => {
		const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
			throw new Error('no storage');
		});
		try {
			const backend = new LocalStorageBackend();
			await expect(backend.getTemplates()).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
			await expect(backend.saveTemplate(validTemplate())).rejects.toMatchObject({
				kind: 'UNAVAILABLE'
			});
			await expect(backend.deleteTemplate('x')).rejects.toMatchObject({ kind: 'UNAVAILABLE' });
		} finally {
			spy.mockRestore();
		}
	});
});

describe('LocalStorageBackend (sanitize-on-read for legacy items missing order)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	function writeLegacyBlob(id: string, items: Array<Record<string, unknown>>) {
		const envelope = {
			schemaVersion: 1,
			template: {
				id,
				name: 'Legacy template',
				items,
				createdAt: '2026-04-29T10:00:00.000Z',
				updatedAt: '2026-04-29T10:00:00.000Z'
			}
		};
		localStorage.setItem(`cl:tpl:${id}`, JSON.stringify(envelope));
		const idxRaw = localStorage.getItem('cl:tpl:index');
		const ids: string[] = idxRaw ? JSON.parse(idxRaw) : [];
		if (!ids.includes(id)) ids.push(id);
		localStorage.setItem('cl:tpl:index', JSON.stringify(ids));
	}

	it('getTemplate synthesizes order = index when items lack order', async () => {
		const backend = new LocalStorageBackend();
		writeLegacyBlob('TPL_A', [
			{ id: 'I1', text: 'first' },
			{ id: 'I2', text: 'second' },
			{ id: 'I3', text: 'third' }
		]);
		const t = await backend.getTemplate('TPL_A');
		expect(t).not.toBeNull();
		expect(t!.items).toEqual([
			{ id: 'I1', text: 'first', order: 0 },
			{ id: 'I2', text: 'second', order: 1 },
			{ id: 'I3', text: 'third', order: 2 }
		]);
	});

	it('getTemplates synthesizes order = index across multiple templates', async () => {
		const backend = new LocalStorageBackend();
		writeLegacyBlob('TPL_A', [{ id: 'A1', text: 'a' }]);
		writeLegacyBlob('TPL_B', [
			{ id: 'B1', text: 'b1' },
			{ id: 'B2', text: 'b2' }
		]);
		const all = await backend.getTemplates();
		expect(all).toHaveLength(2);
		const a = all.find((x) => x.id === 'TPL_A')!;
		const b = all.find((x) => x.id === 'TPL_B')!;
		expect(a.items).toEqual([{ id: 'A1', text: 'a', order: 0 }]);
		expect(b.items).toEqual([
			{ id: 'B1', text: 'b1', order: 0 },
			{ id: 'B2', text: 'b2', order: 1 }
		]);
	});

	it('preserves existing order on items that already have it; only synthesizes missing ones', async () => {
		const backend = new LocalStorageBackend();
		writeLegacyBlob('TPL_M', [
			{ id: 'I1', text: 'first', order: 5 },
			{ id: 'I2', text: 'second' }
		]);
		const t = await backend.getTemplate('TPL_M');
		expect(t!.items).toEqual([
			{ id: 'I1', text: 'first', order: 5 },
			{ id: 'I2', text: 'second', order: 1 }
		]);
	});

	it('treats NaN and Infinity order as missing and synthesizes from index', async () => {
		const backend = new LocalStorageBackend();
		// JSON.stringify converts NaN/Infinity to null, so simulate by writing raw JSON
		const envelope = `{"schemaVersion":1,"template":{"id":"TPL_N","name":"N","items":[{"id":"I1","text":"a","order":null},{"id":"I2","text":"b","order":"oops"}],"createdAt":"2026-04-29T10:00:00.000Z","updatedAt":"2026-04-29T10:00:00.000Z"}}`;
		localStorage.setItem('cl:tpl:TPL_N', envelope);
		localStorage.setItem('cl:tpl:index', JSON.stringify(['TPL_N']));
		const t = await backend.getTemplate('TPL_N');
		expect(t!.items).toEqual([
			{ id: 'I1', text: 'a', order: 0 },
			{ id: 'I2', text: 'b', order: 1 }
		]);
	});
});

describe('LocalStorageBackend (future schema version)', () => {
	beforeEach(() => {
		localStorage.clear();
		_resetFutureSchemaForTests();
	});

	it('skips blob with schemaVersion 2 and signals future schema warning', async () => {
		const backend = new LocalStorageBackend();
		const futureBlob = JSON.stringify({
			schemaVersion: 2,
			template: {
				id: 'T1',
				name: 'Future',
				items: [],
				createdAt: '2026-04-30T10:00:00.000Z',
				updatedAt: '2026-04-30T10:00:00.000Z'
			}
		});
		localStorage.setItem('cl:tpl:T1', futureBlob);
		localStorage.setItem('cl:tpl:index', JSON.stringify(['T1']));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const templates = await backend.getTemplates();
		expect(templates).toHaveLength(0);
		expect(consumeFutureSchemaWarning()).toBe(true);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('future schemaVersion 2'));
		warn.mockRestore();
	});

	it('loads schemaVersion 1 blob normally and does not set future schema warning', async () => {
		const backend = new LocalStorageBackend();
		await backend.saveTemplate(validTemplate());
		_resetFutureSchemaForTests(); // clear any side effects from saveTemplate
		const templates = await backend.getTemplates();
		expect(templates).toHaveLength(1);
		expect(consumeFutureSchemaWarning()).toBe(false);
	});
});

describe('LocalStorageBackend (run methods)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('save → get → clear active run', async () => {
		const backend = new LocalStorageBackend();
		const run = {
			templateId: 'TPL1',
			startedAt: '2026-04-29T10:00:00.000Z',
			itemStates: [{ itemId: 'I1', checked: true }]
		};
		await backend.saveRun(run);
		const got = await backend.getActiveRun('TPL1');
		expect(got).toEqual(run);
		await backend.clearRun('TPL1');
		expect(await backend.getActiveRun('TPL1')).toBeNull();
	});

	it('archiveRun appends to archive list', async () => {
		const backend = new LocalStorageBackend();
		const run1 = {
			templateId: 'TPL1',
			startedAt: '2026-04-29T10:00:00.000Z',
			itemStates: []
		};
		const run2 = { ...run1, startedAt: '2026-04-29T11:00:00.000Z' };
		await backend.archiveRun(run1);
		await backend.archiveRun(run2);
		const raw = localStorage.getItem('cl:run:archive:TPL1')!;
		const parsed = JSON.parse(raw);
		expect(parsed.runs).toHaveLength(2);
		expect(parsed.schemaVersion).toBe(1);
	});
});
