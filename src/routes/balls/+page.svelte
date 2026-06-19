<script lang="ts">
	import type { PageData } from './$types';
	import type { Product, Catalog } from './+page.server';
	import { fly, fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import SortSelect, { type SortBy as SortByType } from '$lib/components/balls/SortSelect.svelte';
	import EftSelect, { type EftSelectOption } from '$lib/components/balls/EftSelect.svelte';

	let { data }: { data: PageData } = $props();

	type SortBy = SortByType;
	type TypeFilter = 'all' | 'tracer' | 'standard';
	type SourceFilter = 'all' | 'strike' | 'pentagon';

	const TYPE_OPTIONS: EftSelectOption[] = [
		{ value: 'all', label: 'Все типы' },
		{ value: 'tracer', label: 'Трассерные' },
		{ value: 'standard', label: 'Стандартные' },
	];

	const SOURCE_OPTIONS: EftSelectOption[] = [
		{ value: 'all', label: 'Все магазины' },
		{ value: 'strike', label: 'strike.by' },
		{ value: 'pentagon', label: 'pentagon.by' },
	];

	let catalog = $state<Catalog | null>(null);
	let showMobileFilters = $state(false);

	$effect(() => {
		void data.catalog.then((c) => { catalog = c; });
	});

	const brandOptions = $derived<EftSelectOption[]>(
		catalog
			? [{ value: 'all', label: 'Все производители' }, ...catalog.brands.map((b) => ({ value: b, label: b }))]
			: []
	);

	let brandFilter = $state('all');
	let selectedWeights = $state<number[]>([]);
	let typeFilter = $state<TypeFilter>('all');
	let sourceFilter = $state<SourceFilter>('all');
	let sortBy = $state<SortBy>('price-asc');

	let draftBrand = $state('all');
	let draftWeights = $state<number[]>([]);
	let draftTypeFilter = $state<TypeFilter>('all');
	let draftSourceFilter = $state<SourceFilter>('all');
	let draftSortBy = $state<SortBy>('price-asc');

	let viewMode = $state<'grid' | 'list'>('list');
	let page = $state(1);
	const PAGE_SIZE = 15;
	const MOBILE_PAGE_SIZE = 20;

	let visibleCount = $state(MOBILE_PAGE_SIZE);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLElement | null>(null);

	function filterProducts(
		products: Product[],
		brand: string,
		weights: number[],
		type: TypeFilter,
		source: SourceFilter,
		sort: SortBy
	): Product[] {
		let result = products;
		if (brand !== 'all') result = result.filter((p) => p.brand === brand);
		if (weights.length > 0) result = result.filter((p) => p.weight != null && weights.includes(p.weight));
		if (type === 'tracer') result = result.filter((p) => p.tracer);
		else if (type === 'standard') result = result.filter((p) => !p.tracer);
		if (source !== 'all') result = result.filter((p) => (p.source ?? 'strike') === source);
		return result.toSorted((a, b) => {
			if (sort === 'price-asc') return a.price - b.price;
			if (sort === 'price-desc') return b.price - a.price;
			if (sort === 'weight-asc') return (a.weight ?? 99) - (b.weight ?? 99);
			if (sort === 'weight-desc') return (b.weight ?? 0) - (a.weight ?? 0);
			return 0;
		});
	}

	const allFiltered = $derived(() =>
		catalog
			? filterProducts(catalog.products, brandFilter, selectedWeights, typeFilter, sourceFilter, sortBy)
			: []
	);

	function closeMobileFilters() {
		showMobileFilters = false;
	}

	const mobileDisplayed = $derived(allFiltered().slice(0, visibleCount));
	const hasMore = $derived(catalog !== null && visibleCount < allFiltered().length);

	const totalPages = $derived(Math.ceil(allFiltered().length / PAGE_SIZE));
	const filtered = $derived(allFiltered().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	const activeFilterCount = $derived(
		(brandFilter !== 'all' ? 1 : 0) +
			selectedWeights.length +
			(typeFilter !== 'all' ? 1 : 0) +
			(sourceFilter !== 'all' ? 1 : 0)
	);

	const draftHasFilters = $derived(
		draftBrand !== 'all' ||
			draftWeights.length > 0 ||
			draftTypeFilter !== 'all' ||
			draftSourceFilter !== 'all'
	);

	$effect(() => {
		allFiltered();
		page = 1;
		visibleCount = MOBILE_PAGE_SIZE;
	});

	$effect(() => {
		const el = sentinel;
		const canLoad = hasMore && catalog && !loadingMore;
		if (!el || !canLoad) return;
		const obs = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadingMore = true;
					visibleCount = Math.min(visibleCount + MOBILE_PAGE_SIZE, allFiltered().length);
					loadingMore = false;
				}
			},
			{ rootMargin: '100px' }
		);
		obs.observe(el);
		return () => obs.disconnect();
	});

	function toggleWeight(list: number[], weight: number): number[] {
		return list.includes(weight) ? list.filter((w) => w !== weight) : [...list, weight];
	}

	function openMobileFilters() {
		draftBrand = brandFilter;
		draftWeights = [...selectedWeights];
		draftTypeFilter = typeFilter;
		draftSourceFilter = sourceFilter;
		draftSortBy = sortBy;
		showMobileFilters = true;
	}

	function applyMobileFilters() {
		brandFilter = draftBrand;
		selectedWeights = [...draftWeights];
		typeFilter = draftTypeFilter;
		sourceFilter = draftSourceFilter;
		sortBy = draftSortBy;
		visibleCount = MOBILE_PAGE_SIZE;
		closeMobileFilters();
	}

	function resetFilters() {
		brandFilter = 'all';
		typeFilter = 'all';
		sourceFilter = 'all';
		selectedWeights = [];
	}

	function resetDraftFilters() {
		draftBrand = 'all';
		draftTypeFilter = 'all';
		draftSourceFilter = 'all';
		draftWeights = [];
	}

	const brandColors: Record<string, string> = {
		AZOT: 'bg-eft-gold-dim text-eft-gold',
		BLS: 'border border-eft-border-yel text-eft-gold',
		AIMTOP: 'border border-eft-border-hi text-eft-gold',
	};
