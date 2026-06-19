<script lang="ts">
	import { BALL_WEIGHTS } from '$lib/balls/weights';

	let {
		weights = [...BALL_WEIGHTS],
		value,
		selected,
		onchange,
	}: {
		weights?: number[];
		value?: number;
		selected?: number[];
		onchange: (weight: number) => void;
	} = $props();

	function isActive(weight: number) {
		return selected ? selected.includes(weight) : value === weight;
	}
</script>

<div class="flex flex-wrap gap-1">
	{#each weights as weight}
		<button
			type="button"
			onclick={() => onchange(weight)}
			class="rounded border px-2 py-0.5 text-xs transition-colors
				{isActive(weight)
					? 'border-eft-gold bg-eft-gold-dim text-eft-gold'
					: 'border-eft-border-hi text-eft-muted hover:border-eft-gold hover:text-eft-text'}"
		>
			{weight}
		</button>
	{/each}
</div>
