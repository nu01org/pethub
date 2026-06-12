<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data.user);
</script>

<section class="space-y-4">
	<h1 class="text-3xl font-black tracking-tight text-slate-900">Settings ⚙️</h1>
	<p class="max-w-lg text-lg text-slate-600">Manage your account and preferences.</p>
	<div class="rounded-3xl bg-white/90 p-6 shadow-lg shadow-violet-100 ring-1 ring-slate-100">
		<dl class="grid gap-4 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-semibold text-slate-500">Name</dt>
				<dd class="mt-0.5 text-base text-slate-900">{user?.name}</dd>
			</div>
			<div>
				<dt class="font-semibold text-slate-500">Email</dt>
				<dd class="mt-0.5 text-base text-slate-900">{user?.email}</dd>
			</div>
		</dl>
	</div>
</section>
