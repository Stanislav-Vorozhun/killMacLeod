<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import WeightChips from '$lib/components/balls/WeightChips.svelte';

	type Mode = 'speed-to-joules' | 'joules-to-speed';
	type System = 'aeg' | 'gas';
	type WeaponClass = 'short' | 'rifle' | 'lmg' | 'sniper';

	type CalcSettings = {
		mode: Mode;
		system: System;
		weaponClass: WeaponClass;
		weightG: number;
		speedMs: number;
		speedFps: number;
		joules: number;
		speedUnit: 'ms' | 'fps';
	};

	type ModalSettings = Pick<CalcSettings, 'mode' | 'system' | 'weaponClass'>;

	const WEAPON_CLASSES: { value: WeaponClass; label: string; short: string }[] = [
		{ value: 'short', label: 'Пистолеты / ПП / дробовики / штурмовые (ствол ≤350мм)', short: 'Короткие' },
		{ value: 'rifle', label: 'Штурмовые винтовки (ствол >350мм)', short: 'Штурмовые' },
		{ value: 'lmg', label: 'Пулемёты / марксманки (ДМР)', short: 'Пулемёт / ДМР' },
		{ value: 'sniper', label: 'Снайперские болтовки / полуавтоматические снайперки', short: 'Снайпер' },
	];

	const AEG_LIMITS: Record<WeaponClass, number> = {
		short: 120,
		rifle: 145,
		lmg: 155,
		sniper: 173,
	};

	const GAS_LIMITS: Record<WeaponClass, number> = {
		short: 1.2,
		rifle: 2.1,
		lmg: 2.5,
		sniper: 2.9,
	};

	const MAX_SPEED_MS: Record<System, number> = { aeg: 250, gas: 305 };

	const DEFAULT_SETTINGS: CalcSettings = {
		mode: 'speed-to-joules',
		system: 'aeg',
		weaponClass: 'rifle',
		weightG: 0.20,
		speedMs: 100,
		speedFps: 328,
		joules: 1.5,
		speedUnit: 'ms',
	};

	const DEFAULT_MODAL: ModalSettings = {
		mode: DEFAULT_SETTINGS.mode,
		system: DEFAULT_SETTINGS.system,
		weaponClass: DEFAULT_SETTINGS.weaponClass,
	};

	let applied = $state<CalcSettings>({ ...DEFAULT_SETTINGS });

	let showMobileSettings = $state(false);
	let showLimitsInfo = $state(false);

	let draft = $state<ModalSettings>({ ...DEFAULT_MODAL });

	function syncMsFps(settings: CalcSettings, ms: number) {
		settings.speedMs = ms;
		settings.speedFps = Math.round(ms / 0.3048);
	}

	function syncFpsMs(settings: CalcSettings, fps: number) {
		settings.speedFps = fps;
		settings.speedMs = parseFloat((fps * 0.3048).toFixed(2));
	}

	function applySettings(settings: ModalSettings) {
		applied = { ...applied, ...settings };
	}

	function copyToDraft() {
		draft = {
			mode: applied.mode,
			system: applied.system,
			weaponClass: applied.weaponClass,
		};
	}

	const draftHasChanges = $derived(
		draft.mode !== DEFAULT_MODAL.mode ||
			draft.system !== DEFAULT_MODAL.system ||
			draft.weaponClass !== DEFAULT_MODAL.weaponClass
	);

	const resultJoules = $derived(() => {
		if (applied.mode !== 'speed-to-joules') return null;
		const v = applied.speedUnit === 'ms' ? applied.speedMs : applied.speedFps * 0.3048;
		const m = applied.weightG / 1000;
		if (!v || !m) return null;
		return 0.5 * m * v * v;
	});

	const resultSpeed = $derived(() => {
		if (applied.mode !== 'joules-to-speed') return null;
		const m = applied.weightG / 1000;
		if (!applied.joules || !m) return null;
		const v = Math.sqrt((2 * applied.joules) / m);
		return { ms: v, fps: v / 0.3048 };
	});

	const maxSpeedMs = $derived(MAX_SPEED_MS[applied.system]);
	const maxSpeedFps = $derived(Math.round(maxSpeedMs / 0.3048));

	function limitStatus(value: number, limit: number): 'ok' | 'warn' | 'over' {
		if (value <= limit) return value >= limit * 0.97 ? 'warn' : 'ok';
		return 'over';
	}

	const aegStatus = $derived(() => {
		const limit = AEG_LIMITS[applied.weaponClass];
		const v = applied.speedUnit === 'ms' ? applied.speedMs : applied.speedFps * 0.3048;
		const m = applied.weightG / 1000;
		if (!v || !m) return null;
		const j = 0.5 * m * v * v;
		const v020 = Math.sqrt((2 * j) / 0.0002);
		return { status: limitStatus(v020, limit), limit, value: v020 };
	});

	const gasStatus = $derived(() => {
		if (applied.mode === 'speed-to-joules') {
			const j = resultJoules();
			if (j === null) return null;
			const limit = GAS_LIMITS[applied.weaponClass];
			return { status: limitStatus(j, limit), limit, value: j };
		}
		const limit = GAS_LIMITS[applied.weaponClass];
		if (!applied.joules) return null;
		return { status: limitStatus(applied.joules, limit), limit, value: applied.joules };
	});

	const STATUS_COLOR: Record<string, string> = {
		ok: 'text-emerald-400',
		warn: 'text-yellow-400',
		over: 'text-rose-400',
	};
	const STATUS_BG: Record<string, string> = {
		ok: 'border-emerald-400/50 bg-emerald-400/5',
		warn: 'border-yellow-400/50 bg-yellow-400/5',
		over: 'border-rose-400/50 bg-rose-400/5',
	};
	const STATUS_LABEL: Record<string, string> = {
		ok: 'В норме',
		warn: 'На пределе',
		over: 'Превышение',
	};

	function fmt(n: number, d = 2) {
		return n.toFixed(d);
	}

	function resultColor(j: number): string {
		const v020 = Math.sqrt((2 * j) / 0.0002);
		if (v020 <= 120) return 'text-emerald-400';
		if (v020 <= 145) return 'text-yellow-400';
		return 'text-rose-400';
	}

	function resultZone(j: number): { label: string; sub: string; color: string } {
		const v020 = Math.sqrt((2 * j) / 0.0002);
		if (v020 <= 120) return { label: 'CQB', sub: 'помещения', color: 'text-emerald-400 border-emerald-400/40' };
		if (v020 <= 145) return { label: 'от 15 м', sub: 'открытые площадки', color: 'text-yellow-400 border-yellow-400/40' };
		return { label: 'от 20 м', sub: 'снайпер / дальняя зона', color: 'text-rose-400 border-rose-400/40' };
	}

	function closeMobileSettings() {
		showMobileSettings = false;
	}

	function closeLimitsInfo() {
		showLimitsInfo = false;
	}

	function openMobileSettings() {
		showLimitsInfo = false;
		copyToDraft();
		showMobileSettings = true;
	}

	function openLimitsInfo() {
		showMobileSettings = false;
		showLimitsInfo = true;
	}

	function applyMobileSettings() {
		applySettings(draft);
		closeMobileSettings();
	}

	function resetDraft() {
		draft = { ...DEFAULT_MODAL };
	}
