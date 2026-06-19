<script lang="ts">
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import { fly, fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import type { Listing } from './+page.server';
	import { Button } from '$lib/components/ui/button';
	import EftSelect, { type EftSelectOption } from '$lib/components/balls/EftSelect.svelte';

	let { data }: { data: PageData } = $props();

	type ListingsResult = { listings: Listing[]; nextToken: string | null; total: number };
	type SourceFilter = 'all' | 'kufar' | 'vk';

	const SOURCE_OPTIONS: EftSelectOption[] = [
		{ value: 'all', label: 'Все' },
		{ value: 'kufar', label: 'Kufar' },
		{ value: 'vk', label: 'ВК Барахолка' },
	];

	const PAGE_SIZE = 15;
	const MOBILE_PAGE_SIZE = 20;
	const DEFAULT_QUERY = 'страйкбол';

	let listingsData = $state<ListingsResult | null>(null);
	let accumulated = $state<Listing[]>([]);
	let pendingQuery = $state<string | null>(null);

	let viewMode = $state<'grid' | 'list'>('grid');
	let sourceFilter = $state<SourceFilter>('all');
	let currentPage = $state(1);

	let showMobileFilters = $state(false);
	let draftSource = $state<SourceFilter>('all');
	let draftRegion = $state('');
	let draftQuery = $state(DEFAULT_QUERY);

	let visibleCount = $state(MOBILE_PAGE_SIZE);
	let loadingMore = $state(false);
	let sentinel = $state<HTMLElement | null>(null);

	const presetOptions = $derived<EftSelectOption[]>(
		data.presets.map((p) => ({ value: p.value, label: p.label }))
	);

	const regionOptions = $derived<EftSelectOption[]>(
		data.regions.map((r) => ({ value: r.value, label: r.label }))
	);

	$effect(() => {
		const cursor = page.url.searchParams.get('cursor');
		listingsData = null;
		void data.listings.then((r) => {
			const prevLen = accumulated.length;
			if (!cursor) {
				accumulated = r.listings;
			} else {
				const ids = new Set(accumulated.map((l) => l.id));
				accumulated = [...accumulated, ...r.listings.filter((l) => !ids.has(l.id))];
			}
			listingsData = r;
			if (cursor && visibleCount >= prevLen) {
				visibleCount = Math.min(visibleCount + MOBILE_PAGE_SIZE, accumulated.length);
			}
		});
	});

	$effect(() => {
		if (!navigating.to) pendingQuery = null;
	});

	const allDisplayed = $derived(
		accumulated.filter((l) => sourceFilter === 'all' || l.source === sourceFilter)
	);

	const mobileDisplayed = $derived(allDisplayed.slice(0, visibleCount));
	const hasMoreClient = $derived(visibleCount < allDisplayed.length);
	const hasMoreServer = $derived(!!listingsData?.nextToken);
	const showSentinel = $derived(
		listingsData !== null && (hasMoreClient || hasMoreServer) && !showMobileFilters
	);

	const totalPages = $derived(Math.ceil(allDisplayed.length / PAGE_SIZE));
	const displayed = $derived(allDisplayed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	const activeFilterCount = $derived(
		(sourceFilter !== 'all' ? 1 : 0) +
			(data.region !== '' ? 1 : 0) +
			(data.query !== DEFAULT_QUERY ? 1 : 0)
	);

	const draftHasFilters = $derived(
		draftSource !== 'all' || draftRegion !== '' || draftQuery !== DEFAULT_QUERY
	);

	$effect(() => {
		data.query;
		data.region;
		sourceFilter;
		currentPage = 1;
		visibleCount = MOBILE_PAGE_SIZE;
	});

	$effect(() => {
		const el = sentinel;
		if (!el || showMobileFilters) return;

		const obs = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting || loadingMore || !!navigating.to) return;
				if (visibleCount < allDisplayed.length) {
					loadingMore = true;
					visibleCount = Math.min(visibleCount + MOBILE_PAGE_SIZE, allDisplayed.length);
					loadingMore = false;
				} else if (listingsData?.nextToken) {
					loadMoreFromServer();
				}
			},
			{ rootMargin: '100px' }
		);
		obs.observe(el);
		return () => obs.disconnect();
	});

	function navigate(q: string, rgn?: string) {
		pendingQuery = q;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('q', q);
		if (rgn !== undefined) params.set('rgn', rgn);
		params.delete('cursor');
		goto(`/flea?${params}`);
	}

	function loadMoreFromServer() {
		if (!listingsData?.nextToken || loadingMore || navigating.to) return;
		loadingMore = true;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('cursor', listingsData.nextToken);
		void goto(`/flea?${params}`).finally(() => {
			loadingMore = false;
		});
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}

	function formatPrice(price: number | null) {
		return price != null ? `${price} р.` : 'Договорная';
	}

	function categoryEmoji(category: Listing['category']) {
		return category === 'weapon' ? '🔫' : category === 'gear' ? '🎒' : '📋';
	}

	function closeMobileFilters() {
		showMobileFilters = false;
	}

	function openMobileFilters() {
		draftSource = sourceFilter;
		draftRegion = data.region;
		draftQuery = data.query;
		showMobileFilters = true;
	}

	function applyMobileFilters() {
		sourceFilter = draftSource;
		const queryChanged = draftQuery !== data.query;
		const regionChanged = draftRegion !== data.region;
		closeMobileFilters();
		if (queryChanged) navigate(draftQuery, draftRegion);
		else if (regionChanged) navigate(data.query, draftRegion);
	}

	function resetDraftFilters() {
		draftSource = 'all';
		draftRegion = '';
		draftQuery = DEFAULT_QUERY;
	}
