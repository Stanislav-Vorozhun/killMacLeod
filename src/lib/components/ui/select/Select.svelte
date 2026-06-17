<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLSelectAttributes & {
		label?: string;
	};

	let { class: className, label, children, value = $bindable(), ...props }: Props = $props();
</script>

{#if label}
	<label class="flex items-center gap-2">
		<span class="text-xs uppercase tracking-widest text-eft-muted">{label}</span>
		<select
			class={cn(
				'rounded-md border border-eft-border bg-eft-surface px-2 py-1 text-xs text-eft-text outline-none transition-colors focus:border-eft-border-hi',
				className
			)}
			bind:value
		{...props}
		>
			{@render children?.()}
		</select>
	</label>
{:else}
	<select
		class={cn(
			'rounded-md border border-eft-border bg-eft-surface px-2 py-1 text-xs text-eft-text outline-none transition-colors focus:border-eft-border-hi',
			className
		)}
		bind:value
		{...props}
	>
		{@render children?.()}
	</select>
{/if}
