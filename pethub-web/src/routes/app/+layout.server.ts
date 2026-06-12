import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// The app area requires a signed-in user.
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}
	return { user: locals.user };
};
