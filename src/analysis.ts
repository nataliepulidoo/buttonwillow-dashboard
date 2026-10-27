import { type Sale, series } from './data';
import type { Day } from './weather';

export function analysisReadiness(
  sales: Sale[],
  start: string,
  end: string,
  confirmed: boolean,
  complete: boolean,
  now = new Date(),
) {
  const validRange = !!start && !!end && start <= end;
  const weeks = validRange
    ? series(sales, start, end).filter(
        (w) =>
          w.date >= start &&
          Date.parse(w.date + 'T00:00:00Z') + 6 * 86400000 <=
            Date.parse(end + 'T00:00:00Z'),
      )
    : [];
  const negatives = sales.filter((s) => s.quantity < 0).length;
  const locations = new Set(sales.map((s) => s.location).filter(Boolean));
  const archiveEnd = new Date(now);
  archiveEnd.setUTCDate(archiveEnd.getUTCDate() - 5);
  const checks = [
    {
      label: 'Product history',
      ready: sales.length > 0,
      detail: sales.length
        ? `${sales.length.toLocaleString()} matching records`
        : 'Upload a workbook and choose a product.',
    },
    {
      label: 'Consistent quantity units',
      ready:
        sales.length > 0 &&
        sales.every(
          (s) => s.unit !== 'UNSPECIFIED' && s.unit === sales[0].unit,
        ),
      detail: 'Use a single known unit for the selected product.',
    },
    {
      label: 'Complete weekly span',
      ready: weeks.length >= 52,
      detail: `${weeks.length} complete calendar week${weeks.length === 1 ? '' : 's'}; at least 52 required.`,
    },
    {
      label: 'Sales activity',
      ready: weeks.filter((w) => w.quantity > 0).length >= 26,
      detail: 'At least 26 complete weeks with positive quantities required.',
    },
    {
      label: 'Unresolved adjustments',
      ready: negatives === 0,
      detail: negatives
        ? `${negatives.toLocaleString()} negative records. Reconcile returns upstream or choose a resolved date range.`
        : 'No negative quantities in the selected records.',
    },
    {
      label: 'One sales geography',
      ready: locations.size <= 1,
      detail:
        locations.size > 1
          ? `${locations.size} location values. Use the Sales ZIP / location filter to select one region.`
          : 'Geography still needs your confirmation below.',
    },
    {
      label: 'Archive date availability',
      ready: validRange && end <= archiveEnd.toISOString().slice(0, 10),
      detail: 'Choose a valid date range ending at least five days ago.',
    },
    {
      label: 'Location confirmed',
      ready: confirmed,
      detail:
        'Confirm that the selected sales correspond to the weather location.',
    },
    {
      label: 'Coverage confirmed',
      ready: complete,
      detail:
        'Confirm that weeks without records represent zero sales, rather than missing data.',
    },
  ];
  return {
    checks,
    canAnalyze: checks.every((c) => c.ready),
    weeks: weeks.length,
    negatives,
  };
}

export function weatherContext(days: Day[]) {
  if (days.length !== 7)
    return 'Upcoming weather is unavailable. Historical analysis can still run, but an upcoming weather-based estimate will be withheld.';
  const high = Math.max(...days.map((d) => d.high)),
    low = Math.min(...days.map((d) => d.low));
  const rain = days.reduce((n, d) => n + d.rain, 0),
    wind = Math.max(...days.map((d) => d.wind));
  const threshold =
    high >= 100
      ? ' Heat threshold (100°F) reached.'
      : low <= 32
        ? ' Freezing threshold (32°F) reached.'
        : '';
  return `Next 7 days: ${low.toFixed(0)}–${high.toFixed(0)}°F, ${rain.toFixed(2)} inches total precipitation, maximum wind ${wind.toFixed(0)} mph.${threshold} This describes the weather; product effects require historical validation.`;
}
