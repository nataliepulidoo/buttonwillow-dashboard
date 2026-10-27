export type Place = {
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
};
export const places: Place[] = [{ name: 'Buttonwillow', latitude: 35.4005, longitude: -119.4696 }, { name: 'Bakersfield', latitude: 35.3733, longitude: -119.0187 }, { name: 'Fresno', latitude: 36.7378, longitude: -119.7871 }, { name: 'Salinas', latitude: 36.6777, longitude: -121.6555 }];
export type Day = {
    date: string;
    high: number;
    low: number;
    rain: number;
    probability?: number;
    wind: number;
};
async function json(url: string, signal?: AbortSignal) { const r = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) }); if (!r.ok)
    throw Error(`Weather service returned ${r.status}. Try again later.`); const j = await r.json(); if (j.error)
    throw Error(j.reason); return j; }
export async function search(q: string): Promise<Place[]> { const j = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en`); return j.results || []; }
export async function weather(p: Place, start?: string, end?: string, signal?: AbortSignal): Promise<Day[]> { const historical = !!start; const url = new URL(historical ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast'); url.search = new URLSearchParams({ latitude: String(p.latitude), longitude: String(p.longitude), daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max' + (historical ? '' : ',precipitation_probability_max'), temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: 'auto', ...(historical ? { start_date: start!, end_date: end! } : { forecast_days: '7' }) }).toString(); const j = await json(url.href, signal); const d = j.daily; if (!d?.time?.length)
    throw Error('No weather observations returned.');
    const required = ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max', ...(historical ? [] : ['precipitation_probability_max'])];
    if (required.some(field => !Array.isArray(d[field]) || d[field].length !== d.time.length || d[field].some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v))))
        throw Error('Weather service returned missing measurements. No values have been substituted. Try a different date range or refresh later.');
    return d.time.map((date: string, i: number) => ({ date, high: d.temperature_2m_max[i], low: d.temperature_2m_min[i], rain: d.precipitation_sum[i], wind: d.wind_speed_10m_max[i], probability: d.precipitation_probability_max?.[i] })); }
