<script lang="ts">
	import type { PageData } from './$types';
	import type { Product } from './+page.server';
	import { Button } from '$lib/components/ui/button';
	import { Select } from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();

	let selectedBrands = $state<string[]>([]);
	let selectedWeights = $state<number[]>([]);
	let typeFilter = $state<'tracer' | 'standard' | null>(null);
	let sortBy = $state<'price-asc' | 'price-desc' | 'weight-asc' | 'weight-desc'>('price-asc');
	let viewMode = $state<'grid' | 'list'>('list');
	let page = $state(1);
	const PAGE_SIZE = 15;

	const allFiltered = $derived(() => {
		let result: Product[] = data.products;

		if (selectedBrands.length > 0) {
			result = result.filter((p) => selectedBrands.includes(p.brand));
		}
		if (selectedWeights.length > 0) {
			result = result.filter((p) => p.weight != null && selectedWeights.includes(p.weight));
		}
		if (typeFilter === 'tracer') {
			result = result.filter((p) => p.tracer);
		} else if (typeFilter === 'standard') {
			result = result.filter((p) => !p.tracer);
		}

		return result.toSorted((a, b) => {
			if (sortBy === 'price-asc') return a.price - b.price;
			if (sortBy === 'price-desc') return b.price - a.price;
			if (sortBy === 'weight-asc') return (a.weight ?? 99) - (b.weight ?? 99);
			if (sortBy === 'weight-desc') return (b.weight ?? 0) - (a.weight ?? 0);
			return 0;
		});
	});

	const totalPages = $derived(Math.ceil(allFiltered().length / PAGE_SIZE));
	const filtered = $derived(allFiltered().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	$effect(() => {
		allFiltered();
		page = 1;
	});

	function toggleBrand(brand: string) {
		if (selectedBrands.includes(brand)) {
			selectedBrands = selectedBrands.filter((b) => b !== brand);
		} else {
			selectedBrands = [...selectedBrands, brand];
		}
	}

	function toggleWeight(weight: number) {
		if (selectedWeights.includes(weight)) {
			selectedWeights = selectedWeights.filter((w) => w !== weight);
		} else {
			selectedWeights = [...selectedWeights, weight];
		}
	}

	const brandColors: Record<string, string> = {
		AZOT: 'bg-eft-gold-dim text-eft-gold',
		BLS: 'border border-eft-border-yel text-eft-gold',
		AIMTOP: 'border border-eft-border-hi text-eft-gold',
	};
</script>

<div class="flex h-full overflow-hidden gap-0">
	<!-- Sidebar -->
	<aside class="w-52 shrink-0 space-y-5 overflow-y-auto border-r border-eft-border p-5">
		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Производитель</p>
			<div class="space-y-0.5">
				{#each data.brands as brand}
					{@const active = selectedBrands.includes(brand)}
					<button
						onclick={() => toggleBrand(brand)}
						class="flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors {active
							? 'text-eft-gold'
							: 'text-eft-muted hover:text-eft-text'}"
					>
						<span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border {active
							? 'border-eft-gold bg-eft-gold-dim'
							: 'border-eft-border-hi'}">
							{#if active}<span class="text-[9px] font-bold leading-none">✓</span>{/if}
						</span>
						{brand}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Тип</p>
			<div class="space-y-0.5">
				{#each [{ value: 'tracer', label: 'Трассерные' }, { value: 'standard', label: 'Стандартные' }] as type}
					{@const active = typeFilter === type.value}
					<button
						onclick={() => (typeFilter = active ? null : (type.value as 'tracer' | 'standard'))}
						class="flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors {active
							? 'text-eft-gold'
							: 'text-eft-muted hover:text-eft-text'}"
					>
						<span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border {active
							? 'border-eft-gold bg-eft-gold-dim'
							: 'border-eft-border-hi'}">
							{#if active}<span class="text-[9px] font-bold leading-none">✓</span>{/if}
						</span>
						{type.label}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Вес шара</p>
			<div class="flex flex-wrap gap-1">
				{#each data.weights as weight}
					{@const active = selectedWeights.includes(weight)}
					<button
						onclick={() => toggleWeight(weight)}
						class="rounded border px-2 py-0.5 text-xs transition-colors {active
							? 'border-eft-gold bg-eft-gold-dim text-eft-gold'
							: 'border-eft-border-hi text-eft-muted hover:border-eft-gold hover:text-eft-text'}"
					>
						{weight}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Сортировка</p>
			<Select bind:value={sortBy} class="w-full">
				<option value="price-asc">Цена ↑</option>
				<option value="price-desc">Цена ↓</option>
				<option value="weight-asc">Вес ↑</option>
				<option value="weight-desc">Вес ↓</option>
			</Select>
		</div>

		{#if selectedBrands.length > 0 || typeFilter || selectedWeights.length > 0}
			<button
				onclick={() => { selectedBrands = []; typeFilter = null; selectedWeights = []; }}
				class="w-full rounded-md border border-eft-border py-1.5 text-xs text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text"
			>
				Сбросить фильтры
			</button>
		{/if}
	</aside>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-5">
		<div class="mb-4 flex items-center justify-between">
			<p class="text-xs text-eft-muted">
				Найдено: <span class="text-eft-text">{allFiltered().length}</span>
			</p>
			<div class="flex border border-eft-border">
				<Button onclick={() => (viewMode = 'grid')} variant={viewMode === 'grid' ? 'active' : 'ghost'} size="icon" title="Сетка">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="1" y="1" width="6" height="6" rx="1"/>
						<rect x="9" y="1" width="6" height="6" rx="1"/>
						<rect x="1" y="9" width="6" height="6" rx="1"/>
						<rect x="9" y="9" width="6" height="6" rx="1"/>
					</svg>
				</Button>
				<Button onclick={() => (viewMode = 'list')} variant={viewMode === 'list' ? 'active' : 'ghost'} size="icon" title="Список">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="1" y="2" width="14" height="2" rx="1"/>
						<rect x="1" y="7" width="14" height="2" rx="1"/>
						<rect x="1" y="12" width="14" height="2" rx="1"/>
					</svg>
				</Button>
			</div>
		</div>

		{#if viewMode === 'grid'}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each filtered as product (product.id)}
					<a
						href={product.url ?? '#'}
						target="_blank"
						rel="noopener noreferrer"
						class="group relative flex flex-col rounded-xl border border-eft-border bg-eft-surface transition-colors hover:border-eft-gold"
					>
						{#if product.source === 'pentagon'}
							<span class="absolute right-1.5 top-1.5 z-10 rounded-sm bg-black/50 px-1.5 py-0.5 text-[9px] tracking-wide text-white/40">pentagon.by</span>
						{/if}
						{#if product.image}
							<div class="aspect-square overflow-hidden bg-eft-elevated">
								<img
									src={product.image}
									alt={product.name}
									class="h-full w-full object-cover transition-transform group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{:else}
							<div class="aspect-square bg-eft-elevated"></div>
						{/if}

						<div class="flex flex-1 flex-col gap-2 p-3">
							<div class="flex flex-wrap gap-1">
								<span class="px-1.5 py-0.5 text-[10px] font-bold uppercase {brandColors[product.brand] ?? 'text-eft-muted'}">
									{product.brand}
								</span>
								{#if product.tracer}
									<span class="border border-eft-gold-tracer px-1.5 py-0.5 text-[10px] font-bold uppercase text-eft-gold">
										трассер
									</span>
								{/if}
							</div>

							<p class="text-sm leading-snug text-eft-text">
								{product.name}
							</p>

							<div class="mt-auto flex items-end justify-between">
								<span class="font-bold text-eft-gold">{product.price} руб.</span>
								{#if product.weight}
									<span class="text-xs text-eft-muted">{product.weight} гр.</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col rounded-xl border border-eft-border overflow-hidden">
				{#each filtered as product (product.id)}
					<a
						href={product.url ?? '#'}
						target="_blank"
						rel="noopener noreferrer"
						class="group flex items-center gap-4 border-b border-eft-border px-4 py-2.5 transition-colors last:border-b-0 hover:bg-eft-elevated"
					>
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div class="flex shrink-0 gap-1">
								<Badge class={brandColors[product.brand] ?? ''}>{product.brand}</Badge>
								{#if product.tracer}
									<Badge class="border border-eft-gold-tracer text-eft-gold">трассер</Badge>
								{/if}
							</div>
							<p class="truncate text-sm text-eft-text">
								{product.name}
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-6">
							<span class="w-16 text-right text-xs text-eft-muted">
								{product.weight != null ? `${product.weight} гр.` : '—'}
							</span>
							<span class="w-20 text-right text-sm font-bold text-eft-gold">{product.price} руб.</span>
							<span class="w-16 text-right text-[9px] text-eft-muted/40">
								{product.source === 'pentagon' ? 'pentagon.by' : 'strike.by'}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}

		{#if allFiltered().length === 0}
			<div class="py-20 text-center text-eft-muted">Ничего не найдено</div>
		{:else if viewMode === 'list' && totalPages > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-eft-muted">
				<span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allFiltered().length)} из {allFiltered().length}</span>
				<div class="flex items-center gap-0.5">
					<button onclick={() => (page = 1)} disabled={page === 1}
						class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">«</button>
					<button onclick={() => (page -= 1)} disabled={page === 1}
						class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">‹</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
						{#if p === 1 || p === totalPages || Math.abs(p - page) <= 1}
							<button
								onclick={() => (page = p)}
								class="min-w-[2rem] px-2 py-1 transition-colors {p === page
									? 'bg-eft-elevated text-eft-gold'
									: 'hover:text-eft-text'}"
							>{p}</button>
						{:else if Math.abs(p - page) === 2}
							<span class="px-1">…</span>
						{/if}
					{/each}
					<button onclick={() => (page += 1)} disabled={page === totalPages}
						class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">›</button>
					<button onclick={() => (page = totalPages)} disabled={page === totalPages}
						class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">»</button>
				</div>
			</div>
		{/if}
	</div>
</div>
