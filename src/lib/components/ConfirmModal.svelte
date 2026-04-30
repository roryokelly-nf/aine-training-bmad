<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open, title, description, confirmLabel = 'Confirm', onconfirm, oncancel }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let cancelButtonEl = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open) {
			dialogEl.showModal();
			cancelButtonEl?.focus();
		} else {
			dialogEl.close();
		}
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	onclose={oncancel}
	onclick={(e) => {
		if (e.target === e.currentTarget) oncancel();
	}}
	aria-labelledby="modal-title"
	aria-describedby="modal-desc"
	class="w-full max-w-sm rounded-lg p-6 shadow-xl backdrop:bg-black/40"
>
	<h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
	<p id="modal-desc" class="mt-2 text-sm text-slate-600">{description}</p>
	<div class="mt-6 flex justify-end gap-3">
		<button
			bind:this={cancelButtonEl}
			type="button"
			onclick={oncancel}
			class="rounded border border-slate-300 px-4 py-2 text-sm hover:border-slate-500"
			>Cancel</button
		>
		<button
			type="button"
			onclick={onconfirm}
			class="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
			>{confirmLabel}</button
		>
	</div>
</dialog>
