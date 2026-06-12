<script lang="ts">
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { disableGoogleAutoSelect } from '$lib/google-signin';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const navItems = [
		{ href: '/app', label: 'Home' },
		{ href: '/app/pets', label: 'Your Pets' },
		{ href: '/app/adoption', label: 'Adoption Center' },
		{ href: '/app/camera', label: 'Camera Monitor' },
		{ href: '/app/settings', label: 'Settings' }
	];

	function isActive(href: string): boolean {
		return href === '/app' ? page.url.pathname === '/app' : page.url.pathname.startsWith(href);
	}

	async function signOut() {
		await authClient.signOut();
		// Prevent One Tap from silently signing the user right back in
		await disableGoogleAutoSelect();
		// Full reload back to the landing page so sign-in is offered again
		window.location.href = '/';
	}
</script>

<div class="min-h-screen bg-[linear-gradient(135deg,#fffaf4_0%,#f4fbff_45%,#eef2ff_100%)] text-slate-800">
	<header class="border-b border-slate-200/70 bg-white/80 backdrop-blur">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
			<a href="/app" class="text-lg font-black tracking-tight text-slate-900">🐾 Pet Hub</a>

			<nav class="flex flex-1 flex-wrap items-center gap-1">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class="rounded-full px-4 py-1.5 text-sm font-semibold transition {isActive(item.href)
							? 'bg-violet-600 text-white shadow-md shadow-violet-200'
							: 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="flex items-center gap-3">
				<span class="hidden text-sm font-medium text-slate-600 sm:inline">
					{data.user.name ?? data.user.email}
				</span>
				<button
					onclick={signOut}
					class="rounded-full bg-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-200"
				>
					Sign out
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>
