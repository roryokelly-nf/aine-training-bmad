import { browser } from '$app/environment';
import { loadTemplates } from '$lib/state/template-store.svelte';
import { toastStore } from '$lib/state/toast-store.svelte';
import { StorageError } from '$lib/storage';

export const prerender = true;
export const ssr = false;

export const load = async () => {
	if (!browser) return {};
	try {
		await loadTemplates();
	} catch (err) {
		if (err instanceof StorageError) {
			toastStore.error(`Storage problem: ${err.message}`);
		} else {
			throw err;
		}
	}
	return {};
};
