<script lang="ts">
	import type { PageData } from './$types';
	import type { VkPost, WeatherDay, EventsData } from './+page.server';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { fly, fade } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let eventsData = $state<EventsData | null>(null);

	$effect(() => {
		eventsData = null;
		void data.eventsData.then((d) => { eventsData = d; });
	});

	const today = new Date();
	const todayIso = toIso(today);

	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth());
	let selected = $state<VkPost | null>(null);
	let sourceFilter = $state<'all' | 'cqb' | 'strikeball' | 'salamander' | 'bsg'>('all');

	// Mobile state
	let mobileEventDetail = $state<{ posts: VkPost[]; iso: string; w: WeatherDay | undefined; activeIdx: number } | null>(null);
	let showMobileClubFilter = $state(false);
	let mobileContainerEl = $state<HTMLElement | null>(null);
	let eventsListEl = $state<HTMLElement | null>(null);
	let calendarEl = $state<HTMLElement | null>(null);
	let naturalCalendarH = $state(0);
	let collapseOffset = $state(0);

	const COLLAPSED_H = 0;
	const collapseRange = $derived(Math.max(1, naturalCalendarH - COLLAPSED_H));
	let animFrameId = 0;

	function snapOpen() {
		cancelAnimationFrame(animFrameId);
		const startOffset = collapseOffset;
		const startTime = performance.now();
		const duration = 320;
		function step(now: number) {
			const progress = Math.min(1, (now - startTime) / duration);
			const eased = 1 - Math.pow(1 - progress, 3);
			collapseOffset = Math.round(startOffset * (1 - eased));
			if (progress < 1) animFrameId = requestAnimationFrame(step);
			else collapseOffset = 0;
		}
		animFrameId = requestAnimationFrame(step);
	}

	$effect(() => {
		if (calendarEl && !naturalCalendarH) {
			naturalCalendarH = calendarEl.scrollHeight;
		}
	});

	const calendarPx = $derived(
		naturalCalendarH && collapseOffset > 0
			? Math.round(naturalCalendarH - (Math.min(collapseOffset, collapseRange) / collapseRange) * (naturalCalendarH - COLLAPSED_H))
			: null
	);

	$effect(() => {
		const el = mobileContainerEl;
		if (!el) return;

		let lastY = 0;

		function onTouchStart(e: TouchEvent) {
			lastY = e.touches[0].clientY;
			cancelAnimationFrame(animFrameId);
		}

		function onTouchMove(e: TouchEvent) {
			const y = e.touches[0].clientY;
			const dy = lastY - y;
			lastY = y;

			e.preventDefault();

			if (dy > 0) {
				// Скролл вниз: сначала схлопываем календарь, потом скроллим список
				if (collapseOffset < collapseRange) {
					const used = Math.min(dy, collapseRange - collapseOffset);
					collapseOffset += used;
					const excess = dy - used;
					if (excess > 0 && eventsListEl) eventsListEl.scrollTop += excess;
				} else if (eventsListEl) {
					eventsListEl.scrollTop += dy;
				}
			} else {
				// Скролл вверх: сначала скроллим список, потом раскрываем календарь
				const scrollTop = eventsListEl?.scrollTop ?? 0;
				if (scrollTop > 0 && eventsListEl) {
					const newTop = Math.max(0, scrollTop + dy);
					eventsListEl.scrollTop = newTop;
					const excess = Math.abs(dy) - (scrollTop - newTop);
					if (excess > 0 && collapseOffset > 0) collapseOffset = Math.max(0, collapseOffset - excess);
				} else if (collapseOffset > 0) {
					collapseOffset = Math.max(0, collapseOffset + dy);
				}
			}
		}

		el.addEventListener('touchstart', onTouchStart, { passive: true });
		el.addEventListener('touchmove', onTouchMove, { passive: false });

		return () => {
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
		};
	});

	const MONTH_NAMES = [
		'Январь','Февраль','Март','Апрель','Май','Июнь',
		'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
	];
	const MONTH_NAMES_GEN = [
		'января','февраля','марта','апреля','мая','июня',
		'июля','августа','сентября','октября','ноября','декабря',
	];
	const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
	const DAY_NAMES_FULL = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

	const SOURCE_LABELS: Record<string, string> = {
		cqb: 'CQB Club',
		strikeball: 'Клуб Барс',
		salamander: 'Клуб Ящер',
		bsg: 'BSG',
	};
	const SOURCE_BG: Record<string, string> = {
		cqb: 'bg-eft-gold/20 text-eft-gold',
		strikeball: 'bg-sky-400/20 text-sky-300',
		salamander: 'bg-emerald-400/20 text-emerald-300',
		bsg: 'bg-rose-400/20 text-rose-300',
	};
	const DOT_COLORS: Record<string, string> = {
		cqb: 'bg-eft-gold',
		strikeball: 'bg-sky-400',
		salamander: 'bg-emerald-400',
		bsg: 'bg-rose-400',
	};
	const CARD_BORDER_LEFT: Record<string, string> = {
		cqb: 'border-l-eft-gold',
		strikeball: 'border-l-sky-400',
		salamander: 'border-l-emerald-400',
		bsg: 'border-l-rose-400',
	};

	const filteredPosts = $derived(
		(eventsData?.posts ?? []).filter((p) => sourceFilter === 'all' || p.source === sourceFilter)
	);

	const postsByDate = $derived(
		filteredPosts.reduce<Record<string, VkPost[]>>((acc, p) => {
			if (p.parsedDate) {
				acc[p.parsedDate] = [...(acc[p.parsedDate] ?? []), p];
			}
			return acc;
		}, {})
	);

	const weather = $derived((eventsData?.weather ?? {}) as Record<string, WeatherDay>);

	function dayOfWeekMon(d: Date) {
		return (d.getDay() + 6) % 7;
	}

	function buildCalendarDays(year: number, month: number) {
		const firstDay = new Date(year, month, 1);
		const startOffset = dayOfWeekMon(firstDay);
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const cells: Array<{ date: Date; iso: string; inMonth: boolean }> = [];

		for (let i = startOffset - 1; i >= 0; i--) {
			const d = new Date(year, month, -i);
			cells.push({ date: d, iso: toIso(d), inMonth: false });
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(year, month, d);
			cells.push({ date, iso: toIso(date), inMonth: true });
		}
		while (cells.length < 42) {
			const date = new Date(year, month + 1, cells.length - startOffset - daysInMonth + 1);
			cells.push({ date, iso: toIso(date), inMonth: false });
		}
		return cells;
	}

	const calendarDays = $derived(() => buildCalendarDays(viewYear, viewMonth));

	const upcomingDays = $derived(() => {
		const days: Array<{ iso: string; date: Date; posts: VkPost[]; w: WeatherDay | undefined }> = [];
		const seen = new Set<string>();
		const checkDates = [todayIso];
		for (let i = 1; i <= 30; i++) {
			checkDates.push(toIso(new Date(today.getTime() + i * 86400000)));
		}
		for (const iso of checkDates) {
			if (seen.has(iso)) continue;
			seen.add(iso);
			const posts = postsByDate[iso] ?? [];
			const w = weather[iso];
			if (posts.length > 0 || iso === todayIso) {
				days.push({ iso, date: new Date(iso + 'T12:00:00'), posts, w });
			}
			if (days.length >= 6) break;
		}
		return days;
	});

	const mobileUpcomingDays = $derived(() => {
		const days: Array<{ iso: string; date: Date; posts: VkPost[]; w: WeatherDay | undefined }> = [];
		for (let i = 0; i <= 90; i++) {
			const d = new Date(today.getTime() + i * 86400000);
			const iso = toIso(d);
			const posts = postsByDate[iso] ?? [];
			if (posts.length > 0) {
				days.push({ iso, date: new Date(iso + 'T12:00:00'), posts, w: weather[iso] });
			}
		}
		return days;
	});

	function toIso(d: Date) {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
		selected = null;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
		selected = null;
	}

	function selectPost(posts: VkPost[] | undefined) {
		if (!posts?.length) return;
		if (selected && posts.includes(selected)) {
			const idx = posts.indexOf(selected);
			selected = posts[(idx + 1) % posts.length];
		} else {
			selected = posts[0];
		}
	}

	function openMobileEventDetail(iso: string, startIdx = 0) {
		const posts = postsByDate[iso];
		if (!posts?.length) return;
		mobileEventDetail = { posts, iso, w: weather[iso], activeIdx: startIdx };
	}

	function isToday(iso: string) { return iso === todayIso; }

	function weatherIcon(code: number): string {
		if (code === 0) return '☀️';
		if (code <= 2) return '🌤️';
		if (code === 3) return '☁️';
		if (code <= 48) return '🌫️';
		if (code <= 67) return '🌧️';
		if (code <= 77) return '🌨️';
		if (code <= 82) return '🌦️';
		return '⛈️';
	}

	function formatAgendaDate(iso: string, date: Date): string {
		if (iso === todayIso) return 'Сегодня';
		const tomorrow = new Date(today.getTime() + 86400000);
		if (iso === toIso(tomorrow)) return 'Завтра';
		return DAY_NAMES_FULL[date.getDay()];
	}

	function formatShortDate(date: Date): string {
		return `${date.getDate()} ${MONTH_NAMES_GEN[date.getMonth()]}`;
	}
