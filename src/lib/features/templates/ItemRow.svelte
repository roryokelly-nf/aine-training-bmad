<script lang="ts">
	import { updateItemText, removeItem } from '$lib/state/template-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { StorageError } from '$lib/storage';
	import { debounce } from '$lib/utils/debounce';
	import type { Item } from '$lib/schemas/template';

	let { templateId, item, onEnter }: { templateId: string; item: Item; onEnter: () => void } =
		$props();

	const debouncedSave = debounce((text: string) => {
		const t = text.trim();
		if (t.length === 0) return;
		updateItemText(templateId, item.id, t).catch((e: unknown) => {
			if (e instanceof StorageError && e.kind === 'QUOTA_EXCEEDED') {
				toastStore.error('Storage is full. Delete templates or archived runs to free space.');
			} else {
				toastStore.error('Could not save item. Please try again.');
			}
		});
	}, 400);
</script>

<li class="flex items-center gap-2">
	<input
		type="text"
		value={item.text}
		oninput={(e) => debouncedSave(e.currentTarget.value)}
		onblur={() => debouncedSave.flush()}
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				debouncedSave.flush();
				onEnter();
			}
		}}
		aria-label={`Item ${item.order + 1} text`}
		maxlength="280"
		class="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
	/>
	<button
		type="button"
		onclick={() => void removeItem(templateId, item.id)}
		aria-label={`Remove item: ${item.text}`}
		class="rounded border border-slate-300 px-3 py-2 text-sm hover:border-slate-500"
	>
		Remove
	</button>
</li>
