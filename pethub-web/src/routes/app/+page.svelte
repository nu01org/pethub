<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const firstName = $derived((data.user.name ?? data.user.email).split(' ')[0]);

	const features = [
		{
			href: '/app/pets',
			title: 'Your Pets',
			emoji: '🐶',
			description: 'Profiles, routines, and care notes for every companion.'
		},
		{
			href: '/app/adoption',
			title: 'Adoption Center',
			emoji: '🏠',
			description: 'Browse pets looking for a new home near you.'
		},
		{
			href: '/app/camera',
			title: 'Camera Monitor',
			emoji: '📷',
			description: 'Keep an eye on your pets while you are away.'
		}
	];
</script>

<section class="space-y-8">
	<div>
		<h1 class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
			Hi {firstName}! 👋
		</h1>
		<p class="mt-2 max-w-lg text-lg text-slate-600">
			Welcome to your Pet Hub. What would you like to do today?
		</p>
	</div>

	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as feature (feature.href)}
			<a
				href={feature.href}
				class="group rounded-3xl bg-white/90 p-6 shadow-lg shadow-violet-100 ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-violet-200"
			>
				<div class="text-3xl">{feature.emoji}</div>
				<h2 class="mt-3 text-lg font-bold text-slate-900 group-hover:text-violet-700">
					{feature.title}
				</h2>
				<p class="mt-1 text-sm text-slate-600">{feature.description}</p>
			</a>
		{/each}
	</div>
</section>
