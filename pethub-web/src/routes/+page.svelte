<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { fetchInitConfig } from '$lib/init';
	import { initGoogleSignIn } from '$lib/google-signin';

	let googleButtonTarget = $state<HTMLDivElement>();
	let signingIn = $state(false);
	let authError = $state<string | null>(null);

	onMount(async () => {
		try {
			const init = await fetchInitConfig();
			const google = init.auth.providers.find((provider) => provider.id === 'google');
			if (!google) return;

			await initGoogleSignIn({
				clientId: google.clientId,
				buttonTarget: googleButtonTarget,
				autoPrompt: true,
				onCredential: async ({ credential }) => {
					signingIn = true;
					authError = null;
					const { error } = await authClient.signIn.social({
						provider: 'google',
						idToken: { token: credential }
					});
					if (error) {
						signingIn = false;
						authError = error.message ?? 'Google sign-in failed. Please try again.';
					} else {
						// Signed in: take the user to the app home
						await goto('/app');
					}
				}
			});
		} catch (e) {
			console.error('Failed to initialize sign-in', e);
			authError = 'Sign-in is unavailable right now.';
		}
	});
</script>

<section class="min-h-screen bg-[linear-gradient(135deg,#fffaf4_0%,#f4fbff_45%,#eef2ff_100%)] px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
	<div class="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
		<article class="space-y-6">
			<h1 class="max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">Welcome to Pet Hub</h1>
			<p class="max-w-lg text-lg text-slate-600 sm:text-xl">
				Keep pet routines, updates, and happy moments in one simple place. Pet Hub helps you stay connected to your companions every day.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				{#if signingIn}
					<p class="text-base text-slate-600">Signing you in…</p>
				{:else}
					<div bind:this={googleButtonTarget}></div>
				{/if}
			</div>
			{#if authError}
				<p class="text-sm font-medium text-rose-600">{authError}</p>
			{/if}

		</article>

		<aside class="rounded-3xl bg-white/90 p-4 shadow-2xl shadow-violet-100 ring-1 ring-slate-100 sm:p-6">
			<img
				src="/pet-hub-hero.jpg"
				alt="Pets for Pet Hub"
				class="w-full rounded-2xl object-cover"
			/>
			<div class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
				Bring every pet update, routine, and care note together in one friendly home.
			</div>
		</aside>
	</div>
</section>
