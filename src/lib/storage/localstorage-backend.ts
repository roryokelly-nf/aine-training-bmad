import * as v from 'valibot';
import type { StorageBackend, Run } from './types';
import { TemplateSchema, PersistedTemplateSchema, type Template } from '$lib/schemas/template';
import { StorageError } from './storage-error';

const NS = 'cl:';
const TEMPLATE_INDEX_KEY = `${NS}tpl:index`;
const TEMPLATE_KEY = (id: string) => `${NS}tpl:${id}`;
const RUN_KEY = (templateId: string) => `${NS}run:active:${templateId}`;
const RUN_ARCHIVE_KEY = (templateId: string) => `${NS}run:archive:${templateId}`;

interface PersistedRun {
	schemaVersion: 1;
	run: Run;
}

interface PersistedRunArchive {
	schemaVersion: 1;
	runs: Run[];
}

function isQuotaError(err: unknown): boolean {
	if (!(err instanceof DOMException)) return false;
	return err.name === 'QuotaExceededError' || err.code === 22;
}

// Story 1.5 introduces `order` on Item without bumping schemaVersion.
// Pre-1.5 blobs may have items without `order`; synthesize order = index on read.
// See _bmad-output/implementation-artifacts/1-5-edit-template-items.md "Schema decision rationale".
function sanitizePersisted(parsed: unknown): unknown {
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		!('template' in parsed) ||
		!parsed.template ||
		typeof parsed.template !== 'object' ||
		!('items' in parsed.template) ||
		!Array.isArray((parsed.template as { items: unknown }).items)
	) {
		return parsed;
	}
	const inner = parsed.template as { items: unknown[] };
	const normalized = (inner.items as Array<Record<string, unknown>>).map((it, idx) => {
		if (it && typeof it === 'object') {
			const ord = (it as { order?: unknown }).order;
			if (typeof ord === 'number' && Number.isFinite(ord)) return it;
			return { ...it, order: idx };
		}
		return it;
	});
	return {
		...parsed,
		template: { ...inner, items: normalized }
	};
}

export class LocalStorageBackend implements StorageBackend {
	private available: boolean;

	constructor() {
		this.available = this.probe();
	}

	private probe(): boolean {
		try {
			if (typeof localStorage === 'undefined') return false;
			const k = `${NS}__probe__`;
			localStorage.setItem(k, '1');
			localStorage.removeItem(k);
			return true;
		} catch {
			return false;
		}
	}

	private requireAvailable(): void {
		if (!this.available) {
			throw new StorageError('UNAVAILABLE', 'localStorage is not available');
		}
	}

	private setItemSafe(key: string, value: string): void {
		try {
			localStorage.setItem(key, value);
		} catch (err) {
			if (isQuotaError(err)) {
				throw new StorageError('QUOTA_EXCEEDED', 'localStorage quota exceeded', err);
			}
			throw new StorageError('UNKNOWN', 'localStorage write failed', err);
		}
	}

	private readIndex(): string[] {
		const raw = localStorage.getItem(TEMPLATE_INDEX_KEY);
		if (!raw) return [];
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
				return parsed as string[];
			}
			console.warn('[storage] template index malformed; resetting');
			return [];
		} catch {
			console.warn('[storage] template index unparseable; resetting');
			return [];
		}
	}

	private writeIndex(ids: string[]): void {
		this.setItemSafe(TEMPLATE_INDEX_KEY, JSON.stringify(ids));
	}

	async getTemplates(): Promise<Template[]> {
		this.requireAvailable();
		const ids = this.readIndex();
		const out: Template[] = [];
		for (const id of ids) {
			const raw = localStorage.getItem(TEMPLATE_KEY(id));
			if (!raw) continue;
			try {
				const parsed: unknown = JSON.parse(raw);
				const persisted = v.parse(PersistedTemplateSchema, sanitizePersisted(parsed));
				out.push(persisted.template);
			} catch (err) {
				console.warn(`[storage] skipping malformed template blob ${id}:`, err);
			}
		}
		return out;
	}

	async getTemplate(id: string): Promise<Template | null> {
		this.requireAvailable();
		const raw = localStorage.getItem(TEMPLATE_KEY(id));
		if (!raw) return null;
		try {
			const parsed: unknown = JSON.parse(raw);
			const persisted = v.parse(PersistedTemplateSchema, sanitizePersisted(parsed));
			return persisted.template;
		} catch (err) {
			console.warn(`[storage] template ${id} failed schema parse:`, err);
			return null;
		}
	}

	async saveTemplate(t: Template): Promise<void> {
		this.requireAvailable();

		let validated: Template;
		try {
			validated = v.parse(TemplateSchema, t);
		} catch (err) {
			throw new StorageError('INVALID', 'template failed schema validation', err);
		}

		const key = TEMPLATE_KEY(validated.id);
		const envelope = JSON.stringify({ schemaVersion: 1, template: validated });
		const priorRaw = localStorage.getItem(key);

		this.setItemSafe(key, envelope);

		const ids = this.readIndex();
		if (!ids.includes(validated.id)) {
			try {
				this.writeIndex([...ids, validated.id]);
			} catch (err) {
				if (priorRaw === null) {
					try {
						localStorage.removeItem(key);
					} catch {
						/* best-effort rollback */
					}
				} else {
					try {
						localStorage.setItem(key, priorRaw);
					} catch {
						/* best-effort rollback */
					}
				}
				throw err;
			}
		}
	}

	async deleteTemplate(id: string): Promise<void> {
		this.requireAvailable();
		const ids = this.readIndex();
		const next = ids.filter((x) => x !== id);
		if (next.length !== ids.length) {
			this.writeIndex(next);
		}
		try {
			localStorage.removeItem(TEMPLATE_KEY(id));
		} catch (err) {
			throw new StorageError('UNKNOWN', 'localStorage removeItem failed', err);
		}
	}

	async getActiveRun(templateId: string): Promise<Run | null> {
		this.requireAvailable();
		const raw = localStorage.getItem(RUN_KEY(templateId));
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw) as PersistedRun;
			if (parsed?.schemaVersion !== 1 || !parsed.run) return null;
			return parsed.run;
		} catch (err) {
			console.warn(`[storage] active run for ${templateId} unparseable:`, err);
			return null;
		}
	}

	async saveRun(r: Run): Promise<void> {
		this.requireAvailable();
		const envelope = JSON.stringify({ schemaVersion: 1, run: r });
		this.setItemSafe(RUN_KEY(r.templateId), envelope);
	}

	async clearRun(templateId: string): Promise<void> {
		this.requireAvailable();
		try {
			localStorage.removeItem(RUN_KEY(templateId));
		} catch (err) {
			throw new StorageError('UNKNOWN', 'localStorage removeItem failed', err);
		}
	}

	async archiveRun(r: Run): Promise<void> {
		this.requireAvailable();
		const key = RUN_ARCHIVE_KEY(r.templateId);
		const raw = localStorage.getItem(key);
		let runs: Run[] = [];
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as PersistedRunArchive;
				if (parsed?.schemaVersion === 1 && Array.isArray(parsed.runs)) {
					runs = parsed.runs;
				}
			} catch {
				console.warn(`[storage] archive for ${r.templateId} unparseable; replacing`);
			}
		}
		runs.push(r);
		const envelope = JSON.stringify({ schemaVersion: 1, runs });
		this.setItemSafe(key, envelope);
	}
}
