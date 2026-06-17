<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Variant = 'default' | 'outline' | 'ghost' | 'active';
	type Size = 'default' | 'sm' | 'icon';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
	};

	let { class: className, variant = 'default', size = 'default', children, ...props }: Props = $props();

	const variants: Record<Variant, string> = {
		default:  'border border-eft-border text-eft-muted hover:border-eft-border-hi hover:text-eft-text',
		outline:  'border border-eft-border text-eft-muted hover:border-eft-border-hi hover:text-eft-text',
		ghost:    'text-eft-muted hover:text-eft-text',
		active:   'border border-eft-gold bg-eft-gold-dim text-eft-gold',
	};

	const sizes: Record<Size, string> = {
		default: 'px-3 py-1.5 text-xs',
		sm:      'px-2 py-1 text-xs',
		icon:    'p-1.5',
	};
</script>

<button
	class={cn(
		'inline-flex items-center justify-center rounded-md font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-40',
		variants[variant],
		sizes[size],
		className
	)}
	{...props}
>{@render children?.()}</button>
