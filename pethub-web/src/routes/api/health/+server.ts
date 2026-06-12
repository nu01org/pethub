import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

// Health check: verifies the app is up and the database is reachable.
export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok', database: 'up' });
	} catch (e) {
		console.error('Health check failed: database unreachable', e);
		return json({ status: 'error', database: 'down' }, { status: 503 });
	}
};
