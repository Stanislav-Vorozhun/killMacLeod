import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { INVITE_TOKENS } from '$env/static/private';

const VALID_TOKENS = new Set(
	INVITE_TOKENS.split(',').map((t) => t.trim()).filter(Boolean)
);

const COOKIE = 'beta_access';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/join')) {
		return resolve(event);
	}

	const token = event.cookies.get(COOKIE);

	if (!token || !VALID_TOKENS.has(token)) {
		redirect(303, '/join');
	}

	return resolve(event);
};
