<script lang="ts">
	type Setting = { num: number; key: string; desc: string; rec: string };
	type Category = { id: string; title: string; settings: Setting[] };

	const CATEGORIES: Category[] = [
		{
			id: 'main',
			title: 'Основные',
			settings: [
				{ num: 0,  key: 'SQL',  desc: 'Убирает шипение, когда никто не говорит. Чем больше число, тем сильнее должен быть сигнал, чтобы рация его услышала. Если поставить слишком много — можешь не услышать товарища, который далеко.', rec: '2–3' },
				{ num: 1,  key: 'STEP', desc: 'На сколько изменяется частота при вращении или вводе вручную. Если не настраиваешь частоты руками — можно не трогать.', rec: '12.5 kHz' },
				{ num: 2,  key: 'TXP',  desc: 'Мощность передачи. HIGH — дальше "добивает", но быстрее садит аккумулятор. LOW — экономит батарею и обычно хватает на небольших дистанциях.', rec: 'LOW / HIGH' },
				{ num: 5,  key: 'WN',   desc: 'Ширина канала связи. Если выбрать неправильно, голос может стать тихим или искажённым.', rec: 'NARROW' },
				{ num: 33, key: 'BAND', desc: 'Выбор диапазона работы: VHF (136–174 МГц) или UHF (400–520 МГц).', rec: 'По частоте' },
			],
		},
		{
			id: 'power',
			title: 'Питание и управление',
			settings: [
				{ num: 3,  key: 'SAVE',   desc: 'Экономия батареи. Пока никто не говорит, рация "дремлет" и расходует меньше энергии.', rec: 'ON' },
				{ num: 4,  key: 'VOX',    desc: 'Передача голосом без нажатия кнопки PTT. Любой громкий звук может случайно включить передачу.', rec: 'OFF' },
				{ num: 9,  key: 'TOT',    desc: 'Максимальное время одной передачи. Если случайно зажмёшь кнопку — рация сама остановит передачу.', rec: '60–90 сек' },
				{ num: 24, key: 'AUTOLK', desc: 'Автоматически блокирует клавиатуру через некоторое время.', rec: 'По желанию' },
			],
		},
		{
			id: 'display',
			title: 'Дисплей и звук',
			settings: [
				{ num: 6,  key: 'ABR',    desc: 'Через сколько секунд погаснет подсветка экрана после последнего нажатия кнопки.', rec: '5 сек' },
				{ num: 8,  key: 'BEEP',   desc: 'Писк при нажатии кнопок.', rec: 'OFF' },
				{ num: 14, key: 'VOICE',  desc: 'Голосовые подсказки ("Channel mode", "Frequency mode").', rec: 'OFF' },
				{ num: 21, key: 'MDF-A',  desc: 'Что показывать в верхней строке экрана: частоту, название канала или номер.', rec: 'NAME / FREQ' },
				{ num: 22, key: 'MDF-B',  desc: 'То же самое для нижней строки.', rec: 'NAME / FREQ' },
				{ num: 29, key: 'WT-LED', desc: 'Цвет подсветки, когда рация ничего не делает.', rec: 'Любой' },
				{ num: 30, key: 'RX-LED', desc: 'Цвет подсветки во время приёма сигнала.', rec: 'Любой' },
				{ num: 31, key: 'TX-LED', desc: 'Цвет подсветки во время передачи.', rec: 'Любой' },
				{ num: 38, key: 'PONMSG', desc: 'Что показывать при включении рации: приветствие или служебную информацию.', rec: 'По вкусу' },
				{ num: 39, key: 'ROGER',  desc: 'После окончания передачи звучит короткий "бип". Многие считают его лишним.', rec: 'OFF' },
			],
		},
		{
			id: 'dual',
			title: 'Двойное прослушивание',
			settings: [
				{ num: 7,  key: 'TDR',    desc: 'Одновременно слушает две частоты (верхнюю и нижнюю строку на экране).', rec: 'ON / OFF' },
				{ num: 34, key: 'TDR-AB', desc: 'Какая строка (верхняя или нижняя) будет главной при двойном прослушивании.', rec: 'A' },
			],
		},
		{
			id: 'tones',
			title: 'Тональные коды (CTCSS / DCS)',
			settings: [
				{ num: 10, key: 'R-DCS',  desc: 'DCS-код, который должен прийти, чтобы рация открыла динамик. Используется только если вся группа работает с DCS.', rec: 'OFF' },
				{ num: 11, key: 'R-CTCS', desc: 'То же самое, только для CTCSS-тонов.', rec: 'OFF' },
				{ num: 12, key: 'T-DCS',  desc: 'DCS-код, который твоя рация будет отправлять при передаче.', rec: 'По группе' },
				{ num: 13, key: 'T-CTCS', desc: 'CTCSS-тон, который отправляется при передаче.', rec: 'По группе' },
			],
		},
		{
			id: 'dtmf',
			title: 'DTMF и ANI',
			settings: [
				{ num: 15, key: 'ANI-ID',  desc: 'Отправляет цифровой идентификатор рации при передаче. Для обычного использования не нужен.', rec: 'OFF' },
				{ num: 16, key: 'DTMFST', desc: 'Определяет, будут ли слышны DTMF-сигналы при нажатии цифровых клавиш.', rec: 'Не менять' },
				{ num: 17, key: 'S-CODE', desc: 'Выбор заранее записанного DTMF-кода. Используется редко.', rec: 'Не менять' },
				{ num: 19, key: 'PTT-ID',  desc: 'Когда отправлять ANI-ID: до передачи, после или никогда.', rec: 'OFF' },
				{ num: 20, key: 'PTT-LT',  desc: 'Задержка перед отправкой ANI-ID.', rec: 'По умолчанию' },
			],
		},
		{
			id: 'scan',
			title: 'Сканирование и BCL',
			settings: [
				{ num: 18, key: 'SC-REV', desc: 'Как работает сканирование: ждать окончания передачи или сразу продолжать поиск.', rec: 'TO' },
				{ num: 23, key: 'BCL',    desc: 'Если кто-то уже говорит на этой частоте — не даст начать передачу и перебить его.', rec: 'ON' },
			],
		},
		{
			id: 'repeater',
			title: 'Ретрансляторы',
			settings: [
				{ num: 25, key: 'SFT-D',  desc: 'Используется только при работе через ретранслятор (смещение частоты).', rec: 'OFF' },
				{ num: 26, key: 'OFFSET', desc: 'Размер смещения частоты для ретрансляторов.', rec: 'Не менять' },
				{ num: 35, key: 'STE',    desc: 'Убирает неприятный шум ("хвост") после окончания передачи.', rec: 'ON' },
				{ num: 36, key: 'RP-STE', desc: 'Такая же функция, но только для работы через ретрансляторы.', rec: 'OFF' },
				{ num: 37, key: 'RPT-RL', desc: 'Задержка работы RP-STE.', rec: 'По умолчанию' },
			],
		},
		{
			id: 'memory',
			title: 'Память и сброс',
			settings: [
				{ num: 27, key: 'MEM-CH', desc: 'Сохранить текущую частоту в память рации.', rec: 'По необходимости' },
				{ num: 28, key: 'DEL-CH', desc: 'Удалить сохранённый канал из памяти.', rec: 'По необходимости' },
				{ num: 32, key: 'AL-MOD', desc: 'Настройки тревожной сигнализации (Alarm). В обычной работе не используется.', rec: 'По умолчанию' },
				{ num: 40, key: 'RESET',  desc: 'Сбросить настройки рации. Есть частичный и полный сброс. Использовать только при необходимости.', rec: 'Не использовать' },
			],
		},
	];

	const GLOSSARY = [
		{ term: 'CTCSS', def: 'Аналоговый тон-пароль — субтональный звуковой сигнал, который незаметно добавляется к передаче. Рация откроет динамик, только если тон совпадает.' },
		{ term: 'DCS',   def: 'Цифровой пароль — более помехоустойчивый вариант тон-кода. Передаётся как цифровая последовательность.' },
	];