</script>

{#snippet calcControls(s: ModalSettings, onchange: () => void)}
	<div class="mb-4 flex flex-col gap-3 sm:flex-row">
		<div class="flex overflow-hidden rounded-md border border-eft-border">
			{#each ([['aeg', 'AEG'], ['gas', 'Газ / ВВД']] as const) as [val, label]}
				<button
					onclick={() => { s.system = val; onchange(); }}
					class="flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors
						{s.system === val ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
				>{label}</button>
			{/each}
		</div>
		<div class="flex overflow-hidden rounded-md border border-eft-border">
			{#each ([['speed-to-joules', 'Скорость → Дж'], ['joules-to-speed', 'Дж → Скорость']] as const) as [val, label]}
				<button
					onclick={() => { s.mode = val; onchange(); }}
					class="flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors
						{s.mode === val ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
				>{label}</button>
			{/each}
		</div>
	</div>

	<div class="mb-5">
		<p class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Класс оружия</p>
		<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
			{#each WEAPON_CLASSES as wc}
				<button
					onclick={() => { s.weaponClass = wc.value; onchange(); }}
					class="rounded-md border px-2 py-1.5 text-[11px] leading-tight transition-colors
						{s.weaponClass === wc.value
							? 'border-eft-gold bg-eft-gold-dim text-eft-gold'
							: 'border-eft-border text-eft-muted hover:border-eft-border-hi hover:text-eft-text'}"
				>{wc.short}</button>
			{/each}
		</div>
		<p class="mt-1.5 min-h-[2.5rem] text-[10px] leading-snug text-eft-muted">
			{WEAPON_CLASSES.find((w) => w.value === s.weaponClass)?.label ?? '\u00a0'}
		</p>
	</div>
{/snippet}

{#snippet calcParameters(s: CalcSettings, onchange: () => void)}
	<div class="flex flex-col gap-2 rounded-xl border border-eft-border bg-eft-surface p-6">
		<p class="text-[10px] font-bold uppercase tracking-widest text-eft-muted">Параметры</p>

		<div>
			<p class="mb-1.5 text-xs text-eft-muted">Вес шара</p>
			<WeightChips value={s.weightG} onchange={(w) => { s.weightG = w; onchange(); }} />
			<p class="mt-1.5 min-h-[2rem] text-[10px] leading-snug text-eft-muted/60">
				{s.system === 'aeg' ? 'Проверка лимита AEG — по правилам замер шаром 0.20 г' : '\u00a0'}
			</p>
		</div>

		{#if s.mode === 'speed-to-joules'}
			<div>
				<div class="mb-1.5 flex items-center justify-between">
					<label class="text-xs text-eft-muted">Скорость вылета</label>
					<div class="flex overflow-hidden rounded-md border border-eft-border">
						{#each ([['ms', 'м/с'], ['fps', 'fps']] as const) as [u, ul]}
							<button
								onclick={() => { s.speedUnit = u; onchange(); }}
								class="px-2 py-0.5 text-[10px] transition-colors
									{s.speedUnit === u ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
							>{ul}</button>
						{/each}
					</div>
				</div>
				{#if s.speedUnit === 'ms'}
					<div class="flex items-center gap-2">
						<input
							type="number"
							step="1"
							min="0"
							value={s.speedMs}
							oninput={(e) => { syncMsFps(s, +(e.target as HTMLInputElement).value); onchange(); }}
							class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
						/>
						<span class="text-xs text-eft-muted">м/с</span>
						<span class="text-xs text-eft-muted/50">= {s.speedFps} fps</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<input
							type="number"
							step="1"
							min="0"
							value={s.speedFps}
							oninput={(e) => { syncFpsMs(s, +(e.target as HTMLInputElement).value); onchange(); }}
							class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
						/>
						<span class="text-xs text-eft-muted">fps</span>
						<span class="text-xs text-eft-muted/50">= {s.speedMs} м/с</span>
					</div>
				{/if}
			</div>
		{:else}
			<div>
				<label class="mb-1.5 block text-xs text-eft-muted">Энергия</label>
				<div class="flex items-center gap-2">
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={s.joules}
						onchange={onchange}
						class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
					/>
					<span class="text-xs text-eft-muted">Дж</span>
				</div>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each Object.values(GAS_LIMITS) as lim}
						<button
							onclick={() => { s.joules = lim; onchange(); }}
							class="rounded border border-eft-border px-2 py-0.5 text-[10px] text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text"
						>{lim} Дж</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet resultPanel(large = false)}
	{#if applied.mode === 'speed-to-joules' && resultJoules() !== null}
		{@const j = resultJoules()!}
		{@const st = applied.system === 'aeg' ? aegStatus() : gasStatus()}
		{@const v020 = Math.sqrt((2 * j) / 0.0002)}
		{@const zone = resultZone(j)}
		<div class="flex items-start gap-4">
			<span class="font-bold tabular-nums {resultColor(j)} {large ? 'text-4xl' : 'text-3xl'}">
				{fmt(j)} <span class={large ? 'text-xl' : 'text-base'}>Дж</span>
			</span>
			<div class="mt-1 flex flex-col items-start border-l-2 pl-3 {zone.color}">
				<span class="text-sm font-bold {large ? 'text-base min-[390px]:text-[20px]' : ''}">{zone.label}</span>
				<span class="text-[10px] opacity-70 {large ? 'min-[390px]:text-[13px]' : ''}">{zone.sub}</span>
			</div>
		</div>
		<p class="min-h-5 text-xs leading-5 text-eft-muted">
			{#if applied.weightG !== 0.20}
				≈ <span class="text-eft-text">{fmt(v020, 1)} м/с</span> ·
				<span class="text-eft-text">{Math.round(v020 / 0.3048)} fps</span> при пересчёте на 0.20 г
			{:else}
				{'\u00a0'}
			{/if}
		</p>
		{#if st}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div onclick={openLimitsInfo} class="relative cursor-pointer rounded-lg border px-3 py-3 transition-opacity active:opacity-70 md:cursor-default {STATUS_BG[st.status]}">
				<p class="text-sm font-bold {STATUS_COLOR[st.status]}">{STATUS_LABEL[st.status]}</p>
				<p class="mt-0.5 text-xs text-eft-muted pr-7">
					{applied.system === 'aeg'
						? `${fmt(st.value, 1)} м/с (на 0.20 г) из ${st.limit} м/с`
						: `${fmt(j)} Дж из ${st.limit} Дж`}
				</p>
				<span class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center text-current opacity-40 md:hidden" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
					</svg>
				</span>
			</div>
		{/if}
	{:else if applied.mode === 'joules-to-speed' && resultSpeed() !== null}
		{@const r = resultSpeed()!}
		{@const st = gasStatus()}
		{@const c = resultColor(applied.joules)}
		{@const zone = resultZone(applied.joules)}
		<div class="flex items-start gap-4">
			<div class="flex flex-col gap-1">
				<span class="font-bold tabular-nums {c} {large ? 'text-4xl' : 'text-3xl'}">
					{fmt(r.ms)} <span class={large ? 'text-xl' : 'text-base'}>м/с</span>
				</span>
				<span class="font-bold tabular-nums {c} opacity-70 {large ? 'text-xl' : 'text-lg'}">
					{fmt(r.fps)} <span class={large ? 'text-sm' : 'text-xs'}>fps</span>
				</span>
			</div>
			<div class="mt-1 flex flex-col items-start border-l-2 pl-3 {zone.color}">
				<span class="text-sm font-bold {large ? 'text-base min-[390px]:text-[20px]' : ''}">{zone.label}</span>
				<span class="text-[10px] opacity-70 {large ? 'min-[390px]:text-[13px]' : ''}">{zone.sub}</span>
			</div>
		</div>
		{#if st}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div onclick={openLimitsInfo} class="relative cursor-pointer rounded-lg border px-3 py-3 transition-opacity active:opacity-70 md:cursor-default {STATUS_BG[st.status]}">
				<p class="text-sm font-bold {STATUS_COLOR[st.status]}">{STATUS_LABEL[st.status]}</p>
				<p class="mt-0.5 text-xs text-eft-muted pr-7">{fmt(applied.joules)} Дж из {st.limit} Дж</p>
				<span class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center text-current opacity-40 md:hidden" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
					</svg>
				</span>
			</div>
		{/if}
	{:else}
		<div class="flex flex-1 items-center justify-center py-8 text-xs text-eft-muted">Введи параметры</div>
	{/if}
{/snippet}

{#snippet limitsTable(activeSystem: System, highlight: WeaponClass)}
	<div class="overflow-hidden rounded-xl border border-eft-border">
		<p class="border-b border-eft-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">
			Лимиты · {activeSystem === 'aeg' ? 'AEG (0.20 г, хоп 0)' : 'Газ / ВВД (рабочий шар, хоп макс.)'}
		</p>
		<table class="w-full text-xs">
			<thead>
				<tr class="border-b border-eft-border text-eft-muted">
					<th class="px-4 py-2 text-left font-normal">Класс</th>
					<th class="px-4 py-2 text-right font-normal">{activeSystem === 'aeg' ? 'м/с' : 'Дж'}</th>
					{#if activeSystem === 'aeg'}
						<th class="px-4 py-2 text-right font-normal">fps</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each WEAPON_CLASSES as wc}
					{@const limit = activeSystem === 'aeg' ? AEG_LIMITS[wc.value] : GAS_LIMITS[wc.value]}
					<tr
						class="border-b border-eft-border/50 last:border-0
							{highlight === wc.value ? 'bg-eft-elevated' : 'hover:bg-eft-elevated/50'}"
					>
						<td class="px-4 py-2 text-eft-muted">{wc.short}</td>
						<td class="px-4 py-2 text-right font-bold text-eft-text">{limit}</td>
						{#if activeSystem === 'aeg'}
							<td class="px-4 py-2 text-right text-eft-muted">{Math.round(limit / 0.3048)}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<div class="h-full overflow-hidden md:overflow-y-auto">
	<!-- Mobile -->
	<div
		class="flex h-full flex-col overflow-hidden md:hidden
			{showMobileSettings || showLimitsInfo ? 'max-md:overflow-hidden max-md:overscroll-none' : ''}"
	>
		<h2 class="shrink-0 px-3 pt-[15px] pb-0 text-center text-sm font-bold uppercase tracking-widest">Калькулятор мощности</h2>

		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="flex min-h-full flex-col items-center justify-center gap-4 max-[389px]:gap-[14px] px-3 py-4 max-[389px]:py-[14px] pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
				<div class="flex w-full max-w-sm flex-col gap-3 max-[389px]:gap-[10px] rounded-xl border border-eft-border bg-eft-surface p-6 max-[389px]:p-4">
					<p class="text-[10px] font-bold uppercase tracking-widest text-eft-muted">Результат</p>
					{@render resultPanel(true)}
				</div>

				<!-- Большой инпут скорости / джоулей -->
				<div class="w-full max-w-sm overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
					{#if applied.mode === 'speed-to-joules'}
						<div class="flex">
							<input
								type="number"
								inputmode="numeric"
								step="1"
								min="0"
								max={applied.speedUnit === 'ms' ? maxSpeedMs : maxSpeedFps}
								value={applied.speedUnit === 'ms' ? applied.speedMs : applied.speedFps}
								onkeydown={(e) => { if (['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
								oninput={(e) => {
									const el = e.target as HTMLInputElement;
									let v = el.valueAsNumber;
									if (isNaN(v) || v < 0) v = 0;
									const max = applied.speedUnit === 'ms' ? maxSpeedMs : maxSpeedFps;
									if (v > max) { v = max; el.value = String(max); }
									if (applied.speedUnit === 'ms') syncMsFps(applied, v);
									else syncFpsMs(applied, v);
								}}
								placeholder="0"
								class="min-w-0 flex-1 bg-transparent py-4 max-[389px]:py-3 text-center text-3xl font-bold tabular-nums text-eft-text outline-none placeholder:text-eft-muted/30"
							/>
							<div class="flex flex-col divide-y divide-eft-border border-l border-eft-border">
								{#each ([['ms', 'м/с'], ['fps', 'fps']] as const) as [u, ul]}
									<button
										onclick={() => { applied.speedUnit = u; }}
										class="flex flex-1 items-center justify-center px-5 text-xs font-bold uppercase tracking-widest transition-colors
											{applied.speedUnit === u ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted active:text-eft-text'}"
									>{ul}</button>
								{/each}
							</div>
						</div>
						{#if (applied.speedUnit === 'ms' && applied.speedMs) || (applied.speedUnit === 'fps' && applied.speedFps)}
							<p class="border-t border-eft-border px-4 py-2 text-center text-xs text-eft-muted/50">
								{applied.speedUnit === 'ms' ? `= ${applied.speedFps} fps` : `= ${applied.speedMs} м/с`}
							</p>
						{/if}
					{:else}
						<div class="flex">
							<input
								type="number"
								inputmode="decimal"
								step="0.01"
								min="0"
								bind:value={applied.joules}
								onkeydown={(e) => { if (['e','E','+','-'].includes(e.key)) e.preventDefault(); }}
								placeholder="0.00"
								class="min-w-0 flex-1 bg-transparent py-4 max-[389px]:py-3 text-center text-3xl font-bold tabular-nums text-eft-text outline-none placeholder:text-eft-muted/30"
							/>
							<div class="flex items-center justify-center border-l border-eft-border px-5">
								<span class="text-sm font-bold uppercase tracking-widest text-eft-muted">Дж</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Чипсы применённых параметров -->
				<div class="flex w-full max-w-sm flex-wrap justify-center gap-1.5 mb-[20px]">
					<span class="inline-flex items-center rounded-full border border-eft-border bg-eft-elevated px-2.5 py-1 text-[11px] font-medium text-eft-muted">
						{applied.weightG} г
					</span>
					<span class="inline-flex items-center rounded-full border border-eft-border bg-eft-elevated px-2.5 py-1 text-[11px] font-medium text-eft-muted">
						{applied.system === 'aeg' ? 'AEG' : 'Газ / ВВД'}
					</span>
					<span class="inline-flex items-center rounded-full border border-eft-border bg-eft-elevated px-2.5 py-1 text-[11px] font-medium text-eft-muted">
						{applied.mode === 'speed-to-joules' ? 'Скорость → Дж' : 'Дж → Скорость'}
					</span>
					<span class="inline-flex items-center rounded-full border border-eft-border bg-eft-elevated px-2.5 py-1 text-[11px] font-medium text-eft-muted">
						{WEAPON_CLASSES.find(w => w.value === applied.weaponClass)?.short}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Desktop -->
	<div class="mx-auto hidden max-w-2xl p-5 md:block">
		<div class="mb-6">
			<h2 class="text-sm font-bold uppercase tracking-widest">Калькулятор мощности</h2>
		</div>

		{@render calcControls(applied, () => {})}

		<div class="grid gap-4 sm:grid-cols-2">
			{@render calcParameters(applied, () => {})}
			<div class="flex flex-col gap-4 rounded-xl border border-eft-border bg-eft-surface p-6">
				<p class="text-[10px] font-bold uppercase tracking-widest text-eft-muted">Результат</p>
				{@render resultPanel()}
			</div>
		</div>

		<div class="mt-5">
			{@render limitsTable(applied.system, applied.weaponClass)}
		</div>
	</div>
</div>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-eft-bg via-eft-bg/60 to-transparent md:hidden"
	aria-hidden="true"
></div>

<button
	onclick={() => (showMobileSettings ? applyMobileSettings() : openMobileSettings())}
	class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border px-10 py-4 text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-colors md:hidden
		{showMobileSettings
			? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
			: 'border-eft-border bg-eft-surface text-eft-text hover:border-eft-gold'}"
>
	{#if showMobileSettings}
		Применить
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
			<circle cx="12" cy="12" r="3"/>
		</svg>
		Параметры
	{/if}
</button>

{#if showMobileSettings}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-[55] h-28 bg-gradient-to-t from-eft-bg via-eft-bg/90 via-35% to-transparent md:hidden"
		aria-hidden="true"
	></div>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={closeMobileSettings}
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
				<span class="text-sm font-semibold uppercase tracking-widest text-eft-text">Параметры</span>
				<button
					type="button"
					onclick={resetDraft}
					disabled={!draftHasChanges}
					aria-label="Сбросить параметры"
					aria-hidden={!draftHasChanges}
					tabindex={draftHasChanges ? 0 : -1}
					class="flex h-8 w-8 items-center justify-center rounded-md text-rose-400 transition-all duration-200 hover:bg-rose-400/10 hover:text-rose-300 disabled:pointer-events-none
						{draftHasChanges ? 'opacity-100' : 'opacity-0'}"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
						<path d="M3 3v5h5"/>
					</svg>
				</button>
			</div>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<div class="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5">
					<div>
						<p class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Вес шара</p>
						<WeightChips value={applied.weightG} onchange={(w) => { applied.weightG = w; }} />
						{#if applied.system === 'aeg'}
							<p class="mt-1.5 text-[10px] leading-snug text-eft-muted/60">Проверка лимита AEG — по правилам замер шаром 0.20 г</p>
						{/if}
					</div>
					<div class="border-t border-eft-border"></div>
					{@render calcControls(draft, () => {})}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showLimitsInfo}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-[55] h-28 bg-gradient-to-t from-eft-bg via-eft-bg/90 via-35% to-transparent md:hidden"
		aria-hidden="true"
	></div>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 touch-none overscroll-none bg-black/60 md:hidden"
		transition:fade={{ duration: 200 }}
		onclick={closeLimitsInfo}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="absolute inset-x-0 bottom-0 flex max-h-[85vh] min-h-[50vh] touch-auto flex-col rounded-t-2xl border-t border-eft-border bg-eft-bg"
			transition:fly={{ y: 320, duration: 280, easing: (t) => 1 - Math.pow(1 - t, 3) }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex shrink-0 justify-center pt-2 pb-1">
				<div class="h-1 w-10 rounded-full bg-eft-border-hi"></div>
			</div>
			<div class="flex shrink-0 items-center justify-center border-b border-eft-border px-4 py-3">
				<span class="text-sm font-semibold uppercase tracking-widest text-eft-text">Лимиты</span>
			</div>
			<div class="flex-1 overflow-y-auto p-4 pb-28">
				{@render limitsTable(applied.system, applied.weaponClass)}
			</div>
		</div>
	</div>
{/if}
