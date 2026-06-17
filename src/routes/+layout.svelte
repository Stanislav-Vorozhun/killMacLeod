<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen flex-col overflow-hidden bg-eft-bg text-eft-text">
	<header class="border-b border-eft-border px-6 py-3">
		<a href="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
			<img src="/logo.png" alt="KillMacLeod" class="h-10 w-auto" />
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
