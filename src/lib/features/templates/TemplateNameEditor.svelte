<script lang="ts">
	import { updateTemplate } from '$lib/state/template-store.svelte';
	import { toastStore } from '$lib/state/toast-store.svelte';
	import { StorageError } from '$lib/storage';
	import { debounce } from '$lib/utils/debounce';
	import type { Template } from '$lib/schemas/template';

	let { template }: { template: Template } = $props();

	let localName = $state(template.name);
	let error = $state<string | null>(null);
	let savedName = template.name;

	function validateName(raw: string): string | null {
		const trimmed = raw.trim();
		if (trimmed.length === 0) return 'Name is required';
		if (trimmed.length > 200) return 'Name must be 200 characters or fewer';
		return null;
	}

	const debouncedSave = debounce((raw: string) => {
		const trimmed = raw.trim();
		const err = validateName(raw);
		if (err) {
			error = err;
			return;
		}
		error = null;
		const prevSaved = savedName;
		savedName = trimmed;
		updateTemplate({ ...template, name: trimmed }).catch((e: unknown) => {
			savedName = prevSaved;
			localName = prevSaved;
			if (e instanceof StorageError && e.kind === 'QUOTA_EXCEEDED') {
				toastStore.error('Storage is full. Free up space and try again.');
			} else {
				toastStore.error('Could not save name. Please try again.');
			}
		});
	}, 400);
</script>

<div class="flex flex-col gap-1">
	<input
		type="text"
		value={localName}
		oninput={(e) => {
			localName = e.currentTarget.value;
			error = null;
			debouncedSave(localName);
		}}
		onblur={() => {
			debouncedSave.flush();
			if (error) {
				localName = savedName;
				error = null;
			}
		}}
		aria-label="Template name"
		aria-invalid={error !== null}
		aria-describedby={error ? 'name-error' : undefined}
		maxlength="200"
		class="rounded border border-transparent px-1 text-2xl font-semibold hover:border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
	/>
	{#if error}
		<p id="name-error" role="alert" class="text-sm text-red-600">{error}</p>
	{/if}
</div>
