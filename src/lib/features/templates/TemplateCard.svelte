<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Template } from '$lib/schemas/template';

	let { template }: { template: Template } = $props();
</script>

<a
	href={resolve(`/templates/${template.id}`)}
	class="flex flex-col gap-1 rounded border border-slate-200 px-4 py-3 hover:border-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500 focus:outline-none"
>
	<span class="text-base font-medium text-slate-900">{template.name}</span>
	<span class="text-sm text-slate-600"
		>{template.items.length} item{template.items.length === 1 ? '' : 's'}</span
	>
</a>
