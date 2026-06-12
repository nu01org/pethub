import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// Signed-in users go straight to the app
	if (locals.user) {
		redirect(302, '/app');
	}
	return {};
};
