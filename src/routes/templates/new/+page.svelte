<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as v from 'valibot';
	import { addTemplate } from '$lib/state/template-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { StorageError } from '$lib/storage/storage-error';

	let name = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let inputEl = $state<HTMLInputElement | undefined>(undefined);

	const NameSchema = v.pipe(
		v.string(),
		v.minLength(1, 'Template name is required'),
		v.maxLength(200, 'Template name must be 200 characters or fewer')
	);

	async function submit() {
		if (submitting) return;
		const trimmed = name.trim();
		const result = v.safeParse(NameSchema, trimmed);
		if (!result.success) {
			error = result.issues[0]?.message ?? 'Template name is required';
			inputEl?.focus();
			return;
		}
		error = null;
		submitting = true;
		try {
			const t = await addTemplate({ name: trimmed, items: [] });
			await goto(resolve(`/templates/${t.id}`));
		} catch (err) {
			if (err instanceof StorageError && err.kind === 'QUOTA_EXCEEDED') {
				toastStore.error('Storage is full. Free up space and try again.');
			} else if (err instanceof StorageError && err.kind === 'UNAVAILABLE') {
				toastStore.error(
					'Storage is unavailable. Try a different browser or turn off private browsing.'
				);
			} else {
				toastStore.error('Could not create template. Please try again.');
			}
		} finally {
			submitting = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			goto(resolve('/templates'));
		}
	}

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		submit();
	}

	function onCancel() {
		goto(resolve('/templates'));
	}
</script>

<h1 class="text-2xl">New template</h1>

<form onsubmit={onSubmit} class="mt-4 max-w-md">
	<label for="template-name" class="block text-sm font-medium">Template name</label>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id="template-name"
		type="text"
		bind:value={name}
		bind:this={inputEl}
		onkeydown={onKeydown}
		autofocus
		autocomplete="off"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? 'template-name-error' : undefined}
		class="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-base focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
		disabled={submitting}
	/>
	{#if error}
		<p id="template-name-error" class="mt-1 text-sm text-red-600" role="alert">{error}</p>
	{/if}
	<div class="mt-4 flex gap-2">
		<button
			type="submit"
			disabled={submitting}
			class="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
		>
			{submitting ? 'Creating…' : 'Create'}
		</button>
		<button type="button" onclick={onCancel} class="rounded border border-slate-300 px-4 py-2">
			Cancel
		</button>
	</div>
</form>
