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

	const uid = Math.random().toString(36).slice(2, 9);
	const titleId = `modal-title-${uid}`;
	const descId = `modal-desc-${uid}`;

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let cancelButtonEl = $state<HTMLButtonElement | null>(null);
	let closingProgrammatically = false;

	$effect(() => {
		if (!dialogEl) return;
		if (open) {
			closingProgrammatically = false;
			dialogEl.showModal();
			cancelButtonEl?.focus();
		} else if (dialogEl.open) {
			closingProgrammatically = true;
			dialogEl.close();
		}
	});
</script>

<dialog
	bind:this={dialogEl}
	onclose={() => {
		if (!closingProgrammatically) oncancel();
		closingProgrammatically = false;
	}}
	onclick={(e) => {
		if (e.target === e.currentTarget) oncancel();
	}}
	aria-labelledby={titleId}
	aria-describedby={descId}
	class="w-full max-w-sm rounded-lg p-6 shadow-xl backdrop:bg-black/40"
>
	<h2 id={titleId} class="text-lg font-semibold">{title}</h2>
	<p id={descId} class="mt-2 text-sm text-slate-600">{description}</p>
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
