<script lang="ts">
	import { addItem } from '$lib/state/template-store.svelte';
	import type { Template } from '$lib/schemas/template';
	import ItemRow from './ItemRow.svelte';

	let { template }: { template: Template } = $props();

	let draftText = $state('');
	let addInputEl: HTMLInputElement | null = $state(null);
	let committing = false;

	async function commitDraft() {
		if (committing) return;
		const trimmed = draftText.trim();
		if (trimmed.length === 0) {
			draftText = '';
			return;
		}
		committing = true;
		try {
			await addItem(template.id, trimmed);
			draftText = '';
		} finally {
			committing = false;
		}
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
		<ItemRow templateId={template.id} {item} onEnter={() => addInputEl?.focus()} />
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
