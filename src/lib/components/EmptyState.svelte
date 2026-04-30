<script lang="ts">
	let { message, cta }: { message: string; cta?: { label: string; onClick: () => void } } =
		$props();
</script>

<div class="flex flex-col items-center gap-4 py-12 text-center" role="status">
	<p class="text-base text-slate-700">{message}</p>
	{#if cta}
		<button type="button" onclick={cta.onClick} class="rounded bg-slate-900 px-4 py-2 text-white">
			{cta.label}
		</button>
	{/if}
</div>
