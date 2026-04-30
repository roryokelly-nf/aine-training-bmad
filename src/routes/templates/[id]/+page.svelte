<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { getTemplates, deleteTemplate } from '$lib/state/template-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { getActiveRun, loadRun, startRun } from '$lib/state/run-store.svelte';
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
		if (existingRun) {
			showRunReplaceModal = true;
		} else {
			void handleStartRun();
		}
	}

	async function handleStartRun() {
		if (!template) return;
		await startRun(template);
		goto(`/templates/${template.id}/run`);
	}

	async function handleDelete() {
		if (!template) return;
		await deleteTemplate(template.id);
		showDeleteModal = false;
		toastStore.success('Template deleted.');
		goto('/templates');
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
		<button
			type="button"
			onclick={handleRunClick}
			disabled={runButtonDisabled}
			title={runButtonDisabled ? 'Add at least one item to run this template' : undefined}
			class="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
			>Run</button
		>
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
