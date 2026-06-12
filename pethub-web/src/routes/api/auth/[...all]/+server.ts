import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';

// Mount the better-auth HTTP API explicitly. The svelteKitHandler in
// hooks.server.ts only intercepts requests whose origin matches baseURL,
// which never matches in dev behind the nginx TLS proxy.
const handler = toSvelteKitHandler(auth);

export { handler as GET, handler as POST };
