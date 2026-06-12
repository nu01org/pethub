import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { InitConfig } from '$lib/init';

// Init service: exposes the client-safe configuration the frontend needs to
// bootstrap itself (currently the available auth providers and their client ids).
export const GET: RequestHandler = () => {
	const providers: InitConfig['auth']['providers'] = [];

	if (env.GOOGLE_CLIENT_ID) {
		providers.push({ id: 'google', clientId: env.GOOGLE_CLIENT_ID });
	}

	return json({ auth: { providers } } satisfies InitConfig);
};