</script>

{#snippet presetButtons(wrap: boolean)}
	{#each data.presets as preset}
		<Button
			onclick={() => navigate(preset.value)}
			variant={data.query === preset.value ? 'active' : 'default'}
			disabled={!!navigating.to}
			class={wrap ? '' : 'shrink-0'}
			size="sm"
		>
			{#if pendingQuery === preset.value}
				<span class="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
			{/if}
			{preset.label}
		</Button>
	{/each}
{/snippet}

{#snippet filterPanel(
	query: string,
	source: SourceFilter,
	region: string,
	onQuery: (value: string) => void,
	onSource: (value: SourceFilter) => void,
	onRegion: (value: string) => void
)}
	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Категория</p>
		<EftSelect value={query} options={presetOptions} onchange={onQuery} />
	</div>
	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Город</p>
		<EftSelect value={region} options={regionOptions} onchange={onRegion} />
	</div>
	<div>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Источник</p>
		<EftSelect value={source} options={SOURCE_OPTIONS} onchange={(v) => onSource(v as SourceFilter)} />
	</div>
{/snippet}

{#snippet gridCard(item: Listing)}
	<a
		href={item.url}
		target="_blank"
		rel="noopener noreferrer"
		data-sveltekit-preload-data="false"
		class="group relative flex flex-col rounded-xl border border-eft-border bg-eft-surface transition-colors hover:border-eft-gold"
	>
		<span class="absolute right-1.5 top-1.5 z-10 rounded-sm bg-black/50 px-1.5 py-0.5 text-[9px] tracking-wide text-white/40">
			{item.source === 'vk' ? 'vk.com' : 'kufar.by'}
		</span>
		<div class="aspect-square overflow-hidden bg-eft-elevated">
			{#if item.image}
				<img
					src={item.image}
					alt={item.title}
					class="h-full w-full object-cover transition-transform group-hover:scale-105"
					loading="lazy"
				/>
			{:else}
				<div class="flex h-full items-center justify-center text-3xl text-eft-muted">
					{categoryEmoji(item.category)}
				</div>
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1 p-2">
			<p class="line-clamp-2 text-xs leading-snug text-eft-text group-hover:text-eft-gold">{item.title}</p>
			<div class="mt-auto flex items-end justify-between gap-1 pt-1">
				<span class="text-sm font-bold text-eft-gold">{formatPrice(item.price)}</span>
				<span class="text-[10px] text-eft-muted">{formatDate(item.date)}</span>
			</div>
			{#if item.condition || item.exchange}
				<div class="flex items-center gap-1">
					{#if item.condition}
						<span class="text-[10px] text-eft-muted">{item.condition}</span>
					{/if}
					{#if item.exchange}
						<span class="ml-auto text-[10px] text-eft-muted">⇄ обмен</span>
					{/if}
				</div>
			{/if}
		</div>
	</a>
{/snippet}

{#snippet gridSkeleton(count = 10)}
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each Array(count) as _}
			<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface animate-pulse">
				<div class="aspect-square bg-eft-elevated"></div>
				<div class="space-y-1.5 p-2">
					<div class="h-3 w-full rounded bg-eft-elevated"></div>
					<div class="h-3 w-2/3 rounded bg-eft-elevated"></div>
					<div class="mt-1 h-4 w-16 rounded bg-eft-elevated"></div>
				</div>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet listingRow(item: Listing, mobile = false)}
	<a
		href={item.url}
		target="_blank"
		rel="noopener noreferrer"
		data-sveltekit-preload-data="false"
		class="group flex items-center gap-3 border-b border-eft-border transition-colors last:border-b-0 hover:bg-eft-elevated
			{mobile ? 'px-3 py-3' : 'px-4 py-2.5'}"
	>
		<span class="shrink-0 text-base" title={item.category}>{categoryEmoji(item.category)}</span>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<p class="min-w-0 text-sm leading-snug text-eft-text group-hover:text-eft-gold {mobile ? 'line-clamp-2' : 'truncate'}">
				{item.title}
			</p>
			{#if mobile && (item.condition || item.exchange)}
				<div class="flex flex-wrap gap-2 text-[10px] text-eft-muted">
					{#if item.condition}<span>{item.condition}</span>{/if}
					{#if item.exchange}<span>⇄ обмен</span>{/if}
				</div>
			{/if}
		</div>
		<div class="flex shrink-0 flex-col items-end gap-0.5">
			<span class="text-sm font-bold text-eft-gold">{formatPrice(item.price)}</span>
			<span class="text-xs text-eft-muted">{formatDate(item.date)}</span>
			{#if mobile}
				<span class="text-[9px] text-eft-muted/40">{item.source === 'vk' ? 'vk.com' : 'kufar.by'}</span>
			{/if}
		</div>
		{#if !mobile}
			{#if item.condition}
				<span class="hidden shrink-0 text-xs text-eft-muted sm:inline">{item.condition}</span>
			{/if}
			{#if item.exchange}
				<span class="hidden shrink-0 text-[10px] text-eft-muted sm:inline">⇄</span>
			{/if}
			<span class="hidden w-24 shrink-0 text-right text-xs text-eft-muted md:inline">{item.region}</span>
			<span class="hidden w-12 shrink-0 text-right text-[9px] text-eft-muted/40 lg:inline">
				{item.source === 'vk' ? 'vk.com' : 'kufar.by'}
			</span>
		{/if}
	</a>
{/snippet}

<div class="flex h-full flex-col overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden md:gap-4 md:overflow-y-auto md:p-5">
		<!-- Desktop presets -->
		<div class="hidden flex-wrap items-center gap-2 md:flex">
			{@render presetButtons(true)}
		</div>

		<!-- Desktop filters -->
		<div class="hidden flex-wrap items-center justify-between gap-3 md:flex">
			<div class="flex flex-wrap items-center gap-3">
				<div class="w-44">
					<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Город</p>
					<EftSelect
						value={data.region}
						options={regionOptions}
						onchange={(v) => navigate(data.query, v)}
					/>
				</div>
				<div class="w-44">
					<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Источник</p>
					<EftSelect
						value={sourceFilter}
						options={SOURCE_OPTIONS}
						onchange={(v) => (sourceFilter = v as SourceFilter)}
					/>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<span class="text-xs text-eft-muted">
					{#if listingsData}
						{allDisplayed.length} / <span class="text-eft-text">{listingsData.total}</span>
					{:else}
						<span class="inline-block h-3 w-16 animate-pulse rounded bg-eft-elevated"></span>
					{/if}
				</span>
				<div class="flex border border-eft-border">
					<Button onclick={() => (viewMode = 'grid')} variant={viewMode === 'grid' ? 'active' : 'ghost'} size="icon" title="Сетка">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
							<rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
						</svg>
					</Button>
					<Button onclick={() => (viewMode = 'list')} variant={viewMode === 'list' ? 'active' : 'ghost'} size="icon" title="Список">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/>
							<rect x="1" y="12" width="14" height="2" rx="1"/>
						</svg>
					</Button>
				</div>
			</div>
		</div>

		<div
			class="flex-1 overflow-y-auto px-3 pb-24 pt-3 md:overflow-visible md:p-0 md:pb-0 md:pt-0
				{showMobileFilters ? 'max-md:overflow-hidden max-md:overscroll-none' : ''}"
		>
			{#if !listingsData}
				<div class="md:hidden">
					{@render gridSkeleton(8)}
				</div>
				<div class="hidden md:block">
					{@render gridSkeleton(10)}
				</div>
			{:else}
				<!-- Mobile grid -->
				<div class="md:hidden">
					{#if allDisplayed.length === 0}
						<div class="py-20 text-center text-eft-muted">Объявлений не найдено</div>
					{:else}
						<div class="grid grid-cols-2 gap-3">
							{#each mobileDisplayed as item (item.id)}
								{@render gridCard(item)}
							{/each}
						</div>

						{#if loadingMore || navigating.to}
							<div class="flex justify-center py-6">
								<div class="h-5 w-5 animate-spin rounded-full border-2 border-eft-gold border-t-transparent"></div>
							</div>
						{/if}

						{#if showSentinel && !loadingMore && !navigating.to}
							<div bind:this={sentinel} class="h-4"></div>
						{/if}

						{#if !hasMoreClient && !hasMoreServer && allDisplayed.length > 0}
							<p class="py-6 text-center text-xs text-eft-muted">Все объявления загружены</p>
						{/if}
					{/if}
				</div>

				<!-- Desktop grid / list -->
				<div class="hidden md:block">
					{#if allDisplayed.length === 0}
						<div class="py-16 text-center text-sm text-eft-muted">Объявлений не найдено</div>
					{:else if viewMode === 'grid'}
						<div class="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
							{#each displayed as item (item.id)}
								{@render gridCard(item)}
							{/each}
						</div>
					{:else}
						<div class="overflow-hidden rounded-xl border border-eft-border">
							{#each displayed as item (item.id)}
								{@render listingRow(item)}
							{/each}
						</div>
					{/if}

					{#if allDisplayed.length > 0 && (totalPages > 1 || listingsData.nextToken)}
						<div class="mt-2 flex items-center justify-between text-sm text-eft-muted">
							<span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, allDisplayed.length)} из {listingsData.total}</span>
							<div class="flex items-center gap-0.5">
								<button onclick={() => (currentPage = 1)} disabled={currentPage === 1}
									class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">«</button>
								<button onclick={() => (currentPage -= 1)} disabled={currentPage === 1}
									class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">‹</button>
								{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
									{#if p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1}
										<button onclick={() => (currentPage = p)}
											class="min-w-[2rem] px-2 py-1 transition-colors {p === currentPage ? 'bg-eft-elevated text-eft-gold' : 'hover:text-eft-text'}"
										>{p}</button>
									{:else if Math.abs(p - currentPage) === 2}
										<span class="px-1">…</span>
									{/if}
								{/each}
								<button
									onclick={() => (currentPage += 1)}
									disabled={currentPage === totalPages && !listingsData.nextToken}
									class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text"
								>›</button>
								{#if currentPage === totalPages && listingsData.nextToken}
									<button
										onclick={loadMoreFromServer}
										class="px-2 py-1 transition-colors hover:text-eft-text"
										title="Загрузить следующую страницу"
									>»</button>
								{:else}
									<button onclick={() => (currentPage = totalPages)} disabled={currentPage === totalPages}
										class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">»</button>
								{/if}
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
						draftQuery,
						draftSource,
						draftRegion,
						(value) => { draftQuery = value; },
						(value) => { draftSource = value; },
						(value) => { draftRegion = value; }
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
