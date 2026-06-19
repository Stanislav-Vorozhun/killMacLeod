<script lang="ts">
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import type { PageData } from './$types';
	import type { Listing } from './+page.server';
	import { Button } from '$lib/components/ui/button';
	import { NativeSelect } from '$lib/components/ui/native-select';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();

	type ListingsResult = { listings: Listing[]; nextToken: string | null; total: number };
	let listingsData = $state<ListingsResult | null>(null);

	$effect(() => {
		listingsData = null;
		void data.listings.then((r) => { listingsData = r; });
	});

	let pendingQuery = $state<string | null>(null);

	$effect(() => {
		if (!navigating.to) pendingQuery = null;
	});

	let viewMode = $state<'grid' | 'list'>('grid');
	let sourceFilter = $state<'all' | 'kufar' | 'vk'>('all');
	let currentPage = $state(1);
	const PAGE_SIZE = 15;

	const allDisplayed = $derived(
		(listingsData?.listings ?? []).filter((l: Listing) => {
			if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
			return true;
		})
	);

	const totalPages = $derived(Math.ceil(allDisplayed.length / PAGE_SIZE));
	const displayed = $derived(allDisplayed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	$effect(() => {
		allDisplayed;
		currentPage = 1;
	});

	function navigate(q: string, rgn?: string) {
		pendingQuery = q;
		const params = new URLSearchParams(page.url.searchParams);
		params.set('q', q);
		if (rgn !== undefined) params.set('rgn', rgn);
		params.delete('cursor');
		goto(`/flea?${params}`);
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}

	function formatPrice(price: number | null) {
		return price != null ? `${price} р.` : 'Договорная';
	}


</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-5">
	<!-- Preset tags -->
	<div class="flex flex-wrap items-center gap-2">
		{#each data.presets as preset}
			<Button
				onclick={() => navigate(preset.value)}
				variant={data.query === preset.value ? 'active' : 'default'}
				disabled={!!navigating.to}
			>
				{#if pendingQuery === preset.value}
					<span class="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				{/if}
				{preset.label}
			</Button>
		{/each}
	</div>

	<!-- Filters row -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<NativeSelect
				label="Город"
				value={data.region}
				disabled={!!navigating.to}
				onchange={(e: Event) => navigate(data.query, (e.target as HTMLSelectElement).value)}
			>
				{#each data.regions as r}
					<option value={r.value}>{r.label}</option>
				{/each}
			</NativeSelect>

			<div class="flex border border-eft-border">
				{#each ([['all', 'Все'], ['kufar', 'Kufar'], ['vk', 'ВК Барахолка']] as const) as [val, label]}
					<Button
						onclick={() => (sourceFilter = val)}
						variant={sourceFilter === val ? 'active' : 'ghost'}
						size="sm"
					>{label}</Button>
				{/each}
			</div>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-xs text-eft-muted">
				{#if listingsData}
					{allDisplayed.length} / <span class="text-eft-text">{listingsData.total}</span>
				{:else}
					<span class="inline-block h-3 w-16 rounded bg-eft-elevated animate-pulse"></span>
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

	<!-- Loading skeleton -->
	{#if !listingsData}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each Array(10) as _}
				<div class="rounded-xl border border-eft-border bg-eft-surface overflow-hidden animate-pulse">
					<div class="aspect-square bg-eft-elevated"></div>
					<div class="p-2 space-y-1.5">
						<div class="h-3 w-full rounded bg-eft-elevated"></div>
						<div class="h-3 w-2/3 rounded bg-eft-elevated"></div>
						<div class="h-4 w-16 rounded bg-eft-elevated mt-1"></div>
					</div>
				</div>
			{/each}
		</div>

	<!-- Grid view -->
	{:else if viewMode === 'grid'}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each displayed as item (item.id)}
				<a href={item.url} target="_blank" rel="noopener noreferrer" data-sveltekit-preload-data="false"
					class="group relative flex flex-col rounded-xl border border-eft-border bg-eft-surface transition-colors hover:border-eft-gold"
				>
					<span class="absolute right-1.5 top-1.5 z-10 rounded-sm bg-black/50 px-1.5 py-0.5 text-[9px] tracking-wide text-white/40">
						{item.source === 'vk' ? 'vk.com' : 'kufar.by'}
					</span>
					<div class="aspect-square overflow-hidden bg-eft-elevated">
						{#if item.image}
							<img src={item.image} alt={item.title}
								class="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
						{:else}
							<div class="flex h-full items-center justify-center text-3xl text-eft-muted">
								{item.category === 'weapon' ? '🔫' : item.category === 'gear' ? '🎒' : '📋'}
							</div>
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-1 p-2">
						<p class="line-clamp-2 text-xs leading-snug text-eft-text group-hover:text-eft-gold">{item.title}</p>
						<div class="mt-auto flex items-end justify-between gap-1 pt-1">
							<span class="text-sm font-bold text-eft-gold">{formatPrice(item.price)}</span>
							<span class="text-[10px] text-eft-muted">{formatDate(item.date)}</span>
						</div>
						<div class="flex items-center gap-1">
							{#if item.condition}
								<span class="text-[10px] text-eft-muted">{item.condition}</span>
							{/if}
							{#if item.exchange}
								<span class="ml-auto text-[10px] text-eft-muted">⇄ обмен</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>

	<!-- List view -->
	{:else}
		<div class="flex flex-col divide-y divide-eft-border rounded-xl border border-eft-border overflow-hidden">
			{#each displayed as item (item.id)}
				<a href={item.url} target="_blank" rel="noopener noreferrer" data-sveltekit-preload-data="false"
					class="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-eft-elevated"
				>
					<span class="text-base" title={item.category}>
						{item.category === 'weapon' ? '🔫' : item.category === 'gear' ? '🎒' : '📋'}
					</span>
					<p class="min-w-0 flex-1 truncate text-sm text-eft-text group-hover:text-eft-gold">{item.title}</p>
					{#if item.condition}
						<span class="shrink-0 text-xs text-eft-muted">{item.condition}</span>
					{/if}
					{#if item.exchange}
						<span class="shrink-0 text-[10px] text-eft-muted">⇄</span>
					{/if}
					<span class="w-24 shrink-0 text-right text-xs text-eft-muted">{item.region}</span>
					<span class="w-24 shrink-0 text-right text-sm font-bold text-eft-gold">{formatPrice(item.price)}</span>
					<span class="w-14 shrink-0 text-right text-xs text-eft-muted">{formatDate(item.date)}</span>
					<span class="w-12 shrink-0 text-right text-[9px] text-eft-muted/40">{item.source === 'vk' ? 'vk.com' : 'kufar.by'}</span>
				</a>
			{/each}
		</div>
	{/if}

	{#if listingsData && allDisplayed.length === 0}
		<div class="py-16 text-center text-sm text-eft-muted">Объявлений не найдено</div>
	{:else if listingsData && (totalPages > 1 || listingsData.nextToken)}
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

				<button onclick={() => (currentPage += 1)} disabled={currentPage === totalPages && !listingsData.nextToken}
					class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">›</button>

				{#if currentPage === totalPages && listingsData.nextToken}
					<a href="/flea?q={encodeURIComponent(data.query)}&rgn={data.region}&cursor={encodeURIComponent(listingsData.nextToken)}"
						class="px-2 py-1 transition-colors hover:text-eft-text" title="Загрузить следующую страницу">»</a>
				{:else}
					<button onclick={() => (currentPage = totalPages)} disabled={currentPage === totalPages}
						class="px-2 py-1 transition-colors disabled:opacity-30 hover:enabled:text-eft-text">»</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
