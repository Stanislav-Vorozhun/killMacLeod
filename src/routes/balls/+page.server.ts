import type { PageServerLoad } from './$types';
import { fetchStrikeProducts } from '$lib/server/strike';
import { fetchPentagonProducts } from '$lib/server/pentagon';

export type Product = {
	id: number;
	name: string;
	price: number;
	brand: string;
	weight: number | null;
	tracer: boolean;
	image: string | null;
	url: string | null;
	source?: 'strike' | 'pentagon';
};

export type Catalog = { products: Product[]; brands: string[]; weights: number[] };

export const load: PageServerLoad = ({ setHeaders }) => {
	// CDN кэш 1 час; после истечения — отдаёт stale пока обновляет в фоне
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' });

	const catalog: Promise<Catalog> = Promise.allSettled([
		fetchStrikeProducts(),
		fetchPentagonProducts(),
	]).then(([strike, pentagon]) => {
		const products = [
			...(strike.status === 'fulfilled' ? strike.value : []),
			...(pentagon.status === 'fulfilled' ? pentagon.value : []),
		];
		const brands = [...new Set(products.map((p) => p.brand))].sort();
		const weights = [
			...new Set(products.map((p) => p.weight).filter((w): w is number => w != null)),
		].sort((a, b) => a - b);
		return { products, brands, weights };
	});

	return { catalog };
};
