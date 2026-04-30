<script lang="ts">
	import type { ToastEntry } from '$lib/state/toast-store.svelte';

	let { entry, ondismiss }: { entry: ToastEntry; ondismiss: () => void } = $props();

	const kindClass = $derived(
		entry.kind === 'error'
			? 'bg-red-600'
			: entry.kind === 'success'
				? 'bg-green-600'
				: 'bg-slate-700'
	);

	const role = $derived(entry.kind === 'error' ? 'alert' : 'status');
</script>

<div
	class="pointer-events-auto flex w-[min(90vw,28rem)] items-start gap-3 rounded-md px-4 py-3 text-white shadow-lg {kindClass}"
	{role}
>
	<span class="flex-1 text-sm leading-snug">{entry.message}</span>
	<button
		type="button"
		aria-label="Dismiss notification"
		class="rounded px-1 text-white/80 hover:text-white focus:ring-2 focus:ring-white focus:outline-none"
		onclick={ondismiss}
	>
		×
	</button>
</div>
