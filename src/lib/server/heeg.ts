const SHEET_ID = '1Xz13OjMHq5gPvosRlawcQQxiC4aY6U8x8Z9g1B07T1k';
const PYRO_TAG = 'g922235';
const HEEG_BASE = `https://heeg.ru/shop2_4.html?id=${SHEET_ID}`;

export type PyroType = 'vog' | 'rgd' | 'f1' | 'khatabka' | 'smoke' | 'mine' | 'deactivated' | 'other';

export type PyroProduct = {
	id: number;
	name: string;
	price: number;
	stockCount: number;
	qtyInPack: number | null;
	pyroType: PyroType;
	corner: { label: string; color: string } | null;
	description: string | null;
	url: string;
};

function parseCorner(raw: unknown): { label: string; color: string } | null {
	if (!raw || typeof raw !== 'string') return null;
	const idx = raw.lastIndexOf('#');
	if (idx < 1) return { label: raw, color: '#7a7260' };
	return { label: raw.slice(0, idx).trim(), color: '#' + raw.slice(idx + 1) };
}

function parseQty(name: string): number | null {
	const m = name.match(/(\d+)\s*шт/i);
	return m ? parseInt(m[1], 10) : null;
}

function parsePyroType(name: string): PyroType {
	const n = name.toLowerCase();
	if (/выстрел\s+имит/.test(n)) return 'vog';
	if (/ргд/.test(n)) return 'rgd';
	if (/ф-?1\b|ф1\b/.test(n)) return 'f1';
	if (/хатаб|fpc\d|jf-k/.test(n)) return 'khatabka';
	if (/^дым/.test(n)) return 'smoke';
	if (/^мина/.test(n)) return 'mine';
	if (/деактив|ёлоч/.test(n)) return 'deactivated';
	return 'other';
}

function cleanName(name: string): string {
	return name.replace(/^_[А-ЯA-Z]\s+/, '').trim();
}

type GVizCell = { v: unknown } | null;
type GVizRow = { c: GVizCell[] };
type GVizResponse = {
	table: {
		cols: Array<{ id: string; label: string }>;
		rows: GVizRow[];
	};
};

export async function fetchPyroProducts(): Promise<PyroProduct[]> {
	const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=goods`;

	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0' },
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) return [];

		const raw = await res.text();
		const json = raw.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
		const data: GVizResponse = JSON.parse(json);

		const cols = data.table.cols.map((c) => c.label || c.id);
		const cell = (row: GVizRow, col: string): unknown => {
			const idx = cols.indexOf(col);
			return idx >= 0 ? (row.c[idx]?.v ?? null) : null;
		};

		return data.table.rows
			.flatMap((row) => {
				const tags = String(cell(row, 'tags') ?? cell(row, 'hide_tags') ?? '');
				if (!tags.includes(PYRO_TAG)) return [];

				const id = Number(cell(row, 'id'));
				const rawName = String(cell(row, 'name') ?? '');
				const name = cleanName(rawName);
				const price = Number(cell(row, 'price') ?? 0);
				if (!id || !name || price <= 0) return [];

				return [{
					id,
					name,
					price,
					stockCount: Number(cell(row, 'sklad') ?? 0),
					qtyInPack: parseQty(name),
					pyroType: parsePyroType(name),
					corner: parseCorner(cell(row, 'corner')),
					description: cell(row, 'text') as string | null,
					url: `${HEEG_BASE}#${id}`,
				}] satisfies PyroProduct[];
			});
	} catch {
		return [];
	}
}
