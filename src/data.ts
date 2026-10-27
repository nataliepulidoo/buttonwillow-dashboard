import * as XLSX from 'xlsx';
export type Sale = {
    product: string;
    category: string;
    quantity: number;
    unit: string;
    date: string;
    location: string;
    price?: number;
    cost?: number;
    inventory?: number;
};
export type Mapping = Record<string, string>;
export const fields = ['product', 'date', 'quantity', 'unit', 'category', 'price', 'cost', 'location', 'inventory'];
const aliases: Record<string, string[]> = { product: ['item description', 'product', 'product name', 'item'], date: ['date invoiced', 'date', 'invoice date'], quantity: ['quantity', 'qty', 'quantity sold'], unit: ['suom', 'unit', 'uom'], category: ['category description', 'category'], price: ['price', 'unit price', 'selling price'], cost: ['cost', 'unit cost'], location: ['zip', 'location', 'postal code'], inventory: ['inventory', 'stock'] };
export function suggest(headers: string[]): Mapping { return Object.fromEntries(fields.map(f => [f, headers.find(h => aliases[f].includes(h.toLowerCase().trim())) || ''])); }
export function number(v: unknown): number | undefined { if (v === null || v === undefined || typeof v === 'boolean' || v instanceof Date || (typeof v === 'string' && !v.trim()))
    return undefined; const n = Number(typeof v === 'string' ? v.replace(/[$,]/g, '').trim() : v); return Number.isFinite(n) ? n : undefined; }
export function date(v: unknown): string | undefined { if (v instanceof Date)
    return Number.isNaN(+v) ? undefined : v.toISOString().slice(0, 10); if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : undefined;
} if (typeof v !== 'string')
    return; let s = v.trim().slice(0, 10); if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    s = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
} if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return; const t = new Date(s + 'T00:00:00Z'); return !Number.isNaN(+t) && t.toISOString().slice(0, 10) === s ? s : undefined; }
export function parseRows(rows: unknown[][], m: Mapping) {
    const headers = rows[0].map(String);
    const idx = Object.fromEntries(fields.map(f => [f, headers.indexOf(m[f])]));
    const out: Sale[] = [];
    const issues: Record<string, number> = {};
    const add = (s: string) => issues[s] = (issues[s] || 0) + 1;
    for (const row of rows.slice(1)) {
        if (row.every(x => x == null || x === ''))
            continue;
        const get = (f: string) => row[idx[f]];
        const p = get('product'), q = number(get('quantity')), d = date(get('date'));
        if (typeof p !== 'string' || !p.trim()) {
            add('Missing or non-text product (including date-typed labels)');
            continue;
        }
        if (q === undefined || !d) {
            add('Invalid quantity or date');
            continue;
        }
        const rec: Sale = { product: p.trim(), category: String(get('category') || 'Uncategorized'), quantity: q, unit: String(get('unit') || 'UNSPECIFIED'), date: d, location: String(get('location') ?? '') };
        for (const f of ['price', 'cost', 'inventory'] as const) {
            const raw = get(f);
            const n = number(raw);
            if (n !== undefined && n >= 0)
                rec[f] = n;
            else if (raw != null && raw !== '')
                add(`Invalid ${f}; treated as missing`);
        }
        if (q < 0)
            add('Negative quantities retained as net adjustments');
        out.push(rec);
    }
    return { sales: out, issues };
}
export function week(d: string) { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7); return t.toISOString().slice(0, 10); }
export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export function aggregate(s: Sale[], frequency = 'week') { const m = new Map<string, number>(); s.forEach(r => { const k = frequency === 'month' ? r.date.slice(0, 7) : week(r.date); m.set(k, (m.get(k) || 0) + r.quantity); }); return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([date, quantity]) => ({ date, quantity })); }
export function series(s: Sale[], start: string, end: string) { const a = new Map(aggregate(s).map(r => [r.date, r.quantity])); const out = []; for (let d = week(start); d <= end;) {
    out.push({ date: d, quantity: a.get(d) || 0 });
    const t = new Date(d + 'T00:00:00Z');
    t.setUTCDate(t.getUTCDate() + 7);
    d = t.toISOString().slice(0, 10);
} return out; }
export function scenario(base: number, price: number, cost: number | undefined, quantity: number, elasticity: number) { if (base <= 0 || price <= 0 || quantity < 0 || ![base, price, quantity, elasticity].every(Number.isFinite))
    throw Error('Enter positive prices and nonnegative quantity.'); const demand = quantity * Math.pow(price / base, elasticity); return { price, quantity: demand, revenue: price * demand, profit: cost === undefined ? undefined : (price - cost) * demand }; }