</script>

<!-- ───── Mobile ───── -->
<div class="flex h-full min-h-0 flex-col overflow-hidden md:hidden">
	<div class="flex-1 space-y-5 overflow-y-auto bg-eft-bg px-4 pt-5 pb-28">
		{#each CATEGORIES as cat}
			<section>
				<h2 class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">{cat.title}</h2>
				<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
					{#each cat.settings as s}
						<div class="border-b border-eft-border px-4 py-3 last:border-b-0">
							<div class="mb-1.5 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-[10px] text-eft-muted">#{s.num}</span>
									<code class="rounded bg-eft-elevated px-1.5 py-0.5 font-mono text-xs font-bold text-eft-gold">{s.key}</code>
								</div>
								<span class="shrink-0 rounded border border-eft-border px-1.5 py-0.5 text-[10px] text-eft-muted">{s.rec}</span>
							</div>
							<p class="text-sm leading-relaxed text-eft-text">{s.desc}</p>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		<section id="glossary">
			<h2 class="mb-2 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Термины</h2>
			<div class="overflow-hidden rounded-xl border border-eft-border bg-eft-surface">
				{#each GLOSSARY as g}
					<div class="border-b border-eft-border px-4 py-3 last:border-b-0">
						<code class="font-mono text-sm font-bold text-eft-gold">{g.term}</code>
						<p class="mt-1 text-sm leading-relaxed text-eft-text">{g.def}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<div
		class="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-eft-bg via-eft-bg/70 to-transparent"
		aria-hidden="true"
	></div>
</div>

<!-- ───── Desktop (docs) ───── -->
<div class="hidden h-full min-h-0 md:flex">
	<!-- Sidebar nav -->
	<aside class="w-52 shrink-0 overflow-y-auto border-r border-eft-border p-5">
		<p class="mb-3 text-[10px] font-bold uppercase tracking-widest text-eft-muted">Разделы</p>
		<nav class="space-y-0.5">
			{#each CATEGORIES as cat}
				<a
					href="#{cat.id}"
					class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-eft-muted transition-colors hover:bg-eft-elevated hover:text-eft-text"
				>
					{cat.title}
				</a>
			{/each}
		</nav>
		<div class="my-4 border-t border-eft-border"></div>
		<a
			href="#glossary"
			class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-eft-muted transition-colors hover:bg-eft-elevated hover:text-eft-text"
		>
			Термины
		</a>
	</aside>

	<!-- Main content -->
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-3xl px-8 py-6">
			<h1 class="mb-1 text-2xl font-bold text-eft-text">Baofeng UV-5R</h1>
			<p class="mb-8 text-sm text-eft-muted">Справочник по настройкам меню — что значит каждый пункт и что обычно ставят</p>

			{#each CATEGORIES as cat}
				<section id={cat.id} class="mb-10 scroll-mt-6">
					<h2 class="mb-4 border-b border-eft-border pb-2 text-base font-semibold text-eft-text">{cat.title}</h2>
					<div class="overflow-hidden rounded-lg border border-eft-border">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-eft-border bg-eft-surface">
									<th class="w-10 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-eft-muted">№</th>
									<th class="w-24 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-eft-muted">Пункт</th>
									<th class="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-eft-muted">Описание</th>
									<th class="w-36 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-eft-muted">Обычно</th>
								</tr>
							</thead>
							<tbody>
								{#each cat.settings as s, i}
									<tr class="border-b border-eft-border last:border-b-0 {i % 2 === 1 ? 'bg-eft-surface/50' : ''}">
										<td class="px-3 py-2.5 text-xs text-eft-muted">{s.num}</td>
										<td class="px-3 py-2.5">
											<code class="rounded bg-eft-elevated px-1.5 py-0.5 font-mono text-xs font-semibold text-eft-gold">{s.key}</code>
										</td>
										<td class="px-3 py-2.5 leading-relaxed text-eft-text">{s.desc}</td>
										<td class="px-3 py-2.5 text-xs text-eft-muted">{s.rec}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/each}

			<!-- Glossary -->
			<section id="glossary" class="mb-10 scroll-mt-6">
				<h2 class="mb-4 border-b border-eft-border pb-2 text-base font-semibold text-eft-text">Термины</h2>
				<dl class="overflow-hidden rounded-lg border border-eft-border">
					{#each GLOSSARY as g}
						<div class="flex gap-4 border-b border-eft-border px-4 py-3 last:border-b-0">
							<dt class="w-20 shrink-0">
								<code class="rounded bg-eft-elevated px-1.5 py-0.5 font-mono text-xs font-semibold text-eft-gold">{g.term}</code>
							</dt>
							<dd class="text-sm leading-relaxed text-eft-text">{g.def}</dd>
						</div>
					{/each}
				</dl>
			</section>
		</div>
	</div>
</div>
