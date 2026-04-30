<script lang="ts">
	import { getToasts, dismiss } from '$lib/state/toast-store.svelte';
	import Toast from './Toast.svelte';
</script>

<aside
	aria-live="polite"
	aria-atomic="false"
	class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)]"
>
	{#each getToasts() as entry (entry.id)}
		<Toast {entry} ondismiss={() => dismiss(entry.id)} />
	{/each}
</aside>
