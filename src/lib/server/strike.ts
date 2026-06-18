import type { Product } from '../../routes/balls/+page.server';

const BASE_URL = 'https://strike.by';
const CATALOG_PATH = '/catalog/shary-loadery-gaz-pid-65/straykbolnye-shary-pid-108/';

const SKIP_WORDS = ['рогаток', 'рогатки'];

const BRANDS: [string, string][] = [
	['AIMTOP', 'AIMTOP'],
	['AIM TOP', 'AIMTOP'],
	['AIM', 'AIMTOP'],
	['AZOT', 'AZOT'],
	['ANGRY', 'ANGRY'],
	['BLS', 'BLS'],
	['G&G', 'G&G'],
	['STALKER', 'STALKER'],
	['ASG', 'ASG'],
	['MODIFY', 'MODIFY'],
	['GUARDER', 'GUARDER'],
];

function extractWeight(name: string): number | null {
	// Prefer match with explicit unit (гр/г/g), but not followed by к (кг/kg = package weight)
	const withUnit = name.match(/0[,.](\d+)\s*(?:гр?\.?|g)(?!\s*к)/i);
	if (withUnit) return parseFloat('0.' + withUnit[1]);
	// Fallback: first 0,XX not followed by к — covers "Шары AIM 0,25 (3800 шт) белые"
	const plain = name.match(/0[,.](\d+)(?!\s*к)/i);
	if (plain) return parseFloat('0.' + plain[1]);
	return null;
}

function extractBrand(name: string): string {
	const upper = name.toUpperCase();
	for (const [match, brand] of BRANDS) {
		if (upper.includes(match)) return brand;
	}
	return 'Другой';
}

function parsePage(html: string): Product[] {
	const products: Product[] = [];
	const blocks = html.split(/(?=id="bx_\d+_\d+")/);

	for (const blk of blocks) {
		if (!/^id="bx_\d+_\d+"/.test(blk)) continue;

		const idMatch = blk.match(/id="bx_\d+_(\d+)"/);
		const nameMatch = blk.match(/itemprop="description" content="([^"]+)"/);
		const priceMatch = blk.match(/itemprop="price"[^>]*content="([^"]+)"/);
		const imgMatch = blk.match(/data-src="(\/upload\/iblock\/[^"]+)"/);
		const hrefMatch = blk.match(/href="(\/catalog\/shary[^"]+\/\d+\/[^"]+)"/);

		if (!idMatch || !nameMatch || !priceMatch) continue;

		const price = parseFloat(priceMatch[1]);
		if (!price) continue;

		const name = nameMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
		const lower = name.toLowerCase();
		if (SKIP_WORDS.some((w) => lower.includes(w))) continue;

		products.push({
			id: parseInt(idMatch[1]),
			name,
			price,
			brand: extractBrand(name),
			weight: extractWeight(name),
			tracer: /трасс|tracer/i.test(name),
			image: imgMatch ? BASE_URL + imgMatch[1] : null,
			url: hrefMatch ? BASE_URL + hrefMatch[1] : null,
			source: 'strike',
		});
	}

	return products;
}

async function fetchPage(page: number): Promise<string> {
	const url =
		page === 1
			? BASE_URL + CATALOG_PATH
			: `${BASE_URL}${CATALOG_PATH}?PAGEN_1=${page}`;

	const res = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		},
	});
	if (!res.ok) throw new Error(`strike.by page ${page}: HTTP ${res.status}`);
	return res.text();
}

let cache: { products: Product[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchStrikeProducts(): Promise<Product[]> {
	if (cache && Date.now() < cache.expiresAt) return cache.products;

	const pages = await Promise.allSettled(
		Array.from({ length: 10 }, (_, i) => fetchPage(i + 1))
	);

	const seen = new Set<number>();
	const all: Product[] = [];

	for (const result of pages) {
		if (result.status === 'rejected') continue;
		for (const p of parsePage(result.value)) {
			if (!seen.has(p.id)) {
				seen.add(p.id);
				all.push(p);
			}
		}
	}

	cache = { products: all, expiresAt: Date.now() + CACHE_TTL_MS };
	return all;
}
