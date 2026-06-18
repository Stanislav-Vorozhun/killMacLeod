import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { INVITE_TOKENS } from '$env/static/private';

const VALID_TOKENS = new Set(
	INVITE_TOKENS.split(',').map((t) => t.trim()).filter(Boolean)
);

const COOKIE = 'beta_access';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

export const load: PageServerLoad = async ({ url, cookies }) => {
	const existing = cookies.get(COOKIE);
	if (existing && VALID_TOKENS.has(existing)) {
		redirect(303, '/');
	}

	const token = url.searchParams.get('token') ?? '';

	if (token && VALID_TOKENS.has(token)) {
		cookies.set(COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: true,
			maxAge: MAX_AGE,
		});
		redirect(303, '/');
	}

	return { invalid: !!token };
};
