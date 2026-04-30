import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { getTemplates } from '$lib/state/template-store.svelte';
import { loadRun } from '$lib/state/run-store.svelte';
import type { PageLoad } from './$types';

export const prerender = false;
export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	if (!browser) return {};
	const t = getTemplates().find((x) => x.id === params.id);
	if (!t) error(404, 'Template not found');
	await loadRun(params.id);
	return {};
};
