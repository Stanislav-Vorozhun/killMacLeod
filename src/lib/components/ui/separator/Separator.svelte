<script lang="ts">
	import { cn } from '$lib/utils';

	let { class: className, orientation = 'horizontal' }: {
		class?: string;
		orientation?: 'horizontal' | 'vertical';
	} = $props();
</script>

<div
	class={cn(
		'bg-eft-border',
		orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
		className
	)}
	role="separator"
	aria-orientation={orientation}
></div>
