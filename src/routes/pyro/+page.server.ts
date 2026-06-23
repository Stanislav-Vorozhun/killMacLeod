import type { PageServerLoad } from './$types';
import { fetchPyroProducts } from '$lib/server/heeg';

export type { PyroProduct, PyroType } from '$lib/server/heeg';

export const load: PageServerLoad = ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' });
	return { products: fetchPyroProducts() };
};
