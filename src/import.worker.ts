import * as XLSX from 'xlsx';
import { parseRows } from './data';
let workbook: XLSX.WorkBook | undefined;
self.onmessage = async (e) => { try {
    if (e.data.type === 'open') {
        workbook = XLSX.read(await e.data.file.arrayBuffer(), { type: 'array', cellDates: true });
        self.postMessage({ type: 'sheets', sheets: workbook.SheetNames });
    }
    else if (e.data.type === 'headers') {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook!.Sheets[e.data.sheet], { header: 1, defval: null, blankrows: false });
        self.postMessage({ type: 'headers', headers: (rows[0] || []).map(String), preview: rows.slice(1, 5) });
    }
    else if (e.data.type === 'parse') {
        const out = [];
        const issues: Record<string, number> = {};
        for (const sheet of e.data.sheets) {
            const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook!.Sheets[sheet], { header: 1, defval: null, blankrows: false });
            if (!Object.values(e.data.mapping).filter(Boolean).every(header => rows[0]?.includes(header)))
                throw Error(`Mapped columns missing in sheet ${sheet}. Select only sheets with the same headers, or prepare a combined workbook.`);
            const p = parseRows(rows, e.data.mapping);
            for (const sale of p.sales)
                out.push(sale);
            Object.entries(p.issues).forEach(([k, v]) => issues[k] = (issues[k] || 0) + v);
        }
        workbook = undefined;
        self.postMessage({ type: 'parsed', sales: out, issues });
    }
}
catch (err) {
    self.postMessage({ type: 'error', error: String(err) });
} };
