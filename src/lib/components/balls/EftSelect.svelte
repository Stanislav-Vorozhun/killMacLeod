<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';

	export type EftSelectOption = { value: string; label: string };

	let {
		value,
		options,
		onchange,
		side = 'bottom',
	}: {
		value: string;
		options: EftSelectOption[];
		onchange: (value: string) => void;
		side?: 'top' | 'bottom';
	} = $props();

	const selectedLabel = $derived(
		options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ''
	);

	const triggerClass = cn(
		'w-full border-eft-border bg-eft-surface text-eft-text shadow-none',
		'hover:bg-eft-elevated focus-visible:border-eft-border-hi focus-visible:ring-eft-border-hi/30',
		'data-[size=default]:h-9 text-xs'
	);

	const contentClass = cn(
		'z-[200] border-eft-border bg-eft-surface text-eft-text shadow-lg ring-eft-border/50',
		'min-w-[var(--bits-select-anchor-width)]'
	);

	const itemClass = cn(
		'text-eft-text data-highlighted:bg-eft-elevated data-highlighted:text-eft-text',
		'focus:bg-eft-elevated focus:text-eft-text'
	);
</script>

<Select.Root
	type="single"
	{value}
	onValueChange={(v) => {
		if (v) onchange(v);
	}}
>
	<Select.Trigger class={triggerClass}>
		{selectedLabel}
	</Select.Trigger>
	<Select.Content class={contentClass} {side} sideOffset={6} collisionPadding={12}>
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label} class={itemClass}>
				{option.label}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
