<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" href="/ball_icons.webp" as="image" type="image/webp" />
	<link rel="preload" href="/sells.webp" as="image" type="image/webp" />
	<link rel="preload" href="/versus.webp" as="image" type="image/webp" />
	<link rel="preload" href="/logo.webp" as="image" type="image/webp" />
</svelte:head>

{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden">
		<div class="nav-bar h-full w-1/2 bg-eft-gold/70"></div>
	</div>
{/if}

<div class="flex h-screen flex-col overflow-hidden bg-eft-bg text-eft-text">
	<header class="border-b border-eft-border px-6 py-3">
		<a href="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
			<img src="/logo.webp" alt="KillMacLeod" class="h-10 w-auto" />
			<span class="font-bold tracking-widest text-eft-gold uppercase">KillMacLeod</span>
		</a>
	</header>

	<main class="flex flex-1 flex-col min-h-0">
		{@render children()}
	</main>

	<footer class="border-t border-eft-border px-6 py-3 text-center text-xs text-eft-muted">
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
