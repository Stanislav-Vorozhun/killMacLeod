<script lang="ts">
	import type { PageData } from './$types';
	import type { PyroProduct, PyroType } from './+page.server';
	import { fly, fade } from 'svelte/transition';
	import EftSelect, { type EftSelectOption } from '$lib/components/balls/EftSelect.svelte';

	let { data }: { data: PageData } = $props();

	let products = $state<PyroProduct[]>([]);
	let showMobileFilters = $state(false);

	$effect(() => {
		void data.products.then((p) => { products = p; });
	});

	type AvailFilter = 'all' | 'in_stock' | 'in_transit' | 'preorder';
	type SortBy = 'price-asc' | 'price-desc' | 'name-asc';

	let availFilter = $state<AvailFilter>('all');
	let sortBy = $state<SortBy>('price-asc');
	let typeFilter = $state<PyroType | 'all'>('all');

	let draftAvail = $state<AvailFilter>('all');
	let draftSort = $state<SortBy>('price-asc');
	let draftType = $state<PyroType | 'all'>('all');

	const MOBILE_PAGE_SIZE = 20;
	let visibleCount = $state(MOBILE_PAGE_SIZE);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLElement | null>(null);

	function stockStatus(p: PyroProduct): 'in_stock' | 'in_transit' | 'preorder' | 'out' {
		if (p.stockCount > 0) return 'in_stock';
		const label = p.corner?.label ?? '';
		if (/в пути/i.test(label)) return 'in_transit';
		if (/предзаказ/i.test(label)) return 'preorder';
		return 'out';
	}

	function filterAndSort(list: PyroProduct[], avail: AvailFilter, sort: SortBy, type: PyroType | 'all'): PyroProduct[] {
		let result = list;
		if (avail !== 'all') result = result.filter((p) => stockStatus(p) === avail);
		if (type !== 'all') result = result.filter((p) => p.pyroType === type);
		return result.toSorted((a, b) => {
			if (sort === 'price-asc') return a.price - b.price;
			if (sort === 'price-desc') return b.price - a.price;
			return a.name.localeCompare(b.name, 'ru');
		});
	}

	const allFiltered = $derived(() => filterAndSort(products, availFilter, sortBy, typeFilter));
	const mobileDisplayed = $derived(allFiltered().slice(0, visibleCount));
	const hasMore = $derived(products.length > 0 && visibleCount < allFiltered().length);

	const PAGE_SIZE = 20;
	let page = $state(1);
	const totalPages = $derived(Math.ceil(allFiltered().length / PAGE_SIZE));
	const desktopFiltered = $derived(allFiltered().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	const activeFilterCount = $derived(
		(availFilter !== 'all' ? 1 : 0) + (sortBy !== 'price-asc' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)
	);
	const draftHasChanges = $derived(draftAvail !== 'all' || draftSort !== 'price-asc' || draftType !== 'all');

	$effect(() => {
		allFiltered();
		page = 1;
		visibleCount = MOBILE_PAGE_SIZE;
	});

	$effect(() => {
		const el = sentinel;
		if (!el || !hasMore) return;
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

	function openFilters() {
		draftAvail = availFilter;
		draftSort = sortBy;
		draftType = typeFilter;
		showMobileFilters = true;
	}

	function applyFilters() {
		availFilter = draftAvail;
		sortBy = draftSort;
		typeFilter = draftType;
		visibleCount = MOBILE_PAGE_SIZE;
		showMobileFilters = false;
	}

	function resetDraft() {
		draftAvail = 'all';
		draftSort = 'price-asc';
		draftType = 'all';
	}

	function resetActive() {
		availFilter = 'all';
		sortBy = 'price-asc';
		typeFilter = 'all';
	}

	const STATUS_LABEL: Record<string, string> = {
		in_stock: 'В наличии',
		in_transit: 'В пути',
		preorder: 'Предзаказ',
		out: 'Нет в наличии',
	};
	const STATUS_CLS: Record<string, string> = {
		in_stock: 'bg-emerald-400/15 text-emerald-300',
		in_transit: 'bg-sky-400/15 text-sky-300',
		preorder: 'bg-yellow-400/15 text-yellow-300',
		out: 'bg-eft-elevated text-eft-muted',
	};

	const AVAIL_OPTIONS: EftSelectOption[] = [
		{ value: 'all',        label: 'Все' },
		{ value: 'in_stock',   label: 'Есть в наличии' },
		{ value: 'in_transit', label: 'Скоро (В пути)' },
		{ value: 'preorder',   label: 'Предзаказ' },
	];
	const SORT_OPTIONS: EftSelectOption[] = [
		{ value: 'price-asc',  label: 'Цена ↑' },
		{ value: 'price-desc', label: 'Цена ↓' },
		{ value: 'name-asc',   label: 'По названию' },
	];
	const TYPE_OPTIONS: EftSelectOption[] = [
		{ value: 'all',         label: 'Все типы' },
		{ value: 'vog',         label: 'ВОГ / Имитационный' },
		{ value: 'rgd',         label: 'РГД-5' },
		{ value: 'f1',          label: 'Ф-1' },
		{ value: 'khatabka',    label: 'Хатабка / FPC' },
		{ value: 'smoke',       label: 'Дымовая' },
		{ value: 'mine',        label: 'Мина' },
		{ value: 'deactivated', label: 'Деактиватор / Ёлочка' },
		{ value: 'other',       label: 'Другое' },
	];
</script>

{#snippet filterPanel(
	avail: AvailFilter,
	sort: SortBy,
	type: PyroType | 'all',
	onAvail: (v: AvailFilter) => void,
	onSort: (v: SortBy) => void,
	onType: (v: PyroType | 'all') => void,
	onReset: (() => void) | null = null
)}
	{#if onReset && (avail !== 'all' || sort !== 'price-asc' || type !== 'all')}
		<button
			onclick={onReset}
			class="w-full rounded-md border border-eft-border py-1.5 text-xs text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text"
		>Сбросить фильтры</button>
	{/if}

	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Тип гранаты</p>
		<EftSelect value={type} options={TYPE_OPTIONS} onchange={(v) => onType(v as PyroType | 'all')} />
	</div>

	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Наличие</p>
		<EftSelect value={avail} options={AVAIL_OPTIONS} onchange={(v) => onAvail(v as AvailFilter)} />
	</div>

	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Сортировка</p>
		<EftSelect value={sort} options={SORT_OPTIONS} onchange={(v) => onSort(v as SortBy)} />
	</div>
{/snippet}

{#snippet productRow(p: PyroProduct, mobile = false)}
	{@const status = stockStatus(p)}
	<a
		href={p.url}
		target="_blank"
		rel="noopener noreferrer"
		data-sveltekit-preload-data="false"
		class="group flex items-center gap-3 border-b border-eft-border transition-colors last:border-b-0 hover:bg-eft-elevated
			{mobile ? 'px-3 py-3' : 'px-4 py-2.5'}"
	>
		<div class="flex min-w-0 flex-1 flex-col gap-1.5">
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider {STATUS_CLS[status]}">
					{STATUS_LABEL[status]}
				</span>
				{#if p.qtyInPack}
					<span class="rounded border border-eft-border px-1.5 py-0.5 text-[10px] text-eft-muted">
						{p.qtyInPack} шт.
					</span>
				{/if}
			</div>
			<p class="min-w-0 text-sm leading-snug text-eft-text {mobile ? 'line-clamp-2' : 'truncate'}">{p.name}</p>
		</div>
		<div class="flex shrink-0 flex-col items-end gap-0.5">
			{#if p.stockCount > 0}
				<span class="text-xs text-eft-muted">{p.stockCount} ед.</span>
			{/if}
			<span class="text-sm font-bold text-eft-gold whitespace-nowrap">{p.price} р.</span>
		</div>
	</a>
{/snippet}

{#snippet skeleton(mobile = false)}
	<div class="overflow-hidden rounded-xl border border-eft-border">
		{#each Array(mobile ? 8 : 12) as _}
			<div class="flex items-center gap-3 border-b border-eft-border px-3 py-3 last:border-b-0">
				<div class="flex flex-1 flex-col gap-2">
					<div class="h-4 w-20 animate-pulse rounded bg-eft-elevated"></div>
					<div class="h-4 w-full animate-pulse rounded bg-eft-elevated"></div>
				</div>
				<div class="h-4 w-14 animate-pulse rounded bg-eft-elevated"></div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex h-full overflow-hidden">
	<!-- Desktop sidebar -->
	<aside class="hidden w-52 shrink-0 space-y-5 overflow-y-auto border-r border-eft-border p-5 md:block">
		{#if products.length === 0}
			{#each Array(3) as _}
				<div class="space-y-2">
					<div class="h-2.5 w-20 animate-pulse rounded bg-eft-elevated"></div>
					<div class="h-9 w-full animate-pulse rounded bg-eft-elevated"></div>
					<div class="h-9 w-full animate-pulse rounded bg-eft-elevated"></div>
				</div>
			{/each}
		{:else}
			{@render filterPanel(
				availFilter, sortBy, typeFilter,
				(v) => { availFilter = v; },
				(v) => { sortBy = v; },
				(v) => { typeFilter = v; },
				resetActive
			)}
		{/if}
	</aside>

	<!-- Main content -->
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		<div class="flex-1 px-3 pt-[15px] pb-24 md:overflow-y-auto md:p-5 md:pb-5
			{showMobileFilters ? 'max-md:overflow-hidden max-md:overscroll-none' : 'overflow-y-auto'}">

			<!-- Desktop header -->
			<div class="mb-4 hidden items-center justify-between md:flex">
				<p class="text-xs text-eft-muted">
					{#if products.length === 0}
						<span class="inline-block h-3 w-24 animate-pulse rounded bg-eft-elevated"></span>
					{:else}
						Найдено: <span class="text-eft-text">{allFiltered().length}</span>
					{/if}
				</p>
			</div>

			{#if products.length === 0}
				<!-- Mobile skeleton -->
				<div class="md:hidden">{@render skeleton(true)}</div>
				<!-- Desktop skeleton -->
				<div class="hidden md:block">{@render skeleton()}</div>
			{:else}
				<!-- Mobile list + infinite scroll -->
				<div class="md:hidden">
					{#if allFiltered().length === 0}
						<div class="py-20 text-center text-eft-muted">Ничего не найдено</div>
					{:else}
						<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
							{#each mobileDisplayed as p (p.id)}
								{@render productRow(p, true)}
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
							<p class="py-6 text-center text-xs text-eft-muted">Все позиции загружены</p>
						{/if}
					{/if}
				</div>

				<!-- Desktop list + pagination -->
				<div class="hidden md:block">
					{#if allFiltered().length === 0}
						<div class="py-20 text-center text-eft-muted">Ничего не найдено</div>
					{:else}
						<div class="overflow-hidden rounded-xl border border-eft-border">
							{#each desktopFiltered as p (p.id)}
								{@render productRow(p)}
							{/each}
						</div>
						{#if totalPages > 1}
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
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Mobile: bottom gradient -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-60 bg-gradient-to-t from-eft-bg via-eft-bg/80 to-transparent md:hidden"
	aria-hidden="true"
></div>

<!-- Mobile: bottom button -->
<button
	onclick={() => (showMobileFilters ? applyFilters() : openFilters())}
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

<!-- Mobile: filter modal -->
{#if showMobileFilters}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-[55] h-28 bg-gradient-to-t from-eft-bg via-eft-bg/90 via-35% to-transparent md:hidden"
		aria-hidden="true"
	></div>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={() => showMobileFilters = false}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[92vh] touch-auto flex-col rounded-t-2xl border-t border-eft-border bg-eft-bg"
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
					onclick={resetDraft}
					disabled={!draftHasChanges}
					aria-label="Сбросить фильтры"
					tabindex={draftHasChanges ? 0 : -1}
					class="flex h-8 w-8 items-center justify-center rounded-md text-rose-400 transition-all duration-200 hover:bg-rose-400/10 disabled:pointer-events-none
						{draftHasChanges ? 'opacity-100' : 'opacity-0'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
						<path d="M3 3v5h5"/>
					</svg>
				</button>
			</div>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<div class="flex-1 space-y-5 overflow-y-auto p-5 pb-55">
					{@render filterPanel(
						draftAvail, draftSort, draftType,
						(v) => { draftAvail = v; },
						(v) => { draftSort = v; },
						(v) => { draftType = v; },
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
