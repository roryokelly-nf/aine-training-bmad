<script lang="ts">
	import { page } from '$app/state';
	import { getTemplates } from '$lib/state/template-store.svelte';
	import { getActiveRun, tickItem } from '$lib/state/run-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { StorageError } from '$lib/storage';

	const id = $derived(page.params.id);
	const template = $derived(getTemplates().find((t) => t.id === id));
	const run = $derived(getActiveRun());
	const items = $derived(
		template?.items.map((item) => ({
			...item,
			checked: run?.itemStates.find((s) => s.itemId === item.id)?.checked ?? false
		})) ?? []
	);
	const totalCount = $derived(items.length);
	const checkedCount = $derived(items.filter((i) => i.checked).length);

	async function handleTick(itemId: string) {
		try {
			await tickItem(itemId);
		} catch (err) {
			if (err instanceof StorageError) {
				toastStore.error('Failed to save tick state. Please try again.');
			} else {
				throw err;
			}
		}
	}
</script>

{#if template && run}
	<p class="text-sm text-slate-500" aria-live="polite">{checkedCount} of {totalCount}</p>
	<ul class="mt-4 flex flex-col">
		{#each items as item (item.id)}
			<li>
				<button
					type="button"
					onclick={() => void handleTick(item.id)}
					aria-pressed={item.checked}
					class="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left"
				>
					<span
						aria-hidden="true"
						class="h-6 w-6 flex-shrink-0 rounded border-2 {item.checked
							? 'border-[#2E7D54] bg-[#2E7D54]'
							: 'border-slate-300'}"
					></span>
					<span class={item.checked ? 'text-[#3A5247]' : ''}>{item.text}</span>
				</button>
			</li>
		{/each}
	</ul>
{:else if template && !run}
	<p class="text-sm text-slate-500">
		No active run. <a href="/templates/{id}" class="underline">Back to template</a>
	</p>
{/if}
