import { storage } from '$lib/storage';
import { newId } from '$lib/storage/ulid';
import { nowIso } from '$lib/utils/date';
import type { Template, Item } from '$lib/schemas/template';

let templates = $state<Template[]>([]);
let loaded = $state<boolean>(false);

export function getTemplates(): Template[] {
	return templates;
}

export function isLoaded(): boolean {
	return loaded;
}

export async function loadTemplates(): Promise<void> {
	templates = await storage().getTemplates();
	loaded = true;
}

export async function addTemplate(
	input: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Template> {
	const now = nowIso();
	const t: Template = { ...input, id: newId(), createdAt: now, updatedAt: now };
	await storage().saveTemplate(t);
	templates = [...templates, t];
	return t;
}

export async function updateTemplate(t: Template): Promise<void> {
	const updated: Template = { ...t, updatedAt: nowIso() };
	await storage().saveTemplate(updated);
	templates = templates.map((x) => (x.id === updated.id ? updated : x));
}

export async function deleteTemplate(id: string): Promise<void> {
	await storage().deleteTemplate(id);
	await storage().clearRun(id);
	templates = templates.filter((t) => t.id !== id);
}

export async function addItem(templateId: string, text: string): Promise<void> {
	const t = templates.find((x) => x.id === templateId);
	if (!t) throw new Error('template not found');
	const order = t.items.length === 0 ? 0 : Math.max(...t.items.map((it) => it.order)) + 1;
	const newItem: Item = { id: newId(), text, order };
	const updated: Template = { ...t, items: [...t.items, newItem], updatedAt: nowIso() };
	await storage().saveTemplate(updated);
	templates = templates.map((x) => (x.id === templateId ? updated : x));
}

export async function updateItemText(
	templateId: string,
	itemId: string,
	text: string
): Promise<void> {
	const t = templates.find((x) => x.id === templateId);
	if (!t) throw new Error('template not found');
	const items = t.items.map((it) => (it.id === itemId ? { ...it, text } : it));
	const updated: Template = { ...t, items, updatedAt: nowIso() };
	await storage().saveTemplate(updated);
	templates = templates.map((x) => (x.id === templateId ? updated : x));
}

export async function removeItem(templateId: string, itemId: string): Promise<void> {
	const t = templates.find((x) => x.id === templateId);
	if (!t) throw new Error('template not found');
	const items = t.items.filter((it) => it.id !== itemId);
	const updated: Template = { ...t, items, updatedAt: nowIso() };
	await storage().saveTemplate(updated);
	templates = templates.map((x) => (x.id === templateId ? updated : x));
}

export function _resetForTests(): void {
	templates = [];
	loaded = false;
}
