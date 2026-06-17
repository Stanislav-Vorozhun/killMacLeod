<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Variant = 'default' | 'cqb' | 'strikeball' | 'salamander' | 'bsg' | 'kufar' | 'vk';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		variant?: Variant;
	};

	let { class: className, variant = 'default', children, ...props }: Props = $props();

	const variants: Record<Variant, string> = {
		default:    'border border-eft-border text-eft-muted',
		cqb:        'bg-eft-gold/20 text-eft-gold',
		strikeball: 'bg-sky-400/20 text-sky-300',
		salamander: 'bg-emerald-400/20 text-emerald-300',
		bsg:        'bg-rose-400/20 text-rose-300',
		kufar:      'bg-eft-elevated text-eft-muted',
		vk:         'bg-sky-900/30 text-sky-400',
	};
</script>

<span
	class={cn(
		'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tracking-wide',
		variants[variant],
		className
	)}
	{...props}
>{@render children?.()}</span>
