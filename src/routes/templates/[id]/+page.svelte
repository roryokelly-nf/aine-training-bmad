<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getTemplates, deleteTemplate } from '$lib/state/template-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { getActiveRun, loadRun, startRun, clearActiveRun } from '$lib/state/run-store.svelte';
	import ItemEditor from '$lib/features/templates/ItemEditor.svelte';
	import TemplateNameEditor from '$lib/features/templates/TemplateNameEditor.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	const id = $derived(page.params.id);
	const template = $derived(getTemplates().find((t) => t.id === id));
	const existingRun = $derived(getActiveRun());
	const runButtonDisabled = $derived(!template || template.items.length === 0);

	$effect(() => {
		if (id && browser) void loadRun(id);
	});

	let showDeleteModal = $state(false);
	let showRunReplaceModal = $state(false);
	let deleteButtonEl = $state<HTMLButtonElement | null>(null);

	function handleRunClick() {
		if (runButtonDisabled) return;
		void handleStartRun();
	}

	async function handleStartRun() {
		if (!template) return;
		try {
			await startRun(template);
			goto(resolve(`/templates/${template.id}/run`));
		} catch {
			toastStore.error('Failed to start run. Please try again.');
		}
	}

	async function handleDelete() {
		if (!template) return;
		await deleteTemplate(template.id);
		clearActiveRun();
		showDeleteModal = false;
		toastStore.success('Template deleted.');
		goto(resolve('/templates'));
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		setTimeout(() => deleteButtonEl?.focus(), 0);
	}
</script>

{#if template}
	<TemplateNameEditor {template} />
	<p class="text-sm text-slate-600">
		{template.items.length} item{template.items.length === 1 ? '' : 's'}
	</p>
	<div class="mt-4">
		<ItemEditor {template} />
	</div>
	<div class="mt-6 flex items-center gap-3">
		{#if existingRun}
			<a
				href={resolve(`/templates/${id}/run`)}
				class="rounded bg-slate-900 px-4 py-2 text-sm text-white">Resume run</a
			>
			{#if !runButtonDisabled}
				<button
					type="button"
					onclick={() => (showRunReplaceModal = true)}
					class="text-sm text-slate-600 hover:underline">Run</button
				>
			{/if}
		{:else}
			<button
				type="button"
				onclick={handleRunClick}
				aria-disabled={runButtonDisabled}
				title={runButtonDisabled ? 'Add at least one item to run this template' : undefined}
				class="rounded bg-slate-900 px-4 py-2 text-sm text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
				>Run</button
			>
		{/if}
		<button
			bind:this={deleteButtonEl}
			type="button"
			onclick={() => (showDeleteModal = true)}
			class="text-sm text-red-600 hover:underline">Delete template</button
		>
	</div>
	<ConfirmModal
		open={showRunReplaceModal}
		title="Replace existing run?"
		description="Starting a new run will replace the previous run for this template. Continue?"
		confirmLabel="Continue"
		onconfirm={() => {
			showRunReplaceModal = false;
			void handleStartRun();
		}}
		oncancel={() => (showRunReplaceModal = false)}
	/>
	<ConfirmModal
		open={showDeleteModal}
		title="Delete '{template.name}'?"
		description="This cannot be undone."
		confirmLabel="Delete"
		onconfirm={handleDelete}
		oncancel={handleDeleteCancel}
	/>
{/if}
