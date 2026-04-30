<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { getTemplates } from '$lib/state/template-store.svelte';
	import { getActiveRun, tickItem, resetRun } from '$lib/state/run-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { StorageError } from '$lib/storage';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

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
	const allDone = $derived(totalCount > 0 && items.every((i) => i.checked));

	const fadeDuration =
		typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
			? 0
			: 250;

	let showResetModal = $state(false);

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

	async function handleResetConfirm() {
		if (!run) return;
		try {
			await resetRun(run.templateId);
			toastStore.success('Run reset.');
			goto(resolve(`/templates/${id}`));
		} catch (err) {
			if (err instanceof StorageError) {
				toastStore.error('Failed to reset run. Please try again.');
			} else {
				throw err;
			}
		} finally {
			showResetModal = false;
		}
	}
</script>

{#if template && run}
	<div
		class="rounded-lg transition-colors duration-300 motion-reduce:transition-none {allDone
			? 'bg-green-50 p-4'
			: ''}"
	>
		{#if allDone}
			<div transition:fade={{ duration: fadeDuration }} class="mb-4 py-3 text-center">
				<p class="text-2xl font-semibold text-[#14532D]" aria-live="assertive">Done.</p>
			</div>
		{:else}
			<p class="text-sm text-slate-500" aria-live="polite">{checkedCount} of {totalCount}</p>
		{/if}
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
		<div class="mt-6 flex justify-end">
			<button
				type="button"
				onclick={() => (showResetModal = true)}
				class={allDone
					? 'rounded bg-slate-900 px-4 py-2 text-sm text-white'
					: 'text-sm text-slate-500 hover:text-slate-700 hover:underline'}>Reset</button
			>
		</div>
	</div>
	<ConfirmModal
		open={showResetModal}
		title="Reset this run?"
		description="Reset this run? Tick state will be cleared."
		confirmLabel="Reset"
		onconfirm={handleResetConfirm}
		oncancel={() => (showResetModal = false)}
	/>
{:else if template && !run}
	<p class="text-sm text-slate-500">
		No active run. <a href={resolve(`/templates/${id}`)} class="underline">Back to template</a>
	</p>
{/if}
