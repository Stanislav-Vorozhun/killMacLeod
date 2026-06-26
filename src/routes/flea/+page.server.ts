import type { PageServerLoad } from './$types';
import { VK_SERVICE_TOKEN } from '$env/static/private';

export type Listing = {
	id: number;
	title: string;
	price: number | null;
	image: string | null;
	url: string;
	region: string;
	condition: string;
	date: string;
	exchange: boolean;
	category: 'weapon' | 'gear' | 'other';
	source: 'kufar' | 'vk';
};

type KufarAd = {
	ad_id: number;
	subject: string;
	price_byn: number | null;
	images: { path: string }[];
	ad_link: string;
	list_time: string;
	ad_parameters: { p: string; vl: string }[];
};

import { PRESET_QUERIES, REGIONS } from '$lib/flea/constants';

type KufarPage = { label: string; token: string | null };

const WEAPON_WORDS = [
	'привод', 'автомат', 'пистолет', 'винтовка', 'дробовик', 'снайпер', 'пулемет',
	'м4', 'ак', 'ak', 'm4', 'mp5', 'hk', 'g36', 'aug', 'p90', 'svd', 'dmr',
	'asg', 'cyma', 'ares', 'iga', 'krytac', 'vfc', 'ghk', 'we', 'kwa',
	'gbb', 'aeg', 'hpa', 'glock', 'beretta', 'colt',
];
const GEAR_WORDS = [
	'разгрузка', 'жилет', 'маска', 'очки', 'шлем', 'каска', 'бронежилет', 'рация',
	'подсумок', 'чехол', 'кобура', 'рюкзак', 'форма', 'берцы', 'перчатки',
	'тактический', 'molle', 'снаряжение', 'экип', 'прибор', 'прицел', 'фонарь',
	'шары', 'bb', 'аккумулятор', 'батарея', 'зарядник',
];

function categorize(title: string): Listing['category'] {
	const t = title.toLowerCase();
	const weaponScore = WEAPON_WORDS.filter((w) => t.includes(w)).length;
	const gearScore = GEAR_WORDS.filter((w) => t.includes(w)).length;
	if (weaponScore > gearScore) return 'weapon';
	if (gearScore > weaponScore) return 'gear';
	return 'other';
}

function mapAd(ad: KufarAd): Listing {
	const params = ad.ad_parameters ?? [];
	const region = params.find((p) => p.p === 'region')?.vl ?? '';
	const condition = params.find((p) => p.p === 'condition')?.vl ?? '';
	const exchange = params.some((p) => p.p === 'possible_exchange' && p.vl === 'Да');
	const img = ad.images?.[0];
	const image = img ? `https://rms.kufar.by/v1/gallery/${img.path}` : null;

	return {
		id: ad.ad_id,
		title: ad.subject ?? '',
		price: ad.price_byn != null ? Math.round(ad.price_byn / 100) : null,
		image,
		url: ad.ad_link,
		region,
		condition,
		date: ad.list_time,
		exchange,
		category: categorize(ad.subject ?? ''),
		source: 'kufar',
	};
}

const BASE_URL = 'https://api.kufar.by/search-api/v2/search/rendered-paginated';

async function fetchKufarListings(query: string, region: string, cursor: string | null) {
	const params = new URLSearchParams({ lang: 'ru', query, size: '28' });
	if (region) params.set('rgn', region);
	if (cursor) params.set('cursor', cursor);

	let res: Response;
	try {
		res = await fetch(`${BASE_URL}?${params}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		return { listings: [], nextToken: null, total: 0 };
	}
	if (!res.ok) return { listings: [], nextToken: null, total: 0 };

	const data = await res.json();
	const listings = (data.ads ?? []).map(mapAd);
	const nextPage = (data.pagination?.pages ?? []).find((p: KufarPage) => p.label === 'next');
	return { listings, nextToken: nextPage?.token ?? null, total: data.total ?? listings.length };
}

type VkPhoto = { type: string; photo: { sizes: { type: string; url: string; width: number }[] } };
type VkItem = { id: number; owner_id: number; date: number; text: string; attachments?: VkPhoto[] };

function extractVkPrice(text: string): number | null {
	const m = text.match(/(\d[\d\s]*)[\s]*(р|руб|byn|бел)/i)
		?? text.match(/(\d[\d\s]*)\s*\$/i);
	if (!m) return null;
	const n = parseInt(m[1].replace(/\s/g, ''));
	return isNaN(n) ? null : n;
}

function bestVkPhoto(attachments: VkPhoto[] | undefined): string | null {
	const photos = (attachments ?? []).filter((a) => a.type === 'photo');
	if (!photos.length) return null;
	const sizes = photos[0].photo.sizes;
	// prefer 'x' (604px) → 'm' (130px) → whatever is smallest; avoid huge originals
	const PREF = ['x', 'q', 'm', 'o', 's'];
	for (const type of PREF) {
		const s = sizes.find((sz) => sz.type === type);
		if (s) return s.url;
	}
	return [...sizes].sort((a, b) => a.width - b.width).at(-1)?.url ?? null;
}

async function fetchVkListings(count = 50): Promise<Listing[]> {
	const token = VK_SERVICE_TOKEN;
	if (!token || token === 'your_token_here') return [];

	const params = new URLSearchParams({
		domain: 'airsoft_baraholka_by',
		count: String(count),
		filter: 'owner',
		extended: '1',
		v: '5.199',
		access_token: token,
	});

	let res: Response;
	try {
		res = await fetch(`https://api.vk.com/method/wall.get?${params}`, {
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		return [];
	}
	if (!res.ok) return [];

	const data = await res.json();
	if (data.error || !data.response?.items) return [];

	return (data.response.items as VkItem[]).map((item, i) => {
		const lines = item.text.split('\n').filter(Boolean);
		const title = lines[0]?.trim() ?? '(без заголовка)';
		const price = extractVkPrice(item.text);
		const image = bestVkPhoto(item.attachments);
		const date = new Date(item.date * 1000).toISOString();
		// owner_id is negative for groups (e.g. -191601689)
		const url = `https://vk.com/airsoft_baraholka_by?w=wall${item.owner_id}_${item.id}`;

		return {
			id: 8000000 + i,
			title,
			price,
			image,
			url,
			region: '',
			condition: '',
			date,
			exchange: /обмен|меняю/i.test(item.text),
			category: categorize(title),
			source: 'vk' as const,
		};
	});
}

type ListingsResult = { listings: Listing[]; nextToken: string | null; total: number };

export const load: PageServerLoad = ({ url, setHeaders }) => {
	// CDN кэш 5 минут (данные более динамичные, чем balls/events)
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' });

	const query = (url.searchParams.get('q') ?? 'страйкбол').slice(0, 200);
	const region = (url.searchParams.get('rgn') ?? '').slice(0, 50);
	const rawCursor = url.searchParams.get('cursor');
	const cursor = rawCursor && /^[\w=+/-]{1,500}$/.test(rawCursor) ? rawCursor : null;

	const listings: Promise<ListingsResult> = Promise.all([
		fetchKufarListings(query, region, cursor),
		fetchVkListings(),
	]).then(([kufar, vkListings]) => ({
		listings: [...kufar.listings, ...vkListings],
		nextToken: kufar.nextToken,
		total: kufar.total + vkListings.length,
	}));

	return { query, region, presets: PRESET_QUERIES, regions: REGIONS, listings };
};
