<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating, page } from '$app/state';
	import { inject } from '@vercel/analytics';

	let { children } = $props();

	inject();

	const isHome = $derived(page.url.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" href="/ball_icons.webp" as="image" type="image/webp" />
	<link rel="preload" href="/sells.webp" as="image" type="image/webp" />
	<link rel="preload" href="/versus.webp" as="image" type="image/webp" />
	<link rel="preload" href="/calc.webp" as="image" type="image/webp" />
	<link rel="preload" href="/frag.webp" as="image" type="image/webp" />
	<link rel="preload" href="/radio.webp" as="image" type="image/webp" />
	<link rel="preload" href="/logo.webp" as="image" type="image/webp" />
</svelte:head>

{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden">
		<div class="nav-bar h-full w-1/2 bg-eft-gold/70"></div>
	</div>
{/if}

<div class="flex h-svh flex-col overflow-hidden bg-eft-bg text-eft-text md:h-screen" ondragstart={(e) => e.target instanceof HTMLImageElement && e.preventDefault()}>
	<header class="relative flex shrink-0 items-center justify-center px-4 py-2 md:justify-start md:border-b md:border-eft-border md:px-6 md:py-3">
		{#if !isHome}
			<a
				href="/"
				aria-label="Назад"
				class="absolute left-4 flex h-9 w-9 items-center justify-center rounded-lg border border-eft-border text-eft-muted transition-colors hover:border-eft-border-hi hover:text-eft-text md:hidden"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M19 12H5"/>
					<path d="M12 19l-7-7 7-7"/>
				</svg>
			</a>
		{/if}
		<a href="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80" aria-label="KillMacLeod">
			<img src="/logo.webp" alt="" class="h-10 w-auto md:h-10" />
			<span class="hidden font-bold uppercase tracking-widest text-eft-gold md:inline">KillMacLeod</span>
		</a>
	</header>

	<main class="flex flex-1 flex-col min-h-0">
		{@render children()}
	</main>

	<footer class="shrink-0 border-t border-eft-border px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[10px] text-eft-muted md:py-3 md:text-xs">
		Только для личного использования
	</footer>
</div>

<style>
	@keyframes nav-slide {
		0% { transform: translateX(-100%); }
		60% { transform: translateX(200%); }
		100% { transform: translateX(200%); }
	}
	.nav-bar {
		animation: nav-slide 1.4s ease-in-out infinite;
	}
</style>
