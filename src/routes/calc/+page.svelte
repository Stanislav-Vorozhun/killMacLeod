<script lang="ts">
	// E = 0.5 * m * v²
	type Mode = 'speed-to-joules' | 'joules-to-speed';
	type System = 'aeg' | 'gas';
	type WeaponClass = 'short' | 'rifle' | 'lmg' | 'sniper';

	const WEIGHTS = [0.20, 0.23, 0.25, 0.28, 0.30, 0.32, 0.36, 0.40];

	const WEAPON_CLASSES: { value: WeaponClass; label: string; short: string }[] = [
		{ value: 'short',  label: 'Пистолеты / ПП / дробовики / штурмовые (ствол ≤350мм)', short: 'Короткие' },
		{ value: 'rifle',  label: 'Штурмовые винтовки (ствол >350мм)',                       short: 'Штурмовые' },
		{ value: 'lmg',    label: 'Пулемёты / марксманки (ДМР)',                              short: 'Пулемёт / ДМР' },
		{ value: 'sniper', label: 'Снайперские болтовки / полуавтоматические снайперки',      short: 'Снайпер' },
	];

	// AEG limits in m/s (measured with 0.2g)
	const AEG_LIMITS: Record<WeaponClass, number> = {
		short:  120,
		rifle:  145,
		lmg:    155,
		sniper: 173,
	};

	// Gas/HPA limits in Joules
	const GAS_LIMITS: Record<WeaponClass, number> = {
		short:  1.2,
		rifle:  2.1,
		lmg:    2.5,
		sniper: 2.9,
	};

	let mode       = $state<Mode>('speed-to-joules');
	let system     = $state<System>('aeg');
	let weaponClass = $state<WeaponClass>('rifle');
	let weightG    = $state<number>(0.20);
	let speedMs    = $state<number>(100);
	let speedFps   = $state<number>(328);
	let joules     = $state<number>(1.5);
	let speedUnit  = $state<'ms' | 'fps'>('ms');

	function onMsInput(v: number) {
		speedMs = v;
		speedFps = Math.round(v / 0.3048);
	}
	function onFpsInput(v: number) {
		speedFps = v;
		speedMs = parseFloat((v * 0.3048).toFixed(2));
	}

	const resultJoules = $derived(() => {
		if (mode !== 'speed-to-joules') return null;
		const v = speedUnit === 'ms' ? speedMs : speedFps * 0.3048;
		const m = weightG / 1000;
		if (!v || !m) return null;
		return 0.5 * m * v * v;
	});

	const resultSpeed = $derived(() => {
		if (mode !== 'joules-to-speed') return null;
		const m = weightG / 1000;
		if (!joules || !m) return null;
		const v = Math.sqrt((2 * joules) / m);
		return { ms: v, fps: v / 0.3048 };
	});

	// Color: green = OK, gold = within 3%, red = exceeded
	function limitStatus(value: number, limit: number): 'ok' | 'warn' | 'over' {
		if (value <= limit) return value >= limit * 0.97 ? 'warn' : 'ok';
		return 'over';
	}

	const aegStatus = $derived(() => {
		const limit = AEG_LIMITS[weaponClass];
		const v = speedUnit === 'ms' ? speedMs : speedFps * 0.3048;
		const m = weightG / 1000;
		if (!v || !m) return null;
		// AEG limits are defined for 0.20g — convert via joules
		const j = 0.5 * m * v * v;
		const v020 = Math.sqrt((2 * j) / 0.0002);
		return { status: limitStatus(v020, limit), limit, value: v020 };
	});

	const gasStatus = $derived(() => {
		if (mode === 'speed-to-joules') {
			const j = resultJoules();
			if (j === null) return null;
			const limit = GAS_LIMITS[weaponClass];
			return { status: limitStatus(j, limit), limit, value: j };
		} else {
			const limit = GAS_LIMITS[weaponClass];
			if (!joules) return null;
			return { status: limitStatus(joules, limit), limit, value: joules };
		}
	});

	const STATUS_COLOR: Record<string, string> = {
		ok:   'text-emerald-400',
		warn: 'text-yellow-400',
		over: 'text-rose-400',
	};
	const STATUS_BG: Record<string, string> = {
		ok:   'border-emerald-400/50 bg-emerald-400/5',
		warn: 'border-yellow-400/50 bg-yellow-400/5',
		over: 'border-rose-400/50 bg-rose-400/5',
	};
	const STATUS_LABEL: Record<string, string> = {
		ok:   'В норме',
		warn: 'На пределе',
		over: 'Превышение',
	};

	function fmt(n: number, d = 2) { return n.toFixed(d); }

	function resultColor(joules: number): string {
		const v020 = Math.sqrt((2 * joules) / 0.0002);
		if (v020 <= 120) return 'text-emerald-400';
		if (v020 <= 145) return 'text-yellow-400';
		return 'text-rose-400';
	}

	function resultZone(joules: number): { label: string; sub: string; color: string } {
		const v020 = Math.sqrt((2 * joules) / 0.0002);
		if (v020 <= 120) return { label: 'CQB', sub: 'помещения', color: 'text-emerald-400 border-emerald-400/40' };
		if (v020 <= 145) return { label: 'от 15 м', sub: 'открытые площадки', color: 'text-yellow-400 border-yellow-400/40' };
		return { label: 'от 20 м', sub: 'снайпер / дальняя зона', color: 'text-rose-400 border-rose-400/40' };
	}
