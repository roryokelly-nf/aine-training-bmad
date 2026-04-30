<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { getTemplates } from '$lib/state/template-store.svelte';
	import { loadRunSummaries, getRunSummary } from '$lib/state/run-store.svelte';
	import TemplateCard from '$lib/features/templates/TemplateCard.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	const templates = $derived(getTemplates());
	const sorted = $derived([...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));

	$effect(() => {
		if (browser && templates.length > 0) void loadRunSummaries(templates.map((t) => t.id));
	});
</script>

<h1 class="text-2xl">Templates</h1>
<button
	type="button"
	onclick={() => goto(resolve('/templates/new'))}
	class="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
>
	Create template
</button>

{#if sorted.length === 0}
	<EmptyState
		message="No templates yet — create your first one."
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