</script>

<!-- ═══════════════════════════════════════════════════════════
     MOBILE LAYOUT
     ═══════════════════════════════════════════════════════════ -->
<div bind:this={mobileContainerEl} class="flex flex-col h-full min-h-0 overflow-hidden md:hidden">

	<!-- Apple-style compact calendar -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={calendarEl}
		class="shrink-0 border-b border-eft-border bg-eft-bg overflow-hidden"
		style={calendarPx !== null ? `height: ${calendarPx}px;` : undefined}
	>

		<!-- Month nav -->
		<div class="flex items-center justify-between px-5 pt-4 pb-1">
			<button
				onclick={prevMonth}
				class="w-9 h-9 flex items-center justify-center rounded-full text-xl text-eft-muted transition-colors active:bg-eft-elevated"
			>‹</button>
			<span class="text-sm font-bold uppercase tracking-widest text-eft-text">
				{MONTH_NAMES[viewMonth]} {viewYear}
			</span>
			<button
				onclick={nextMonth}
				class="w-9 h-9 flex items-center justify-center rounded-full text-xl text-eft-muted transition-colors active:bg-eft-elevated"
			>›</button>
		</div>

		<!-- Day name headers -->
		<div class="grid grid-cols-7 px-3">
			{#each DAY_NAMES as d, i}
				<div class="py-1.5 text-center text-[10px] font-bold uppercase tracking-wider
					{i >= 5 ? 'text-rose-400/60' : 'text-eft-muted/60'}">{d}</div>
			{/each}
		</div>

		<!-- Calendar grid -->
		<div class="grid grid-cols-7 px-3 pb-3" style="grid-template-rows: repeat(6, 2.625rem)">
			{#each calendarDays() as cell (cell.iso)}
				{@const posts = cell.inMonth && cell.iso >= todayIso ? (postsByDate[cell.iso] ?? []) : []}
				{@const hasPosts = posts.length > 0}
				{@const isSelected = mobileEventDetail?.iso === cell.iso}
				<button
					onclick={() => openMobileEventDetail(cell.iso)}
					disabled={!hasPosts || !cell.inMonth}
					class="flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors
						{!cell.inMonth ? 'opacity-20' : ''}
						{hasPosts ? 'active:bg-eft-elevated' : ''}"
				>
					<span class="w-7 h-7 flex items-center justify-center rounded-full text-sm
						{isToday(cell.iso) ? 'bg-eft-gold text-black font-bold' : 'text-eft-text'}
						{isSelected && !isToday(cell.iso) ? 'ring-1 ring-eft-gold ring-offset-1 ring-offset-eft-bg' : ''}"
					>{cell.date.getDate()}</span>
					<div class="flex items-center gap-px h-1.5">
						{#if hasPosts && cell.inMonth}
							{#each posts.slice(0, 3) as post}
								<span class="w-1.5 h-1.5 rounded-full {DOT_COLORS[post.source] ?? 'bg-eft-gold'}"></span>
							{/each}
						{:else}
							<span class="w-1.5 h-1.5"></span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Events list -->
	<div
		bind:this={eventsListEl}
		class="flex-1 min-h-0 bg-eft-bg {showMobileClubFilter || mobileEventDetail ? 'overflow-hidden' : 'overflow-y-auto'}"
	>

		{#if !data.hasToken}
			<div class="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
				<p class="text-sm text-eft-muted">VK Service Token не настроен.</p>
				<p class="text-xs text-eft-muted/70">Добавь <code class="text-eft-text">VK_SERVICE_TOKEN=...</code> в файл <code class="text-eft-text">.env</code></p>
			</div>

		{:else if !eventsData}
			<!-- Skeleton -->
			<div class="px-4 pt-5 pb-32 space-y-6">
				{#each Array(4) as _}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex gap-2">
								<div class="h-3 w-20 rounded animate-pulse bg-eft-elevated"></div>
								<div class="h-3 w-14 rounded animate-pulse bg-eft-elevated"></div>
							</div>
							<div class="h-3 w-16 rounded animate-pulse bg-eft-elevated"></div>
						</div>
						<div class="rounded-xl border border-eft-border bg-eft-surface p-4 space-y-2.5 animate-pulse">
							<div class="h-4 w-20 rounded bg-eft-elevated"></div>
							<div class="h-4 w-full rounded bg-eft-elevated"></div>
							<div class="h-3 w-3/4 rounded bg-eft-elevated"></div>
						</div>
					</div>
				{/each}
			</div>

		{:else if mobileUpcomingDays().length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
				<span class="text-4xl">📅</span>
				<p class="text-sm text-eft-muted">Предстоящих игр не найдено</p>
				{#if sourceFilter !== 'all'}
					<button
						onclick={() => { sourceFilter = 'all'; }}
						class="text-xs text-eft-gold underline underline-offset-2 mt-1"
					>Показать все клубы</button>
				{/if}
			</div>

		{:else}
			<div class="px-4 pt-4 pb-32 space-y-6">
				{#each mobileUpcomingDays() as day}
					<div>
						<!-- Date section header -->
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-baseline gap-2">
								<span class="text-xs font-bold uppercase tracking-widest
									{day.iso === todayIso ? 'text-eft-gold' : 'text-eft-text'}">
									{formatAgendaDate(day.iso, day.date)}
								</span>
								<span class="text-xs text-eft-muted">{formatShortDate(day.date)}</span>
							</div>
							{#if day.w}
								<div class="flex items-center gap-1.5 shrink-0">
									<span class="text-base leading-none">{weatherIcon(day.w.code)}</span>
									<span class="text-xs text-eft-muted">{day.w.tempMax}°/{day.w.tempMin}°</span>
								</div>
							{/if}
						</div>

						<!-- Event cards -->
						<div class="flex flex-col gap-2.5">
							{#each day.posts as post, postIdx}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									role="button"
									tabindex="0"
									onclick={() => openMobileEventDetail(day.iso, postIdx)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											openMobileEventDetail(day.iso, postIdx);
										}
									}}
									class="w-full cursor-pointer text-left rounded-xl border border-eft-border border-l-4 bg-eft-surface p-4
										transition-colors active:bg-eft-elevated
										{CARD_BORDER_LEFT[post.source] ?? 'border-l-eft-gold'}"
								>
									<div class="flex items-center justify-between mb-2.5">
										<span class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider
											{SOURCE_BG[post.source] ?? 'bg-eft-gold/20 text-eft-gold'}">
											<span class="w-1.5 h-1.5 rounded-full {DOT_COLORS[post.source] ?? 'bg-eft-gold'}"></span>
											{SOURCE_LABELS[post.source] ?? post.source}
										</span>
										<svg class="w-4 h-4 text-eft-muted/40 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
											<path d="M6 4l4 4-4 4"/>
										</svg>
									</div>
									{#if post.title}
										<p class="text-sm font-medium text-eft-text leading-snug line-clamp-2">{post.title}</p>
									{/if}
									{#if post.text && post.text.trim() !== post.title?.trim()}
										<p class="mt-1.5 text-xs text-eft-muted leading-relaxed line-clamp-2">
											{post.text.slice(post.title?.length ?? 0).trim().slice(0, 120)}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     DESKTOP LAYOUT (unchanged)
     ═══════════════════════════════════════════════════════════ -->
<div class="hidden md:flex h-full min-h-0 overflow-hidden">

	<!-- LEFT SIDEBAR -->
	<div class="flex w-72 shrink-0 flex-col border-r border-eft-border overflow-y-auto rounded-none">

		<!-- Month nav -->
		<div class="flex items-center justify-between border-b border-eft-border px-4 py-3">
			<button onclick={prevMonth} class="px-2 py-1 text-lg text-eft-muted transition-colors hover:text-eft-text">‹</button>
			<span class="text-xs font-bold uppercase tracking-widest text-eft-text">
				{MONTH_NAMES[viewMonth]} {viewYear}
			</span>
			<button onclick={nextMonth} class="px-2 py-1 text-lg text-eft-muted transition-colors hover:text-eft-text">›</button>
		</div>

		<!-- Mini calendar -->
		<div class="px-4 py-3 border-b border-eft-border">
			<div class="grid grid-cols-7 mb-1">
				{#each DAY_NAMES as d}
					<div class="py-1 text-center text-xs font-bold uppercase tracking-wider text-eft-muted">{d}</div>
				{/each}
			</div>
			<div class="grid grid-cols-7">
				{#each calendarDays() as cell (cell.iso)}
					{@const hasPosts = !!(postsByDate[cell.iso]?.length)}
					<button
						onclick={() => { if (hasPosts) selectPost(postsByDate[cell.iso]); }}
						class="flex flex-col items-center py-0.5 rounded transition-colors
							{!cell.inMonth ? 'opacity-20' : ''}
							{hasPosts ? 'hover:bg-eft-elevated cursor-pointer' : 'cursor-default'}"
					>
						<span class="text-xs w-6 h-6 flex items-center justify-center rounded-full
							{isToday(cell.iso) ? 'bg-eft-gold text-black font-bold' : 'text-eft-muted'}
							{selected?.parsedDate === cell.iso && !isToday(cell.iso) ? 'ring-1 ring-eft-gold' : ''}"
						>{cell.date.getDate()}</span>
						{#if hasPosts && cell.inMonth}
							<div class="flex gap-px mt-0.5 h-1.5 justify-center">
								{#each (postsByDate[cell.iso] ?? []).slice(0, 3) as post}
									<span class="h-1.5 w-1.5 rounded-full {DOT_COLORS[post.source] ?? 'bg-eft-gold'}"></span>
								{/each}
							</div>
						{:else}
							<div class="h-1.5"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<Separator />

		<!-- Upcoming agenda -->
		<div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
			{#each upcomingDays() as day}
				<div>
					<div class="flex items-baseline justify-between mb-1.5">
						<div class="flex items-baseline gap-2">
							<span class="text-xs font-bold
								{day.iso === todayIso ? 'text-eft-gold' : 'text-eft-text'}">
								{formatAgendaDate(day.iso, day.date)}
							</span>
							<span class="text-xs text-eft-muted">
								{formatShortDate(day.date)}
							</span>
						</div>
						{#if day.w}
							<div class="flex items-center gap-1 text-xs text-eft-muted shrink-0">
								<span>{weatherIcon(day.w.code)}</span>
								<span>{day.w.tempMax}°/{day.w.tempMin}°</span>
							</div>
						{/if}
					</div>

					{#if day.posts.length}
						<div class="flex flex-col gap-1.5">
							{#each day.posts as post}
								<a
									href={post.url}
									target="_blank"
									rel="noopener noreferrer"
									data-sveltekit-preload-data="false"
									class="flex items-start gap-2 group"
								>
									<span class="mt-1 h-2 w-2 shrink-0 rounded-full {DOT_COLORS[post.source] ?? 'bg-eft-gold'}"></span>
									<span class="text-xs leading-snug text-eft-text group-hover:text-eft-gold transition-colors line-clamp-2">
										{post.title ?? SOURCE_LABELS[post.source]}
									</span>
								</a>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-eft-muted/50 italic">Нет событий</p>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Club filters -->
		<div class="border-t border-eft-border px-4 py-3">
			<p class="text-xs uppercase tracking-widest text-eft-muted mb-2">Клубы</p>
			<div class="flex flex-col gap-1">
				{#each ([['all', 'Все клубы', ''] as const, ['cqb', 'CQB Club', 'bg-eft-gold'] as const, ['strikeball', 'Клуб Барс', 'bg-sky-400'] as const, ['salamander', 'Клуб Ящер', 'bg-emerald-400'] as const, ['bsg', 'BSG', 'bg-rose-400'] as const]) as [val, label, dot]}
					<Button
						onclick={() => { sourceFilter = val; selected = null; }}
						variant={sourceFilter === val ? 'active' : 'ghost'}
						class="justify-start gap-2 w-full"
					>
						{#if dot}
							<span class="h-2.5 w-2.5 shrink-0 rounded-full {dot}"></span>
						{:else}
							<span class="h-2.5 w-2.5 shrink-0 rounded-full border border-eft-border"></span>
						{/if}
						{label}
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<!-- MAIN CALENDAR -->
	<div class="flex min-w-0 flex-1 flex-col overflow-hidden p-5 gap-4">

		<!-- Header -->
		<div class="shrink-0 flex items-center justify-between">
			<h2 class="text-xl font-bold uppercase tracking-widest text-eft-text">
				{MONTH_NAMES[viewMonth]} <span class="text-eft-muted font-normal">{viewYear}</span>
			</h2>
			<div class="flex items-center gap-2">
				<Button onclick={() => { viewYear = today.getFullYear(); viewMonth = today.getMonth(); selected = null; }}>Сегодня</Button>
				<div class="flex border border-eft-border">
					<Button onclick={prevMonth} variant="ghost" size="sm">‹</Button>
					<Button onclick={nextMonth} variant="ghost" size="sm">›</Button>
				</div>
			</div>
		</div>

		{#if !data.hasToken}
			<div class="rounded-xl border border-eft-border p-6 text-center">
				<p class="text-sm text-eft-muted">VK Service Token не настроен.</p>
				<p class="mt-2 text-xs text-eft-muted">
					Добавь <code class="text-eft-text">VK_SERVICE_TOKEN=...</code> в файл <code class="text-eft-text">.env</code>
				</p>
			</div>
		{:else if !eventsData}
			<div class="shrink-0 grid grid-cols-7 border border-b-0 border-eft-border">
				{#each ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] as d}
					<div class="py-2 text-center text-xs font-bold uppercase tracking-widest text-eft-muted">{d}</div>
				{/each}
			</div>
			<div class="shrink-0 overflow-hidden rounded-b-xl border border-eft-border grid grid-cols-7 animate-pulse" style="grid-template-rows: repeat(6, minmax(5rem, 1fr))">
				{#each Array(42) as _}
					<div class="border-r border-b border-eft-border bg-eft-bg p-2">
						<div class="h-5 w-5 rounded-full bg-eft-elevated"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col min-h-0 flex-1 overflow-y-auto">
				<div class="grid grid-cols-7 border border-b-0 border-eft-border shrink-0">
					{#each DAY_NAMES as d}
						<div class="py-2 text-center text-xs font-bold uppercase tracking-widest text-eft-muted
							{d === 'Вс' ? 'text-rose-400/70' : ''}">{d}</div>
					{/each}
				</div>

				<div class="shrink-0 overflow-hidden rounded-b-xl border border-eft-border grid grid-cols-7" style="grid-template-rows: repeat(6, minmax(5rem, 1fr))">
					{#each calendarDays() as cell (cell.iso)}
						{@const posts = postsByDate[cell.iso]}
						{@const w = weather[cell.iso]}
						{@const isSelected = !!selected && selected.parsedDate === cell.iso}
						<button
							onclick={() => selectPost(posts)}
							class="relative flex flex-col overflow-hidden border-r border-b border-eft-border bg-eft-bg p-2 text-left transition-colors
								{!cell.inMonth ? 'opacity-30' : ''}
								{posts?.length ? 'cursor-pointer hover:bg-eft-elevated' : 'cursor-default'}
								{isSelected ? 'bg-eft-elevated ring-1 ring-inset ring-eft-gold' : ''}
							"
						>
							<div class="flex items-start justify-between w-full mb-1">
								<span class="text-xs w-6 h-6 flex items-center justify-center rounded-full shrink-0
									{isToday(cell.iso) ? 'bg-eft-gold text-black font-bold' : 'text-eft-muted'}"
								>{cell.date.getDate()}</span>
								{#if w && cell.inMonth}
									<div class="flex items-center gap-1 text-xs text-eft-muted/80 leading-none pt-0.5">
										<span>{weatherIcon(w.code)}</span>
										<span class="text-xs">{w.tempMax}°/{w.tempMin}°</span>
									</div>
								{/if}
							</div>

							{#if posts?.length}
								<div class="flex flex-col gap-0.5 w-full overflow-hidden">
									{#each posts.slice(0, 2) as post}
										<span class="block w-full truncate rounded px-1.5 py-0.5 text-xs leading-snug {SOURCE_BG[post.source] ?? 'bg-eft-gold/20 text-eft-gold'}">
											{post.title ?? SOURCE_LABELS[post.source]}
										</span>
									{/each}
									{#if posts.length > 2}
										<span class="text-xs text-eft-muted pl-1">+{posts.length - 2} ещё</span>
									{/if}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			{#if selected}
				{@const dayPosts = selected.parsedDate ? (postsByDate[selected.parsedDate] ?? []) : []}
				<div class="shrink-0 max-h-64 flex flex-col overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
					<div class="flex shrink-0 border-b border-eft-border">
						{#if dayPosts.length > 1}
							{#each dayPosts as post}
								<button
									onclick={() => selected = post}
									class="px-4 py-2 text-xs uppercase tracking-wider transition-colors
										{selected === post ? 'text-eft-gold border-b-2 border-eft-gold -mb-px bg-eft-elevated' : 'text-eft-muted hover:text-eft-text'}"
								>{SOURCE_LABELS[post.source]}</button>
							{/each}
						{:else}
							<span class="px-4 py-2 text-xs uppercase tracking-wider text-eft-muted">
								{SOURCE_LABELS[selected.source]}
							</span>
						{/if}
						<button
							onclick={() => selected = null}
							class="ml-auto px-4 py-2 text-sm text-eft-muted hover:text-eft-text transition-colors"
						>✕</button>
					</div>

					<a
						href={selected.url}
						target="_blank"
						rel="noopener noreferrer"
						data-sveltekit-preload-data="false"
						class="group flex gap-4 overflow-y-auto p-4 hover:bg-eft-elevated transition-colors"
					>
						<div class="flex flex-col gap-2 flex-1 min-w-0">
							<div class="flex items-center gap-3 flex-wrap">
								{#if selected.gameDate}
									<span class="text-sm text-eft-gold">📅 {selected.gameDate}</span>
								{/if}
								{#if selected.parsedDate && weather[selected.parsedDate]}
									{@const w = weather[selected.parsedDate]}
									<span class="text-sm text-eft-muted">
										{weatherIcon(w.code)} {w.tempMax}°/{w.tempMin}°
									</span>
								{/if}
							</div>
							{#if selected.title}
								<p class="text-sm font-semibold text-eft-text group-hover:text-eft-gold transition-colors">
									{selected.title}
								</p>
							{/if}
							{#if selected.text}
								<p class="text-xs leading-relaxed text-eft-muted whitespace-pre-line">
									{selected.text}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-xs text-eft-muted/40 self-start pt-1">vk.com ↗</span>
					</a>
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     MOBILE: fixed bottom gradient
     ═══════════════════════════════════════════════════════════ -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-60 bg-gradient-to-t from-eft-bg via-eft-bg/80 to-transparent md:hidden"
	aria-hidden="true"
></div>

<!-- ═══════════════════════════════════════════════════════════
     MOBILE: bottom button (Клубы)
     ═══════════════════════════════════════════════════════════ -->
{#if !mobileEventDetail}
	<div class="fixed bottom-12 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 md:hidden">
		<!-- Клубы -->
		<button
			onclick={() => (showMobileClubFilter = !showMobileClubFilter)}
			class="flex items-center gap-3 rounded-full border px-9 py-4 text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-colors
				{showMobileClubFilter
					? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
					: 'border-eft-border bg-eft-surface text-eft-text hover:border-eft-gold'}"
		>
			{#if showMobileClubFilter}
				Готово
			{:else}
				{#if sourceFilter !== 'all'}
					<span class="w-2.5 h-2.5 rounded-full shrink-0 {DOT_COLORS[sourceFilter]}"></span>
				{:else}
					<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
						<rect x="1" y="3" width="14" height="1.5" rx="0.75"/>
						<rect x="3" y="7" width="10" height="1.5" rx="0.75"/>
						<rect x="6" y="11" width="4" height="1.5" rx="0.75"/>
					</svg>
				{/if}
				Клубы
				{#if sourceFilter !== 'all'}
					<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-eft-gold px-1.5 text-[10px] font-bold text-black">1</span>
				{/if}
			{/if}
		</button>

		<!-- Кнопка возврата к календарю — абсолютная, не сдвигает Клубы -->
		{#if collapseOffset > 0}
			<div class="absolute left-full pl-3" transition:fade={{ duration: 200 }}>
				<button
					onclick={snapOpen}
					class="w-14 h-14 flex items-center justify-center rounded-full border border-eft-border bg-eft-surface text-eft-muted shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-colors active:bg-eft-elevated hover:border-eft-gold hover:text-eft-gold"
					aria-label="Показать календарь"
				>
					<svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="4" width="14" height="13" rx="2"/>
						<path d="M3 8h14"/>
						<path d="M7 2v3M13 2v3"/>
						<path d="M7 12h2M11 12h2M7 15h2"/>
					</svg>
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════
     MOBILE: Club filter bottom sheet
     ═══════════════════════════════════════════════════════════ -->
{#if showMobileClubFilter}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={() => (showMobileClubFilter = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-eft-border bg-eft-bg touch-auto"
			transition:fly={{ y: 320, duration: 280, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Drag handle -->
			<div class="flex justify-center pt-2.5 pb-1">
				<div class="h-1 w-10 rounded-full bg-eft-border-hi"></div>
			</div>

			<!-- Header -->
			<div class="flex items-center justify-between px-5 py-3 border-b border-eft-border">
				<span class="w-8" aria-hidden="true"></span>
				<span class="text-sm font-semibold uppercase tracking-widest text-eft-text">Клубы</span>
				<button
					onclick={() => { sourceFilter = 'all'; }}
					disabled={sourceFilter === 'all'}
					aria-label="Сбросить фильтр"
					class="flex h-8 w-8 items-center justify-center rounded-md text-rose-400 transition-all duration-200 hover:bg-rose-400/10 disabled:pointer-events-none
						{sourceFilter !== 'all' ? 'opacity-100' : 'opacity-0'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
						<path d="M3 3v5h5"/>
					</svg>
				</button>
			</div>

			<!-- Club options -->
			<div class="px-4 py-4 space-y-1.5 pb-32">
				{#each ([['all', 'Все клубы', ''] as const, ['cqb', 'CQB Club', 'bg-eft-gold'] as const, ['strikeball', 'Клуб Барс', 'bg-sky-400'] as const, ['salamander', 'Клуб Ящер', 'bg-emerald-400'] as const, ['bsg', 'BSG', 'bg-rose-400'] as const]) as [val, label, dot]}
					<button
						onclick={() => { sourceFilter = val; }}
						class="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors
							{sourceFilter === val ? 'bg-eft-elevated text-eft-text' : 'text-eft-muted hover:bg-eft-elevated hover:text-eft-text'}"
					>
						{#if dot}
							<span class="w-3 h-3 rounded-full shrink-0 {dot}"></span>
						{:else}
							<span class="w-3 h-3 rounded-full border-2 border-eft-border-hi shrink-0"></span>
						{/if}
						<span class="flex-1 text-left">{label}</span>
						{#if sourceFilter === val}
							<svg class="w-4 h-4 text-eft-gold shrink-0" viewBox="0 0 16 16" fill="currentColor">
								<path d="M2.5 8.5l3.5 3.5 7.5-7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════
     MOBILE: Event detail bottom sheet
     ═══════════════════════════════════════════════════════════ -->
{#if mobileEventDetail}
	{@const detail = mobileEventDetail}
	{@const activePost = detail.posts[detail.activeIdx]}
	{@const detailDate = new Date(detail.iso + 'T12:00:00')}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[70] touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={() => (mobileEventDetail = null)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-eft-border bg-eft-bg touch-auto"
			transition:fly={{ y: 320, duration: 280, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Drag handle -->
			<div class="flex justify-center pt-2.5 pb-1 shrink-0">
				<div class="h-1 w-10 rounded-full bg-eft-border-hi"></div>
			</div>

			<!-- Header: date + weather + close -->
			<div class="flex items-center justify-between px-5 py-3 border-b border-eft-border shrink-0">
				<div class="flex flex-col gap-1">
					<div class="flex items-baseline gap-2">
						<span class="text-sm font-bold
							{detail.iso === todayIso ? 'text-eft-gold' : 'text-eft-text'}">
							{formatAgendaDate(detail.iso, detailDate)}
						</span>
						<span class="text-xs text-eft-muted">{formatShortDate(detailDate)}</span>
					</div>
					{#if detail.w}
						<div class="flex items-center gap-1.5">
							<span class="text-base leading-none">{weatherIcon(detail.w.code)}</span>
							<span class="text-xs text-eft-muted">{detail.w.tempMax}° / {detail.w.tempMin}°</span>
						</div>
					{/if}
				</div>
				<button
					onclick={() => (mobileEventDetail = null)}
					class="w-9 h-9 flex items-center justify-center rounded-full text-eft-muted text-lg transition-colors hover:bg-eft-elevated hover:text-eft-text"
				>✕</button>
			</div>

			<!-- Tabs (if multiple events on this day) -->
			{#if detail.posts.length > 1}
				<div class="flex shrink-0 border-b border-eft-border overflow-x-auto">
					{#each detail.posts as post, i}
						<button
							onclick={() => { if (mobileEventDetail) mobileEventDetail.activeIdx = i; }}
							class="flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors
								{detail.activeIdx === i ? 'text-eft-gold border-b-2 border-eft-gold -mb-px bg-eft-elevated' : 'text-eft-muted hover:text-eft-text'}"
						>
							<span class="w-2 h-2 rounded-full {DOT_COLORS[post.source] ?? 'bg-eft-gold'}"></span>
							{SOURCE_LABELS[post.source]}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Scrollable post content -->
			<div class="flex-1 min-h-0 overflow-y-auto">
				<div class="px-5 py-5 space-y-4 pb-8">
					<!-- Club badge -->
					<div>
						<span class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider
							{SOURCE_BG[activePost.source] ?? 'bg-eft-gold/20 text-eft-gold'}">
							<span class="w-2 h-2 rounded-full {DOT_COLORS[activePost.source] ?? 'bg-eft-gold'}"></span>
							{SOURCE_LABELS[activePost.source]}
						</span>
					</div>

					<!-- Title -->
					{#if activePost.title}
						<h3 class="text-base font-semibold text-eft-text leading-snug">{activePost.title}</h3>
					{/if}

					<!-- Extracted game date -->
					{#if activePost.gameDate}
						<div class="flex items-center gap-2 text-sm text-eft-gold">
							<span>📅</span>
							<span>{activePost.gameDate}</span>
						</div>
					{/if}

					<!-- Full post text -->
					{#if activePost.text}
						<p class="text-sm text-eft-muted leading-relaxed whitespace-pre-line">
							{activePost.text}
						</p>
					{/if}
				</div>
			</div>

			<!-- Footer: VK link button -->
			<div class="relative shrink-0">
				<div
					class="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-eft-bg to-transparent"
					aria-hidden="true"
				></div>
				<div class="px-5 pb-10 pt-3 border-t border-eft-border">
					<a
						href={activePost.url}
						target="_blank"
						rel="noopener noreferrer"
						data-sveltekit-preload-data="false"
						class="flex w-full items-center justify-center gap-2.5 rounded-full border border-eft-border bg-eft-elevated py-4 text-sm font-semibold text-eft-text transition-colors hover:border-eft-gold hover:text-eft-gold active:bg-eft-bg"
					>
						Открыть во ВКонтакте
						<svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M7 3H3v10h10v-4M9 3h4v4M13 3L7 9"/>
						</svg>
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}
