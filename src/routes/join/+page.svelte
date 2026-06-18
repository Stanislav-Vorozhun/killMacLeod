<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="flex h-full items-center justify-center p-8">
	<div class="flex flex-col items-center gap-6 text-center">
		<div class="text-6xl select-none">🔒</div>

		<div class="flex flex-col gap-2">
			<h1 class="text-lg font-bold uppercase tracking-widest text-eft-text">
				Закрытое бета-тестирование
			</h1>
			{#if data.invalid}
				<p class="text-sm text-eft-danger">Недействительная ссылка-приглашение.</p>
			{/if}
			<p class="text-sm text-eft-muted">
				Доступ только по персональной ссылке&#8209;приглашению.
			</p>
		</div>
	</div>
</div>
