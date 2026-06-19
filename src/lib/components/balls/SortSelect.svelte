<script lang="ts">
	import EftSelect from './EftSelect.svelte';

	export type SortBy = 'price-asc' | 'price-desc' | 'weight-asc' | 'weight-desc';

	const ALL_OPTIONS = [
		{ value: 'price-asc', label: 'Цена ↑' },
		{ value: 'price-desc', label: 'Цена ↓' },
		{ value: 'weight-asc', label: 'Вес ↑' },
		{ value: 'weight-desc', label: 'Вес ↓' },
	] as const;

	let {
		value,
		weights = [],
		onchange,
	}: {
		value: SortBy;
		weights?: number[];
		onchange: (value: SortBy) => void;
	} = $props();

	const options = $derived(
		weights.length > 0
			? ALL_OPTIONS.filter((o) => !o.value.startsWith('weight'))
			: [...ALL_OPTIONS]
	);

	$effect(() => {
		if (weights.length > 0 && value.startsWith('weight')) {
			onchange('price-asc');
		}
	});
</script>

<EftSelect value={value} {options} side="top" onchange={(v) => onchange(v as SortBy)} />
