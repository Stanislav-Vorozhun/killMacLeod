<script lang="ts">
	import type { PageData } from './$types';
	import type { VkPost, WeatherDay } from './+page.server';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data }: { data: PageData } = $props();

	const today = new Date();
	const todayIso = toIso(today);

	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth());
	let selected = $state<VkPost | null>(null);
	let sourceFilter = $state<'all' | 'cqb' | 'strikeball' | 'salamander' | 'bsg'>('all');

	const MONTH_NAMES = [
		'Январь','Февраль','Март','Апрель','Май','Июнь',
		'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
	];
	const MONTH_NAMES_GEN = [
		'января','февраля','марта','апреля','мая','июня',
		'июля','августа','сентября','октября','ноября','декабря',
	];
	// Mon → Sun (европейский стандарт)
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

	const filteredPosts = $derived(
		(data.posts as VkPost[]).filter((p) => sourceFilter === 'all' || p.source === sourceFilter)
	);

	const postsByDate = $derived(
		filteredPosts.reduce<Record<string, VkPost[]>>((acc, p) => {
			if (p.parsedDate) {
				acc[p.parsedDate] = [...(acc[p.parsedDate] ?? []), p];
			}
			return acc;
		}, {})
	);

	const weather = $derived(data.weather as Record<string, WeatherDay>);

	// Пн=0 … Вс=6
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
		// Всегда 42 ячейки (6 строк) — стабильная высота
		while (cells.length < 42) {
			const date = new Date(year, month + 1, cells.length - startOffset - daysInMonth + 1);
			cells.push({ date, iso: toIso(date), inMonth: false });
		}
		return cells;
	}

	const calendarDays = $derived(() => buildCalendarDays(viewYear, viewMonth));

	// Ближайшие дни для сайдбара
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

	function isToday(iso: string) { return iso === todayIso; }

	function truncate(text: string, max = 400) {
		return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
	}

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
</script>

<div class="flex h-full min-h-0 overflow-hidden">

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
								{day.date.getDate()} {MONTH_NAMES_GEN[day.date.getMonth()]}
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
	<div class="flex min-w-0 flex-1 flex-col overflow-y-scroll p-5">

		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
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
		{:else}
			<!-- Day headers -->
			<div class="grid grid-cols-7 border border-b-0 border-eft-border">
				{#each DAY_NAMES as d}
					<div class="py-2 text-center text-xs font-bold uppercase tracking-widest text-eft-muted
						{d === 'Вс' ? 'text-rose-400/70' : ''}">{d}</div>
				{/each}
			</div>

			<!-- Calendar grid — фиксированная высота строк -->
			<div class="overflow-hidden rounded-xl border border-eft-border grid grid-cols-7" style="grid-template-rows: repeat(6, 7rem)">
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
						<!-- Date + weather row -->
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

						<!-- Event pills -->
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

			<!-- Selected event detail -->
			{#if selected}
				{@const dayPosts = selected.parsedDate ? (postsByDate[selected.parsedDate] ?? []) : []}
				<div class="mt-4 overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
					{#if dayPosts.length > 1}
						<div class="flex border-b border-eft-border">
							{#each dayPosts as post}
								<button
									onclick={() => selected = post}
									class="px-4 py-2 text-xs uppercase tracking-wider transition-colors
										{selected === post ? 'text-eft-gold border-b-2 border-eft-gold -mb-px bg-eft-elevated' : 'text-eft-muted hover:text-eft-text'}"
								>{SOURCE_LABELS[post.source]}</button>
							{/each}
							<button
								onclick={() => selected = null}
								class="ml-auto px-4 py-2 text-sm text-eft-muted hover:text-eft-text transition-colors"
							>✕</button>
						</div>
					{/if}

					<a
						href={selected.url}
						target="_blank"
						rel="noopener noreferrer"
						class="group flex gap-4 p-4 hover:bg-eft-elevated transition-colors"
					>
						<div class="flex flex-col gap-2 flex-1 min-w-0">
							<div class="flex items-center gap-3 flex-wrap">
								<span class="text-xs font-bold uppercase tracking-wider text-eft-muted">
									{SOURCE_LABELS[selected.source]}
								</span>
								{#if selected.gameDate}
									<span class="text-sm text-eft-gold">📅 {selected.gameDate}</span>
								{/if}
								{#if selected.parsedDate && weather[selected.parsedDate]}
									{@const w = weather[selected.parsedDate]}
									<span class="text-sm text-eft-muted">
										{weatherIcon(w.code)} {w.tempMax}°/{w.tempMin}°
									</span>
								{/if}
								{#if dayPosts.length <= 1}
									<button
										onclick={(e) => { e.preventDefault(); selected = null; }}
										class="ml-auto text-sm text-eft-muted hover:text-eft-text transition-colors"
									>✕</button>
								{/if}
							</div>
							{#if selected.title}
								<p class="text-sm font-semibold text-eft-text group-hover:text-eft-gold transition-colors">
									{selected.title}
								</p>
							{/if}
							{#if selected.text}
								<p class="text-xs leading-relaxed text-eft-muted whitespace-pre-line">
									{truncate(selected.text)}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-xs text-eft-muted/40 self-end">vk.com ↗</span>
					</a>
				</div>
			{/if}
		{/if}
	</div>
</div>

