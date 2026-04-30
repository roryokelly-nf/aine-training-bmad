import { browser } from '$app/environment';
import { loadTemplates } from '$lib/state/template-store.svelte';
import { toastStore } from '$lib/state/toast-store.svelte';
import { setStorageUnavailable } from '$lib/state/storage-status.svelte';
import { StorageError, consumeFutureSchemaWarning } from '$lib/storage';

export const prerender = true;
export const ssr = false;

export const load = async () => {
	if (!browser) return {};
	try {
		await loadTemplates();
		if (consumeFutureSchemaWarning()) {
			toastStore.info("Some data couldn't be loaded — it may be from a newer version of this app.");
		}
	} catch (err) {
		if (err instanceof StorageError && err.kind === 'UNAVAILABLE') {
			setStorageUnavailable(true);
			console.error('[storage] localStorage unavailable:', err.message);
		} else if (err instanceof StorageError && err.kind === 'QUOTA_EXCEEDED') {
			toastStore.error('Storage is full. Delete templates or archived runs to free space.');
		} else if (err instanceof StorageError) {
			toastStore.error(`Storage problem: ${err.message}`);
		} else {
			throw err;
		}
	}
	return {};
};
