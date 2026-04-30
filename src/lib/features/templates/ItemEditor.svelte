<script lang="ts">
	import { addItem, updateItemText, removeItem } from '$lib/state/template-store.svelte';
	import { debounce } from '$lib/utils/debounce';
	import type { Template } from '$lib/schemas/template';

	let { template }: { template: Template } = $props();

	let draftText = $state('');
	let addInputEl: HTMLInputElement | null = $state(null);

	async function commitDraft() {
		const trimmed = draftText.trim();
		if (trimmed.length === 0) {
			draftText = '';
			return;
		}
		await addItem(template.id, trimmed);
		draftText = '';
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			void commitDraft();
		}
	}
</script>

<ul class="flex flex-col gap-2">
	{#each template.items as item (item.id)}
		{@const debounced = debounce((text: string) => {
			const t = text.trim();
			if (t.length === 0) return;
			void updateItemText(template.id, item.id, t);
		}, 400)}
		<li class="flex items-center gap-2">
			<input
				type="text"
				value={item.text}
				oninput={(e) => debounced(e.currentTarget.value)}
				onblur={() => debounced.flush()}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						debounced.flush();
						addInputEl?.focus();
					}
				}}
				aria-label={`Item ${item.order + 1} text`}
				maxlength="280"
				class="flex-1 rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
			/>
			<button
				type="button"
				onclick={() => void removeItem(template.id, item.id)}
				aria-label={`Remove item: ${item.text}`}
				class="rounded border border-slate-300 px-3 py-2 text-sm hover:border-slate-500"
			>
				Remove
			</button>
		</li>
	{/each}
	<li>
		<input
			bind:this={addInputEl}
			type="text"
			bind:value={draftText}
			onkeydown={handleAddKeydown}
			onblur={commitDraft}
			placeholder="Add item"
			aria-label="Add item"
			maxlength="280"
			class="w-full rounded border border-dashed border-slate-300 px-3 py-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
		/>
	</li>
</ul>
