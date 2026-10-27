import { describe, it, expect } from 'vitest';
import { parseRows, suggest, date, aggregate, scenario, type Sale, series } from './data';
import { forecast, fit } from './forecast';
describe('workbook validation', () => {
    it('maps actual headers, retains units and adjustments, rejects date-typed product names', () => { const h = ['Item Description', 'Date Invoiced', 'Quantity', 'SUOM', 'Zip']; const p = parseRows([h, ['Real product', new Date('2024-02-29T00:00Z'), 10, 'TON', 93280], ['Real product', '2024-03-01', -2, 'TON', 93280], [new Date(), new Date(), 4, 'TON', 93280], ['Other', '2024-02-30', 5, 'BAG', null]], suggest(h)); expect(p.sales).toHaveLength(2); expect(p.sales[0].unit).toBe('TON'); expect(p.sales[0].location).toBe('93280'); expect(p.sales[1].quantity).toBe(-2); expect(p.issues['Invalid quantity or date']).toBe(1); });
    it('handles Excel serial dates, leap days, ambiguous strings and blanks', () => { expect(date(45292)).toBe('2024-01-01'); expect(date('02/29/2024')).toBe('2024-02-29'); expect(date('2023-02-29')).toBeUndefined(); expect(date('junk')).toBeUndefined(); });
});
const sale = (d: string, q: number): Sale => ({ product: 'Test fixture', category: 'Test', quantity: q, unit: 'TON', date: d, location: '' });
describe('aggregation and pricing', () => {
    it('uses Monday weeks across year boundaries and calendar months', () => { const s = [sale('2023-12-31', 2), sale('2024-01-01', 3), sale('2024-01-07', 4)]; expect(aggregate(s)).toEqual([{ date: '2023-12-25', quantity: 2 }, { date: '2024-01-01', quantity: 7 }]); expect(aggregate(s, 'month')[1].quantity).toBe(7); expect(series(s, '2023-12-25', '2024-01-15')).toHaveLength(4); });
    it('calculates constant elasticity, revenue, profit and missing costs', () => { const r = scenario(10, 20, 4, 100, -1); expect(r.quantity).toBe(50); expect(r.revenue).toBe(1000); expect(r.profit).toBe(800); expect(scenario(10, 5, undefined, 100, 0).profit).toBeUndefined(); expect(() => scenario(0, 5, 2, 4, -1)).toThrow(); });
});
describe('forecast safety', () => {
    it('withholds estimates for sparse data and unresolved returns', () => { expect(forecast([sale('2024-01-01', 5)], [], [], '2024-01-01', '2024-01-07').reason).toContain('52'); expect(forecast([sale('2024-01-01', -5)], [], [], '2024-01-01', '2025-01-07').reason).toContain('negative'); });
    it('fits transparent linear coefficients', () => { const b = fit([[1, 1], [1, 2], [1, 3], [1, 4]], [3, 5, 7, 9])!; expect(b[1]).toBeCloseTo(2, 1); });
    it('validates chronologically and withholds future estimates when sales are stale', () => { const history = Array.from({ length: 560 }, (_, i) => { const t = new Date('2023-01-02T00:00Z'); t.setUTCDate(t.getUTCDate() + i); return { date: t.toISOString().slice(0, 10), high: 70 + Math.floor(i / 7) % 10, low: 50, rain: 0, wind: 3 }; }); const s = history.filter((_, i) => i % 7 === 0).map((d, i) => sale(d.date, 40 + i % 10)); const f = forecast(s, history, [{ ...history[0], date: '2026-10-20' }], '2023-01-02', history.at(-1)!.date); expect(f.reason).toBeUndefined(); expect(f.validation).toHaveLength(16); expect(f.estimate).toBeUndefined(); expect(f.explanation).toContain('28 days'); expect(f.validation![0].date > s[63].date).toBe(true); });
});
