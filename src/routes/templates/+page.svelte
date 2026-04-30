<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { getTemplates } from '$lib/state/template-store.svelte';
	import { loadRunSummaries, getRunSummary } from '$lib/state/run-store.svelte';
	import { getStorageUnavailable } from '$lib/state/storage-status.svelte';
	import TemplateCard from '$lib/features/templates/TemplateCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	const templates = $derived(getTemplates());
	const sorted = $derived([...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
	const storageUnavailable = $derived(getStorageUnavailable());

	const unavailableTooltip =
		"Local storage is disabled in this browser. Templates can't be saved. Try a different browser or disable private mode.";

	$effect(() => {
		if (browser && templates.length > 0) void loadRunSummaries(templates.map((t) => t.id));
	});
</script>

<h1 class="text-2xl">Templates</h1>
<button
	type="button"
	onclick={() => {
		if (!storageUnavailable) goto(resolve('/templates/new'));
	}}
	aria-disabled={storageUnavailable}
	title={storageUnavailable ? unavailableTooltip : undefined}
	class="mt-4 rounded bg-slate-900 px-4 py-2 text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
>
	Create template
</button>

{#if sorted.length === 0}
	<EmptyState
		message="No templates yet on this browser."
		secondary="Templates are stored locally on each browser — they don't sync across browsers in this version. Sync between browsers is on the roadmap."
		cta={{
			label: 'Create template',
			onClick: () => goto(resolve('/templates/new'))
		}}
	/>
{:else}
	<ul class="mt-6 flex flex-col gap-3">
		{#each sorted as template (template.id)}
			<li>
				<TemplateCard {template} run={getRunSummary(template.id)} />
			</li>
		{/each}
	</ul>
{/if}
