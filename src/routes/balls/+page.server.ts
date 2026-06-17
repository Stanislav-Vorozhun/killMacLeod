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

export const load: PageServerLoad = async () => {
	const [strike, pentagon] = await Promise.allSettled([
		fetchStrikeProducts(),
		fetchPentagonProducts(),
	]);

	const products = [
		...(strike.status === 'fulfilled' ? strike.value : []),
		...(pentagon.status === 'fulfilled' ? pentagon.value : []),
	];
	const brands = [...new Set(products.map((p) => p.brand))].sort();
	const weights = [
		...new Set(products.map((p) => p.weight).filter((w): w is number => w != null)),
	].sort((a, b) => a - b);

	return { products, brands, weights };
};
