<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { getStorageUnavailable } from '$lib/state/storage-status.svelte';

	let { children } = $props();

	const unavailable = $derived(getStorageUnavailable());
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{#if unavailable}
	<div role="alert" class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
		Local storage is disabled in this browser. Templates can't be saved. Try a different browser or
		disable private mode.
	</div>
{/if}
{@render children()}
<ToastContainer />
