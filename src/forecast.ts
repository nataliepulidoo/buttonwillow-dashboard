import { type Sale, series, sum, week } from './data';
import { type Day } from './weather';
const mean = (a: number[]) => sum(a) / a.length;
export function fit(x: number[][], y: number[]) {
  const n = x[0].length;
  const a = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) =>
      j === n
        ? sum(x.map((r, k) => r[i] * y[k]))
        : sum(x.map((r) => r[i] * r[j])) + (i === j && i > 0 ? 0.01 : 0),
    ),
  );
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(a[k][i]) > Math.abs(a[p][i])) p = k;
    [a[i], a[p]] = [a[p], a[i]];
    if (Math.abs(a[i][i]) < 1e-10) return null;
    const v = a[i][i];
    for (let j = i; j <= n; j++) a[i][j] /= v;
    for (let k = 0; k < n; k++)
      if (k !== i) {
        const c = a[k][i];
        for (let j = i; j <= n; j++) a[k][j] -= c * a[i][j];
      }
  }
  return a.map((r) => r[n]);
}
const features = (d: Day[]) => [
  1,
  mean(d.map((v) => (v.high + v.low) / 2)) / 100,
  sum(d.map((v) => v.rain)),
];
const predict = (b: number[], x: number[]) =>
  Math.max(0, sum(b.map((v, i) => v * x[i])));
export function forecast(
  s: Sale[],
  history: Day[],
  future: Day[],
  start: string,
  end: string,
) {
  const fail = (reason: string) => ({
    reason,
    mae: undefined,
    baselineMae: undefined,
    baseline: undefined,
    estimate: undefined,
    low: undefined,
    high: undefined,
    validation: undefined,
    weeks: undefined,
    explanation: undefined,
  });
  if (!s.length) return fail('No matching sales.');
  if (s.some((r) => r.quantity < 0))
    return fail('Resolve negative quantities before modeling demand.');
  const weather = new Map<string, Day[]>();
  history
    .filter((d) =>
      [d.high, d.low, d.rain].every((v) => v !== null && Number.isFinite(v)),
    )
    .forEach((d) => {
      const w = week(d.date);
      weather.set(w, [...(weather.get(w) || []), d]);
    });
  const weeks = series(s, start, end).filter(
    (w) =>
      w.date >= start &&
      new Date(w.date + 'T00:00:00Z').getTime() + 6 * 86400000 <=
        new Date(end + 'T00:00:00Z').getTime(),
  );
  if (weeks.length < 52)
    return fail('At least 52 complete weeks are required.');
  const joined = weeks.map((w) => ({ ...w, days: weather.get(w.date) || [] }));
  if (joined.some((w) => w.days.length !== 7))
    return fail('Historical weather has missing days.');
  const x = joined.map((w) => features(w.days)),
    y = joined.map((w) => w.quantity);
  if (y.filter((v) => v > 0).length < 26)
    return fail('At least 26 weeks with positive sales are required.');
  const cut = Math.floor(y.length * 0.8),
    b = fit(x.slice(0, cut), y.slice(0, cut));
  if (!b) return fail('Weather model could not be fitted.');
  const errors = y
    .slice(cut)
    .map((v, i) => Math.abs(v - predict(b, x[cut + i])));
  const mae = mean(errors),
    baselineMae = mean(
      y
        .slice(cut)
        .map((v, i) =>
          Math.abs(v - mean(y.slice(Math.max(0, cut + i - 8), cut + i))),
        ),
    );
  const all = fit(x, y)!;
  const baseline = mean(y.slice(-8));
  const validation = joined.slice(cut).map((w, i) => ({
    date: w.date,
    actual: w.quantity,
    weather: predict(b, x[cut + i]),
    baseline: mean(y.slice(Math.max(0, cut + i - 8), cut + i)),
  }));
  const stale =
    future.length > 0 &&
    new Date(future[0].date + 'T00:00:00Z').getTime() -
      new Date(end + 'T00:00:00Z').getTime() >
      28 * 86400000;
  const validFuture =
    future.length === 7 &&
    future.every((d) =>
      [d.high, d.low, d.rain].every((v) => v !== null && Number.isFinite(v)),
    );
  const outside =
    validFuture &&
    features(future).some(
      (v, i) =>
        i > 0 &&
        (v < Math.min(...x.map((r) => r[i])) ||
          v > Math.max(...x.map((r) => r[i]))),
    );
  const supported = mae < baselineMae && !stale && validFuture && !outside;
  const estimate = supported ? predict(all, features(future)) : undefined;
  const radius = 2 * mae;
  return {
    reason: undefined,
    mae,
    baselineMae,
    baseline,
    estimate,
    low: estimate === undefined ? undefined : Math.max(0, estimate - radius),
    high: estimate === undefined ? undefined : estimate + radius,
    validation,
    weeks: y.length,
    explanation: stale
      ? 'Sales are over 28 days older than the upcoming forecast.'
      : !validFuture
        ? 'Upcoming weather is unavailable.'
        : outside
          ? 'Upcoming weather is outside the historical training range.'
          : mae >= baselineMae
            ? 'Weather model did not improve on the historical baseline.'
            : 'Exploratory weather estimate; association does not establish causation.',
  };
}
