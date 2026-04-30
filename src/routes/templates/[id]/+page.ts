import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { getTemplates } from '$lib/state/template-store.svelte';
import type { PageLoad } from './$types';

export const prerender = false;
export const ssr = false;

export const load: PageLoad = ({ params }) => {
	if (!browser) return {};
	const t = getTemplates().find((x) => x.id === params.id);
	if (!t) error(404, 'Template not found');
	return {};
};
