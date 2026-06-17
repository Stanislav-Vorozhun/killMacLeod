import type { PageServerLoad } from './$types';
import { VK_SERVICE_TOKEN } from '$env/static/private';

export type VkPost = {
	id: number;
	date: number;
	text: string;
	url: string;
	title: string | null;
	gameDate: string | null;
	parsedDate: string | null;
	source: 'cqb' | 'strikeball' | 'salamander' | 'bsg';
};

export type WeatherDay = {
	date: string;
	tempMax: number;
	tempMin: number;
	code: number;
};

const SOURCES: Array<{ domain: string; source: VkPost['source'] }> = [
	{ domain: 'cqb_airsoftclub',    source: 'cqb' },
	{ domain: 'strikeballby',        source: 'strikeball' },
	{ domain: 'salamander_club',     source: 'salamander' },
	{ domain: 'battle_strike_games', source: 'bsg' },
];

const ANNOUNCE_WORDS = [
	'анонс', 'игра', 'игры', 'мероприятие', 'регистрац', 'запись',
	'приглашаем', 'ждём', 'ждем', 'состоится', 'пройдёт', 'пройдет',
	'сбор', 'страйкбол', 'airsoft', 'катка', 'игровой день',
];

const MONTH_KEYS: Record<string, number> = {
	январ: 0, феврал: 1, март: 2, апрел: 3,
	'ма': 4, июн: 5, июл: 6, август: 7,
	сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
};

function localIso(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function parseToIso(gameDate: string | null, postUnix: number): string | null {
	if (!gameDate) return null;
	const year = new Date(postUnix * 1000).getFullYear();

	const numMatch = gameDate.match(/(\d{1,2})[./](\d{2})/);
	if (numMatch) {
		const d = new Date(year, parseInt(numMatch[2]) - 1, parseInt(numMatch[1]));
		return isNaN(d.getTime()) ? null : localIso(d);
	}

	const monthMatch = gameDate.match(/(\d{1,2})\s*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i);
	if (monthMatch) {
		const key = Object.keys(MONTH_KEYS).find((k) => monthMatch[2].toLowerCase().startsWith(k));
		if (key !== undefined) {
			const d = new Date(year, MONTH_KEYS[key], parseInt(monthMatch[1]));
			return isNaN(d.getTime()) ? null : localIso(d);
		}
	}

	return null;
}

const DATE_PATTERNS: RegExp[] = [
	/(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)[,\s]+\d{1,2}[./\s]*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i,
	/(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)[,\s]+\d{1,2}[./]\d{2}/i,
	/дата[^:\n]*:\s*\d{1,2}[./\s]*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i,
	/дата[^:\n]*:\s*\d{1,2}[./]\d{2}/i,
	/когда[^:\n]*:\s*\d{1,2}[./\s]*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i,
	/(\d{1,2})\s*[-–]\s*\d{1,2}\s*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i,
	/\d{1,2}\s*(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/i,
];

function extractDate(text: string): string | null {
	for (const pattern of DATE_PATTERNS) {
		const m = text.match(pattern);
		if (m) return m[0];
	}
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	for (const line of lines.slice(0, 5)) {
		const m = line.match(/\d{1,2}[./]\d{2}/);
		if (m) return m[0];
	}
	return null;
}

function parsePost(text: string): { title: string | null; gameDate: string | null } {
	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	const title = lines[0] ?? null;
	const gameDate = extractDate(text);
	return { title, gameDate };
}

const VK_API = 'https://api.vk.com/method';

async function fetchWallPosts(domain: string, source: VkPost['source'], count = 50): Promise<VkPost[]> {
	const token = VK_SERVICE_TOKEN;
	if (!token || token === 'your_token_here') return [];

	const params = new URLSearchParams({
		domain,
		count: String(count),
		filter: 'owner',
		v: '5.199',
		access_token: token,
	});

	const res = await fetch(`${VK_API}/wall.get?${params}`);
	if (!res.ok) return [];

	const data = await res.json();
	if (data.error || !data.response?.items) return [];

	return data.response.items
		.map((item: { id: number; date: number; text: string }) => {
			const { title, gameDate } = parsePost(item.text);
			return {
				id: item.id,
				date: item.date,
				text: item.text,
				url: `https://vk.com/wall-${data.response.groups?.[0]?.id ?? domain}_${item.id}`,
				title,
				gameDate,
				parsedDate: parseToIso(gameDate, item.date),
				source,
			};
		})
		.filter((p: VkPost) => p.gameDate !== null);
}

// Open-Meteo: free, no API key, Minsk coordinates
async function fetchWeather(startDate: string, endDate: string): Promise<Record<string, WeatherDay>> {
	try {
		const url = new URL('https://api.open-meteo.com/v1/forecast');
		url.searchParams.set('latitude', '53.9');
		url.searchParams.set('longitude', '27.5667');
		url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode');
		url.searchParams.set('timezone', 'Europe/Minsk');
		url.searchParams.set('start_date', startDate);
		url.searchParams.set('end_date', endDate);

		const res = await fetch(url.toString());
		if (!res.ok) return {};
		const json = await res.json();

		const result: Record<string, WeatherDay> = {};
		(json.daily.time as string[]).forEach((date, i) => {
			result[date] = {
				date,
				tempMax: Math.round(json.daily.temperature_2m_max[i]),
				tempMin: Math.round(json.daily.temperature_2m_min[i]),
				code: json.daily.weathercode[i],
			};
		});
		return result;
	} catch {
		return {};
	}
}

export const load: PageServerLoad = async () => {
	const hasToken = !!(VK_SERVICE_TOKEN && VK_SERVICE_TOKEN !== 'your_token_here');

	const allPosts = await Promise.all(
		SOURCES.map(({ domain, source }) => fetchWallPosts(domain, source))
	);

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 7);
	const cutoffIso = localIso(cutoff);

	const posts = allPosts
		.flat()
		.filter((p) => p.parsedDate !== null && p.parsedDate >= cutoffIso)
		.sort((a, b) => (a.parsedDate ?? '').localeCompare(b.parsedDate ?? ''));

	// Fetch 16 days of weather starting today (Open-Meteo free limit)
	const today = new Date();
	const startDate = localIso(today);
	const endDate = localIso(new Date(today.getTime() + 15 * 86400000));
	const weather = await fetchWeather(startDate, endDate);

	return { posts, hasToken, weather };
};