</script>

<div class="h-full overflow-y-auto">
<div class="mx-auto max-w-2xl p-5">
	<div class="mb-6">
		<h2 class="text-sm font-bold uppercase tracking-widest">Калькулятор мощности</h2>
		<p class="mt-0.5 text-xs text-eft-muted">E = ½ · m · v²</p>
	</div>

	<!-- System + mode -->
	<div class="mb-4 flex flex-col gap-3 sm:flex-row">
		<div class="flex overflow-hidden rounded-md border border-eft-border">
			{#each ([['aeg', 'AEG'], ['gas', 'Газ / ВВД']] as const) as [val, label]}
				<button onclick={() => (system = val)}
					class="flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors
						{system === val ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
				>{label}</button>
			{/each}
		</div>
		<div class="flex overflow-hidden rounded-md border border-eft-border">
			{#each ([['speed-to-joules', 'Скорость → Дж'], ['joules-to-speed', 'Дж → Скорость']] as const) as [val, label]}
				<button onclick={() => (mode = val)}
					class="flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors
						{mode === val ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Weapon class -->
	<div class="mb-5">
		<p class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Класс оружия</p>
		<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
			{#each WEAPON_CLASSES as wc}
				<button onclick={() => (weaponClass = wc.value)}
					class="rounded-md border px-2 py-1.5 text-[11px] leading-tight transition-colors
						{weaponClass === wc.value
							? 'border-eft-gold bg-eft-gold-dim text-eft-gold'
							: 'border-eft-border text-eft-muted hover:border-eft-border-hi hover:text-eft-text'}"
				>{wc.short}</button>
			{/each}
		</div>
		<p class="mt-1.5 text-[10px] text-eft-muted">{WEAPON_CLASSES.find(w => w.value === weaponClass)?.label}</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Inputs -->
		<div class="flex flex-col gap-4 rounded-xl border border-eft-border bg-eft-surface p-4">
			<p class="text-[10px] font-bold uppercase tracking-widest text-eft-muted">Параметры</p>

			<div>
				<label class="mb-1.5 block text-xs text-eft-muted">Вес шара</label>
				<div class="flex flex-wrap gap-1">
					{#each WEIGHTS as w}
						<button onclick={() => (weightG = w)}
							class="rounded border px-2 py-0.5 text-xs transition-colors
								{weightG === w
									? 'border-eft-gold bg-eft-gold-dim text-eft-gold'
									: 'border-eft-border text-eft-muted hover:border-eft-border-hi hover:text-eft-text'}"
						>{w}</button>
					{/each}
				</div>
				{#if system === 'aeg'}
					<p class="mt-1.5 text-[10px] text-eft-muted/60">Проверка лимита AEG — по правилам замер шаром 0.20 г</p>
				{/if}
			</div>

			{#if mode === 'speed-to-joules'}
				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<label class="text-xs text-eft-muted">Скорость вылета</label>
						<div class="flex overflow-hidden rounded-md border border-eft-border">
							{#each ([['ms', 'м/с'], ['fps', 'fps']] as const) as [u, ul]}
								<button onclick={() => (speedUnit = u)}
									class="px-2 py-0.5 text-[10px] transition-colors
										{speedUnit === u ? 'bg-eft-elevated text-eft-gold' : 'text-eft-muted hover:text-eft-text'}"
								>{ul}</button>
							{/each}
						</div>
					</div>
					{#if speedUnit === 'ms'}
						<div class="flex items-center gap-2">
							<input type="number" step="1" min="0" bind:value={speedMs}
								oninput={(e) => onMsInput(+(e.target as HTMLInputElement).value)}
								class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
							/>
							<span class="text-xs text-eft-muted">м/с</span>
							<span class="text-xs text-eft-muted/50">= {speedFps} fps</span>
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<input type="number" step="1" min="0" bind:value={speedFps}
								oninput={(e) => onFpsInput(+(e.target as HTMLInputElement).value)}
								class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
							/>
							<span class="text-xs text-eft-muted">fps</span>
							<span class="text-xs text-eft-muted/50">= {speedMs} м/с</span>
						</div>
					{/if}
				</div>
			{:else}
				<div>
					<label class="mb-1.5 block text-xs text-eft-muted">Энергия</label>
					<div class="flex items-center gap-2">
						<input type="number" step="0.01" min="0" bind:value={joules}
							class="w-24 rounded-md border border-eft-border bg-eft-bg px-2 py-1.5 text-sm text-eft-text outline-none focus:border-eft-gold"
						/>
						<span class="text-xs text-eft-muted">Дж</span>
					</div>
					<div class="mt-2 flex flex-wrap gap-1">
						{#each Object.values(GAS_LIMITS) as lim}
							<button onclick={() => (joules = lim)}
								class="rounded border border-eft-border px-2 py-0.5 text-[10px] text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text"
							>{lim} Дж</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Result -->
		<div class="flex flex-col gap-4 rounded-xl border border-eft-border bg-eft-surface p-4">
			<p class="text-[10px] font-bold uppercase tracking-widest text-eft-muted">Результат</p>

			{#if mode === 'speed-to-joules' && resultJoules() !== null}
				{@const j = resultJoules()!}
				{@const st = system === 'aeg' ? aegStatus() : gasStatus()}
				{@const v020 = Math.sqrt((2 * j) / 0.0002)}
				{@const zone = resultZone(j)}
				<div class="flex items-start gap-3">
					<span class="text-4xl font-bold tabular-nums {resultColor(j)}">{fmt(j)} <span class="text-lg">Дж</span></span>
					<div class="mt-1 flex flex-col items-start border-l-2 pl-3 {zone.color}">
						<span class="text-sm font-bold">{zone.label}</span>
						<span class="text-[10px] opacity-70">{zone.sub}</span>
					</div>
				</div>
				{#if weightG !== 0.20}
					<span class="text-xs text-eft-muted">≈ <span class="text-eft-text">{fmt(v020, 1)} м/с</span> · <span class="text-eft-text">{Math.round(v020 / 0.3048)} fps</span> при пересчёте на 0.20 г</span>
				{/if}
				{#if st}
					<div class="rounded-lg border p-3 {STATUS_BG[st.status]}">
						<p class="text-sm font-bold {STATUS_COLOR[st.status]}">{STATUS_LABEL[st.status]}</p>
						<p class="mt-0.5 text-xs text-eft-muted">
							{system === 'aeg'
								? `${fmt(st.value, 1)} м/с (на 0.20 г) из ${st.limit} м/с`
								: `${fmt(j)} Дж из ${st.limit} Дж`}
						</p>
					</div>
				{/if}

			{:else if mode === 'joules-to-speed' && resultSpeed() !== null}
				{@const r = resultSpeed()!}
				{@const st = gasStatus()}
				{@const c = resultColor(joules)}
				{@const zone = resultZone(joules)}
				<div class="flex items-start gap-3">
					<div class="flex flex-col gap-1">
						<span class="text-4xl font-bold tabular-nums {c}">{fmt(r.ms)} <span class="text-lg">м/с</span></span>
						<span class="text-xl font-bold tabular-nums {c} opacity-70">{fmt(r.fps)} <span class="text-sm">fps</span></span>
					</div>
					<div class="mt-1 flex flex-col items-start border-l-2 pl-3 {zone.color}">
						<span class="text-sm font-bold">{zone.label}</span>
						<span class="text-[10px] opacity-70">{zone.sub}</span>
					</div>
				</div>
				{#if st}
					<div class="rounded-lg border p-3 {STATUS_BG[st.status]}">
						<p class="text-sm font-bold {STATUS_COLOR[st.status]}">{STATUS_LABEL[st.status]}</p>
						<p class="mt-0.5 text-xs text-eft-muted">{fmt(joules)} Дж из {st.limit} Дж</p>
					</div>
				{/if}

			{:else}
				<div class="flex flex-1 items-center justify-center text-xs text-eft-muted">Введи параметры</div>
			{/if}
		</div>
	</div>

	<!-- Limits table -->
	<div class="mt-5 overflow-hidden rounded-xl border border-eft-border">
		<p class="border-b border-eft-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">
			Лимиты · {system === 'aeg' ? 'AEG (0.20 г, хоп 0)' : 'Газ / ВВД (рабочий шар, хоп макс.)'}
		</p>
		<table class="w-full text-xs">
			<thead>
				<tr class="border-b border-eft-border text-eft-muted">
					<th class="px-4 py-2 text-left font-normal">Класс</th>
					<th class="px-4 py-2 text-right font-normal">{system === 'aeg' ? 'м/с' : 'Дж'}</th>
					{#if system === 'aeg'}
						<th class="px-4 py-2 text-right font-normal">fps</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each WEAPON_CLASSES as wc}
					{@const limit = system === 'aeg' ? AEG_LIMITS[wc.value] : GAS_LIMITS[wc.value]}
					<tr class="border-b border-eft-border/50 last:border-0
						{weaponClass === wc.value ? 'bg-eft-elevated' : 'hover:bg-eft-elevated/50'}">
						<td class="px-4 py-2 text-eft-muted">{wc.short}</td>
						<td class="px-4 py-2 text-right font-bold text-eft-text">{limit}</td>
						{#if system === 'aeg'}
							<td class="px-4 py-2 text-right text-eft-muted">{Math.round(limit / 0.3048)}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
</div>
