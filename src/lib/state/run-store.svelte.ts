import { storage } from '$lib/storage';
import { nowIso } from '$lib/utils/date';
import type { Run } from '$lib/schemas/run';
import type { Template } from '$lib/schemas/template';

let activeRun = $state<Run | null>(null);

export function getActiveRun(): Run | null {
	return activeRun;
}

export async function loadRun(templateId: string): Promise<void> {
	activeRun = await storage().getActiveRun(templateId);
}

export async function startRun(template: Template): Promise<Run> {
	const run: Run = {
		templateId: template.id,
		startedAt: nowIso(),
		itemStates: template.items.map((item) => ({ itemId: item.id, checked: false }))
	};
	await storage().saveRun(run);
	activeRun = run;
	return run;
}

export async function tickItem(itemId: string): Promise<void> {
	if (!activeRun) throw new Error('no active run');
	const prev = activeRun;
	const updated: Run = {
		...activeRun,
		itemStates: activeRun.itemStates.map((s) =>
			s.itemId === itemId ? { ...s, checked: !s.checked } : s
		)
	};
	activeRun = updated;
	try {
		await storage().saveRun(updated);
	} catch (err) {
		activeRun = prev;
		throw err;
	}
}

export function clearActiveRun(): void {
	activeRun = null;
}

export function _resetForTests(): void {
	activeRun = null;
}