</script>

{#snippet filterSkeleton()}
	{#each Array(5) as _}
		<div class="space-y-2">
			<div class="h-2.5 w-20 animate-pulse rounded bg-eft-elevated"></div>
			<div class="h-9 w-full animate-pulse rounded bg-eft-elevated"></div>
		</div>
	{/each}
{/snippet}

{#snippet filterPanel(
	brand: string,
	weights: number[],
	type: TypeFilter,
	source: SourceFilter,
	sort: SortBy,
	onBrand: (value: string) => void,
	onWeight: (weight: number) => void,
	onType: (value: TypeFilter) => void,
	onSource: (value: SourceFilter) => void,
	onSort: (value: SortBy) => void,
	onReset: (() => void) | null = null
)}
	{#if !catalog}
		{@render filterSkeleton()}
	{:else}
		{#if onReset && (brand !== 'all' || type !== 'all' || source !== 'all' || weights.length > 0)}
			<button
				onclick={onReset}
				class="w-full rounded-md border border-eft-border py-1.5 text-xs text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text"
			>
				Сбросить фильтры
			</button>
		{/if}

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Производитель</p>
			<EftSelect value={brand} options={brandOptions} onchange={onBrand} />
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Тип</p>
			<EftSelect value={type} options={TYPE_OPTIONS} onchange={(v) => onType(v as TypeFilter)} />
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Вес шара</p>
			<div class="flex flex-wrap gap-1">
				{#each catalog.weights as weight}
					{@const active = weights.includes(weight)}
					<button
						onclick={() => onWeight(weight)}
						class="rounded border px-2 py-0.5 text-xs transition-colors {active ? 'border-eft-gold bg-eft-gold-dim text-eft-gold' : 'border-eft-border-hi text-eft-muted hover:border-eft-gold hover:text-eft-text'}"
					>
						{weight}
					</button>
				{/each}
			</div>
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Магазин</p>
			<EftSelect value={source} options={SOURCE_OPTIONS} onchange={(v) => onSource(v as SourceFilter)} />
		</div>

		<div>
			<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Сортировка</p>
			<SortSelect value={sort} {weights} onchange={onSort} />
		</div>
	{/if}
{/snippet}

{#snippet productRow(product: Product, mobile = false)}
	<a
		href={product.url ?? '#'}
		target="_blank"
		rel="noopener noreferrer"
		data-sveltekit-preload-data="false"
		class="group flex items-center gap-3 border-b border-eft-border transition-colors last:border-b-0 hover:bg-eft-elevated
			{mobile ? 'px-3 py-3' : 'gap-4 px-4 py-2.5'}"
	>
		<div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
			<div class="flex shrink-0 flex-wrap gap-1">
				<Badge class={brandColors[product.brand] ?? ''}>{product.brand}</Badge>
				{#if product.tracer}
					<Badge class="border border-eft-gold-tracer text-eft-gold">трассер</Badge>
				{/if}
			</div>
			<p class="min-w-0 text-sm leading-snug text-eft-text {mobile ? 'line-clamp-2' : 'truncate'}">{product.name}</p>
		</div>
		<div class="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-6">
			<span class="text-xs text-eft-muted">{product.weight != null ? `${product.weight} г` : '—'}</span>
			<span class="text-sm font-bold text-eft-gold">{product.price} руб.</span>
			{#if !mobile}
				<span class="w-16 text-right text-[9px] text-eft-muted/40">{product.source === 'pentagon' ? 'pentagon.by' : 'strike.by'}</span>
			{/if}
		</div>
	</a>
{/snippet}

{#snippet listSkeleton(mobile = false)}
	<div class="overflow-hidden rounded-xl border border-eft-border">
		{#each Array(mobile ? 8 : 12) as _}
			<div class="flex items-center gap-3 border-b border-eft-border px-3 py-3 last:border-b-0">
				<div class="flex flex-1 flex-col gap-2">
					<div class="h-4 w-16 animate-pulse rounded bg-eft-elevated"></div>
					<div class="h-4 w-full animate-pulse rounded bg-eft-elevated"></div>
				</div>
				<div class="h-4 w-14 animate-pulse rounded bg-eft-elevated"></div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex h-full overflow-hidden">
	<aside class="hidden w-52 shrink-0 space-y-5 overflow-y-auto border-r border-eft-border p-5 md:block">
		{@render filterPanel(
			brandFilter,
			selectedWeights,
			typeFilter,
			sourceFilter,
			sortBy,
			(value) => { brandFilter = value; },
			(weight) => { selectedWeights = toggleWeight(selectedWeights, weight); },
			(value) => { typeFilter = value; },
			(value) => { sourceFilter = value; },
			(value) => { sortBy = value; },
			resetFilters
		)}
	</aside>

	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		<div
			class="flex-1 px-3 pt-[15px] pb-24 md:overflow-visible md:p-5 md:pb-5 {showMobileFilters ? 'max-md:overflow-hidden max-md:overscroll-none' : 'overflow-y-auto'}"
		>
			<div class="mb-4 hidden items-center justify-between md:flex">
				<p class="text-xs text-eft-muted">
					{#if !catalog}
						<span class="inline-block h-3 w-24 animate-pulse rounded bg-eft-elevated"></span>
					{:else}
						Найдено: <span class="text-eft-text">{allFiltered().length}</span>
					{/if}
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

			{#if !catalog}
				<div class="md:hidden">
					{@render listSkeleton(true)}
				</div>
				<div class="hidden md:block">
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each Array(12) as _}
							<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface animate-pulse">
								<div class="aspect-square bg-eft-elevated"></div>
								<div class="space-y-2 p-3">
									<div class="h-3 w-16 rounded bg-eft-elevated"></div>
									<div class="h-3 w-full rounded bg-eft-elevated"></div>
									<div class="mt-2 h-4 w-20 rounded bg-eft-elevated"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Mobile: list + infinite scroll -->
				<div class="md:hidden">
					{#if allFiltered().length === 0}
						<div class="py-20 text-center text-eft-muted">Ничего не найдено</div>
					{:else}
						<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
							{#each mobileDisplayed as product (product.id)}
								{@render productRow(product, true)}
							{/each}
						</div>

						{#if loadingMore}
							<div class="flex justify-center py-6">
								<div class="h-5 w-5 animate-spin rounded-full border-2 border-eft-gold border-t-transparent"></div>
							</div>
						{/if}

						{#if hasMore && !loadingMore}
							<div bind:this={sentinel} class="h-4"></div>
						{/if}

						{#if !hasMore && allFiltered().length > 0}
							<p class="py-6 text-center text-xs text-eft-muted">Все товары загружены</p>
						{/if}
					{/if}
				</div>

				<!-- Desktop: grid or list + pagination -->
				<div class="hidden md:block">
					{#if viewMode === 'grid'}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each filtered as product (product.id)}
								<a href={product.url ?? '#'} target="_blank" rel="noopener noreferrer" data-sveltekit-preload-data="false"
									class="group relative flex flex-col rounded-xl border border-eft-border bg-eft-surface transition-colors hover:border-eft-gold"
								>
									{#if product.source === 'pentagon'}
										<span class="absolute right-1.5 top-1.5 z-10 rounded-sm bg-black/50 px-1.5 py-0.5 text-[9px] tracking-wide text-white/40">pentagon.by</span>
									{/if}
									{#if product.image}
										<div class="aspect-square overflow-hidden bg-eft-elevated">
											<img src={product.image} alt={product.name} class="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
										</div>
									{:else}
										<div class="aspect-square bg-eft-elevated"></div>
									{/if}
									<div class="flex flex-1 flex-col gap-2 p-3">
										<div class="flex flex-wrap gap-1">
											<span class="px-1.5 py-0.5 text-[10px] font-bold uppercase {brandColors[product.brand] ?? 'text-eft-muted'}">{product.brand}</span>
											{#if product.tracer}
												<span class="border border-eft-gold-tracer px-1.5 py-0.5 text-[10px] font-bold uppercase text-eft-gold">трассер</span>
											{/if}
										</div>
										<p class="text-sm leading-snug text-eft-text">{product.name}</p>
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
						<div class="overflow-hidden rounded-xl border border-eft-border">
							{#each filtered as product (product.id)}
								{@render productRow(product)}
							{/each}
						</div>
					{/if}

					{#if allFiltered().length === 0}
						<div class="py-20 text-center text-eft-muted">Ничего не найдено</div>
					{:else if viewMode === 'list' && totalPages > 1}
						<div class="mt-4 flex items-center justify-between text-sm text-eft-muted">
							<span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allFiltered().length)} из {allFiltered().length}</span>
							<div class="flex items-center gap-0.5">
								<button onclick={() => (page = 1)} disabled={page === 1} class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">«</button>
								<button onclick={() => (page -= 1)} disabled={page === 1} class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">‹</button>
								{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
									{#if p === 1 || p === totalPages || Math.abs(p - page) <= 1}
										<button onclick={() => (page = p)} class="min-w-[2rem] px-2 py-1 transition-colors {p === page ? 'bg-eft-elevated text-eft-gold' : 'hover:text-eft-text'}">{p}</button>
									{:else if Math.abs(p - page) === 2}
										<span class="px-1">…</span>
									{/if}
								{/each}
								<button onclick={() => (page += 1)} disabled={page === totalPages} class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">›</button>
								<button onclick={() => (page = totalPages)} disabled={page === totalPages} class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">»</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-60 bg-gradient-to-t from-eft-bg via-eft-bg/80 to-transparent md:hidden"
	aria-hidden="true"
></div>

<button
	onclick={() => (showMobileFilters ? applyMobileFilters() : openMobileFilters())}
	class="fixed bottom-12 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4 rounded-full border px-10 py-4 text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-colors md:hidden
		{showMobileFilters
			? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
			: 'border-eft-border bg-eft-surface text-eft-text hover:border-eft-gold'}"
>
	{#if showMobileFilters}
		Применить
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
			<path d="M1 3h14v2L9.5 10v5l-3-1.5V10L1 5V3z"/>
		</svg>
		Фильтр
		{#if activeFilterCount > 0}
			<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-eft-gold px-1.5 text-[10px] font-bold text-black">
				{activeFilterCount}
			</span>
		{/if}
	{/if}
</button>

{#if showMobileFilters}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-[55] h-28 bg-gradient-to-t from-eft-bg via-eft-bg/90 via-35% to-transparent md:hidden"
		aria-hidden="true"
	></div>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={closeMobileFilters}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[85vh] touch-auto flex-col rounded-t-2xl border-t border-eft-border bg-eft-bg"
			transition:fly={{ y: 320, duration: 280, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex shrink-0 justify-center pt-2 pb-1">
				<div class="h-1 w-10 rounded-full bg-eft-border-hi"></div>
			</div>
			<div class="flex shrink-0 items-center justify-between border-b border-eft-border px-4 py-3">
				<span class="w-8" aria-hidden="true"></span>
				<span class="text-sm font-semibold uppercase tracking-widest text-eft-text">Фильтры</span>
				<button
					type="button"
					onclick={resetDraftFilters}
					disabled={!draftHasFilters}
					aria-label="Сбросить фильтры"
					aria-hidden={!draftHasFilters}
					tabindex={draftHasFilters ? 0 : -1}
					class="flex h-8 w-8 items-center justify-center rounded-md text-rose-400 transition-all duration-200 hover:bg-rose-400/10 hover:text-rose-300 disabled:pointer-events-none
						{draftHasFilters ? 'opacity-100' : 'opacity-0'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
						<path d="M3 3v5h5"/>
					</svg>
				</button>
			</div>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<div class="flex-1 space-y-5 overflow-y-auto p-5 pb-40">
					{@render filterPanel(
						draftBrand,
						draftWeights,
						draftTypeFilter,
						draftSourceFilter,
						draftSortBy,
						(value) => { draftBrand = value; },
						(weight) => { draftWeights = toggleWeight(draftWeights, weight); },
						(value) => { draftTypeFilter = value; },
						(value) => { draftSourceFilter = value; },
						(value) => { draftSortBy = value; },
						null
					)}
				</div>
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-eft-bg via-eft-bg/85 via-55% to-transparent"
					aria-hidden="true"
				></div>
			</div>
		</div>
	</div>
{/if}
