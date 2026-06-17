import type { Product } from '../../routes/balls/+page.server';

const SKIP_WORDS = [
	'лоадер', 'лоудер', 'loader', 'louder', 'co2', 'баллончик', 'адаптер',
	'fl-airsoft', 'green gas', 'gas ', 'газ', 'stti', 'extreme blow', 'алюминиев',
];

const BALL_WORDS = ['шар', 'ball', 'bb', '0,', '0.', 'bls', 'azot', 'angry', 'exact', 'we ', 'aim top', 'guarder'];

function isBall(name: string): boolean {
	const lower = name.toLowerCase();
	if (SKIP_WORDS.some((w) => lower.includes(w))) return false;
	return BALL_WORDS.some((w) => lower.includes(w));
}

export async function fetchPentagonProducts(): Promise<Product[]> {
	const res = await fetch('https://pentagon.by/bol.html', {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		},
	});
	if (!res.ok) return [];

	const html = await res.text();

	// Extract product table blocks
	const blockRegex = /<table[^>]*class="product productitem[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
	const products: Product[] = [];
	let idCounter = 900000;

	for (const match of html.matchAll(blockRegex)) {
		const b = match[1];

		// src comes before alt in the HTML
		const imgSrcMatch = b.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/);
		const hrefMatch = b.match(/href="(\/bol\/[^"]+\.html)"/);
		const priceMatch = b.match(/jshop_price[^>]*>\s*<span>([\d.]+)\s*<\/span>/);

		if (!imgSrcMatch) continue;
		const name = imgSrcMatch[2].replace(/&amp;/g, '&').trim();

		if (!isBall(name)) continue;

		const price = priceMatch ? parseFloat(priceMatch[1]) : null;
		// Skip items with no price or price=0 (out of stock / unlisted)
		if (!price) continue;

		const weightMatch = name.match(/0[,.](\d+)/);
		const weight = weightMatch ? parseFloat('0.' + weightMatch[1]) : null;

		let brand = 'Другой';
		for (const [match, resolved] of [
			['AIMTOP', 'AIMTOP'],
			['AIM TOP', 'AIMTOP'],
			['AIM', 'AIMTOP'],
			['AZOT', 'AZOT'],
			['ANGRY', 'ANGRY'],
			['BLS', 'BLS'],
			['MODIFY', 'MODIFY'],
			['GUARDER', 'GUARDER'],
		] as [string, string][]) {
			if (name.toUpperCase().includes(match)) {
				brand = resolved;
				break;
			}
		}

		products.push({
			id: idCounter++,
			name,
			price,
			brand,
			weight,
			tracer: /трасс|tracer/i.test(name),
			image: imgSrcMatch[1],
			url: hrefMatch ? 'https://pentagon.by' + hrefMatch[1] : 'https://pentagon.by/bol.html',
			source: 'pentagon',
		});
	}

	return products;
}
