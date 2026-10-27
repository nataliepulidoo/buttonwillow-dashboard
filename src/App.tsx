import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  CloudSun,
  TrendingUp,
  SlidersHorizontal,
  Database,
  Upload,
  ArrowUpRight,
  Leaf,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Info,
  Search,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  type Sale,
  type Mapping,
  suggest,
  fields,
  aggregate,
  sum,
  scenario,
  series,
} from "./data";
import { places, weather, search, type Place, type Day } from "./weather";
import { forecast } from "./forecast";
import { analysisReadiness, weatherContext } from "./analysis";
import { demonstrationSales, DEMO_NAME, DEMO_START, DEMO_END } from "./demo";
const nav = [
  ["Overview", LayoutDashboard],
  ["Sales & Product Performance", ChartNoAxesCombined],
  ["Weather Intelligence", CloudSun],
  ["Product Demand Forecast", TrendingUp],
  ["Pricing & Revenue Simulator", SlidersHorizontal],
  ["Data & Methodology", Database],
] as const;
const fmt = (n: number | undefined) =>
  n === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
const dollars = (n: number | undefined) =>
  n === undefined
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
function Panel({
  title,
  caption,
  children,
  action,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-eyebrow">
        {title === "Sales & Product Performance"
          ? "02 / PRODUCT DETAILS"
          : title === "Pricing & Revenue Simulator"
            ? "PRICING SCENARIOS"
            : title === "Weather Intelligence"
              ? "03 / PUBLIC WEATHER"
              : "SALES INTELLIGENCE"}
      </div>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {caption && <p>{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function TrendChart({
  data,
}: {
  data: {
    date: string;
    quantity: number;
  }[];
}) {
  return data.length ? (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4c9175" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4c9175" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 4"
            vertical={false}
            stroke="#e7ebe7"
          />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={45} />
          <YAxis
            tick={{ fontSize: 11 }}
            width={65}
            tickFormatter={(v) => fmt(v)}
          />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Area
            type="monotone"
            dataKey="quantity"
            stroke="#357459"
            strokeWidth={2.5}
            fill="url(#green)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="empty">
      <ChartNoAxesCombined size={32} />
      <h3>Your sales story starts here</h3>
      <p>Import your workbook to explore actual product performance.</p>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState(0),
    [sales, setSales] = useState<Sale[]>(demonstrationSales),
    [fileName, setFileName] = useState(DEMO_NAME),
    [issues, setIssues] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [dataSource, setDataSource] = useState<"demo" | "upload" | "none">(
    "demo",
  );
  const [sheets, setSheets] = useState<string[]>([]),
    [selectedSheets, setSelectedSheets] = useState<string[]>([]),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Mapping>({});
  const worker = useRef<Worker | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [unit, setUnit] = useState("GALLON"),
    [product, setProduct] = useState(""),
    [category, setCategory] = useState(""),
    [zip, setZip] = useState(""),
    [start, setStart] = useState(DEMO_START),
    [end, setEnd] = useState(DEMO_END),
    [frequency, setFrequency] = useState("week");
  const [place, setPlace] = useState<Place>(places[0]),
    [days, setDays] = useState<Day[]>([]),
    [weatherError, setWeatherError] = useState(""),
    [updated, setUpdated] = useState(""),
    [weatherBusy, setWeatherBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Place[]>([]),
    [searchError, setSearchError] = useState("");
  const [history, setHistory] = useState<Day[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [complete, setComplete] = useState(false),
    [modelError, setModelError] = useState(""),
    [modelBusy, setModelBusy] = useState(false);
  const modelGeneration = useRef(0);
  const [base, setBase] = useState(""),
    [cost, setCost] = useState(""),
    [qty, setQty] = useState(""),
    [adjust, setAdjust] = useState(0),
    [elasticity, setElasticity] = useState(-1),
    [elasticEnabled, setElasticEnabled] = useState(false),
    [opportunityQuery, setOpportunityQuery] = useState("");
  useEffect(() => () => worker.current?.terminate(), []);


  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setDays([]);
    setUpdated("");
    setWeatherError("");
    setWeatherBusy(true);
    weather(place, undefined, undefined, controller.signal)
      .then((d) => {
        if (active) {
          setDays(d);
          setUpdated(new Date().toLocaleString());
        }
      })
      .catch((e) => {
        if (active) setWeatherError(String(e));
      })
      .finally(() => {
        if (active) setWeatherBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [place, refresh]);
  useEffect(() => {
    modelGeneration.current++;
    setHistory([]);
    setConfirmed(false);
    setModelError("");
    setModelBusy(false);
  }, [place, sales, zip, start, end, unit, category]);
  function upload(file: File) {
    worker.current?.terminate();
    const w = new Worker(new URL("./import.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    setBusy("Reading workbook in a background worker…");
    setError("");
    setHeaders([]);
    setSheets([]);
    w.onerror = () => {
      setError(
        "The workbook could not be read. Try a smaller workbook or another browser.",
      );
      setBusy("");
    };
    w.onmessage = (e) => {
      const m = e.data;
      setBusy("");
      if (m.type === "error") setError(m.error);
      if (m.type === "sheets") {
        setSheets(m.sheets);
        setSelectedSheets([m.sheets[0]]);
        setBusy("Detecting columns…");
        w.postMessage({ type: "headers", sheet: m.sheets[0] });
      }
      if (m.type === "headers") {
        setHeaders(m.headers);
        setMapping(suggest(m.headers));
      }
      if (m.type === "parsed") {
        setDataSource("upload");
        setFileName(file.name);
        setSales(m.sales);
        setIssues(m.issues);
        setSheets([]);
        const units = [
          ...new Set<string>(m.sales.map((r: Sale) => r.unit)),
        ].sort();
        setUnit(units.includes("GALLON") ? "GALLON" : units[0] || "");
        setProduct("");
        setCategory("");
        setZip("");
        const dates = m.sales.map((r: Sale) => r.date).sort();
        setStart(dates[0] || "");
        setEnd(dates.at(-1) || "");
        setPage(0);
        w.terminate();
      }
    };
    w.postMessage({ type: "open", file });
  }
  const units = useMemo(
    () => [...new Set(sales.map((r) => r.unit))].sort(),
    [sales],
  );
  const categories = useMemo(
    () => [...new Set(sales.map((r) => r.category))].sort(),
    [sales],
  );
  const zips = useMemo(
    () => [...new Set(sales.map((r) => r.location))].filter(Boolean).sort(),
    [sales],
  );
  const scoped = useMemo(
    () =>
      sales.filter(
        (r) =>
          (!unit || r.unit === unit) &&
          (!category || r.category === category) &&
          (!zip || r.location === zip) &&
          (!start || r.date >= start) &&
          (!end || r.date <= end),
      ),
    [sales, unit, category, zip, start, end],
  );
  const products = useMemo(
    () => [...new Set(scoped.map((r) => r.product))].sort(),
    [scoped],
  );
  const filtered = useMemo(
    () => scoped.filter((r) => !product || r.product === product),
    [scoped, product],
  );
  const total = sum(filtered.map((r) => r.quantity));
  const chart = useMemo(
    () => aggregate(filtered, frequency),
    [filtered, frequency],
  );
  const ranking = useMemo(() => {
    const m = new Map<string, Sale[]>();
    scoped.forEach((r) => {
      const a = m.get(r.product);
      if (a) a.push(r);
      else m.set(r.product, [r]);
    });
    return [...m]
      .map(([name, rows]) => {
        const weekly = series(rows, start, end);
        const cutoff = weekly.length >= 9 ? weekly.slice(1, -1) : [];
        const recent = sum(cutoff.slice(-4).map((r) => r.quantity)),
          prior = sum(cutoff.slice(-8, -4).map((r) => r.quantity));
        return {
          name,
          rows,
          quantity: sum(rows.map((r) => r.quantity)),
          change:
            cutoff.length >= 8 && prior > 0
              ? (recent / prior - 1) * 100
              : undefined,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);
  }, [scoped, start, end]);
  const selected = product || ranking[0]?.name || "";
  const selectedSales = useMemo(
    () => scoped.filter((r) => r.product === selected),
    [scoped, selected],
  );
  const model = useMemo<ReturnType<typeof forecast>>(
    () =>
      history.length && confirmed && complete
        ? forecast(selectedSales, history, days, start, end)
        : forecast([], [], [], start, end),
    [selectedSales, history, confirmed, complete, days, start, end],
  );
  const readiness = useMemo(
    () => analysisReadiness(selectedSales, start, end, confirmed, complete),
    [selectedSales, start, end, confirmed, complete],
  );
  const selectedTrend = ranking.find((r) => r.name === selected)?.change;
  useEffect(() => {
    const last = selectedSales
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    setBase(last?.price === undefined ? "" : String(last.price));
    setCost(last?.cost === undefined ? "" : String(last.cost));
    setQty("");
    setAdjust(0);
  }, [selectedSales]);
  const pricing = useMemo(() => {
    try {
      if (!base || !qty) return [];
      const p = Number(base),
        q = Number(qty),
        c = cost === "" ? undefined : Number(cost);
      if (
        !Number.isFinite(q) ||
        q < 0 ||
        (c !== undefined && (!Number.isFinite(c) || c < 0))
      )
        return [];
      return [
        { name: "Lower price", factor: 0.9 },
        { name: "Current price", factor: 1 },
        { name: "Higher price", factor: 1.1 },
        { name: "Your proposal", factor: 1 + adjust / 100 },
      ].map((s) => ({
        name: s.name,
        ...scenario(p, p * s.factor, c, q, elasticEnabled ? elasticity : 0),
      }));
    } catch {
      return [];
    }
  }, [base, qty, cost, adjust, elasticity, elasticEnabled]);
  async function loadHistory() {
    if (!readiness.canAnalyze) {
      setModelError(
        "Complete the readiness checks before running weather analysis.",
      );
      return;
    }
    const gen = ++modelGeneration.current;
    setModelBusy(true);
    setModelError("");
    try {
      const last = new Date();
      last.setUTCDate(last.getUTCDate() - 5);
      if (
        !start ||
        !end ||
        start > end ||
        end > last.toISOString().slice(0, 10)
      )
        throw Error(
          "Choose a valid sales range ending at least five days ago for archive availability.",
        );
      const d = await weather(place, start, end);
      if (gen === modelGeneration.current) setHistory(d);
    } catch (e) {
      if (gen === modelGeneration.current) setModelError(String(e));
    } finally {
      if (gen === modelGeneration.current) setModelBusy(false);
    }
  }
  function exportSummary() {
    const rows = [
      ["Product", "Unit", "Net historical quantity", "Change percent"],
      ...ranking.map((r) => [r.name, unit, r.quantity, r.change ?? ""]),
    ];
    const text = rows
      .map((r) =>
        r
          .map(
            (c) =>
              '"' +
              String(c)
                .replace(/"/g, '""')
                .replace(/^[=+@-]/, "'$&") +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "buttonwillow-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const hasData = sales.length > 0;
  const weatherContent = (
    <>
      <div className="weather-tools">
        <div className="location">
          <MapPin size={18} />
          <select
            aria-label="Weather location"
            value={places.indexOf(place)}
            onChange={(e) => setPlace(places[Number(e.target.value)])}
          >
            {!places.includes(place) && (
              <option value={-1}>{place.name}</option>
            )}
            {places.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}, California
              </option>
            ))}
          </select>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSearchError("Searching…");
            try {
              const r = await search(query);
              setResults(r);
              setSearchError(r.length ? "" : "No locations found.");
            } catch (e) {
              setSearchError(String(e));
            }
          }}
        >
          <input
            aria-label="Search weather location"
            placeholder="Search city or ZIP code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            minLength={2}
          />
          <button aria-label="Search">
            <Search size={16} />
          </button>
        </form>
        <button
          onClick={() => setRefresh((x) => x + 1)}
          aria-label="Refresh weather"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {searchError && <p role="status">{searchError}</p>}
      {results.length > 0 && (
        <div className="search-results">
          {results.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setPlace(p);
                setResults([]);
              }}
            >
              {p.name}, {p.admin1} ({p.latitude.toFixed(2)},{" "}
              {p.longitude.toFixed(2)})
            </button>
          ))}
        </div>
      )}
      {weatherBusy ? (
        <div className="empty">Loading real forecast…</div>
      ) : weatherError ? (
        <div className="notice error" role="alert">
          Weather unavailable. {weatherError}
        </div>
      ) : (
        <div className="weather-days">
          {days.map((d) => (
            <div className="weather-day" key={d.date}>
              <span>
                {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                })}
              </span>
              <small>{d.date.slice(5)}</small>
              <CloudSun size={29} />
              <strong>
                {fmt(d.high)}° <em>{fmt(d.low)}°</em>
              </strong>
              <small>{fmt(d.probability)}% rain</small>
              <small>
                {fmt(d.rain)} in · {fmt(d.wind)} mph
              </small>
              {d.high !== null && d.high >= 100 && (
                <b className="warm">Heat ≥100°F</b>
              )}
              {d.low !== null && d.low <= 32 && <b>Freeze ≤32°F</b>}
            </div>
          ))}
        </div>
      )}
      <p className="footnote">
        {updated ? `Retrieved ${updated} · ` : ""}°F · inches · maximum wind in
        mph. Threshold indicators are advisory; official weather alerts are not
        integrated.{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Weather by Open-Meteo
        </a>
      </p>
    </>
  );
  return (
    <div className="sales-intelligence">
      <div className="app">
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0]);
            e.target.value = "";
          }}
        />

        <header className="brandbar">
          <div className="brandbar-inner">
            <button
              className="brand"
              onClick={() => setPage(0)}
              aria-label="Buttonwillow overview"
            >
              <Leaf size={26} strokeWidth={1.8} />
              <span>
                BUTTONWILLOW
                <small>WAREHOUSE COMPANY · SALES INTELLIGENCE</small>
              </span>
            </button>
            <div className="header-actions">
              <button
                className="primary import-button"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} /> Import Excel
              </button>
              <span className="badge">
                {hasData
                  ? dataSource === "demo"
                    ? "Fictional demonstration sales"
                    : "Imported sales · browser only"
                  : "Your data, your decisions"}
              </span>
            </div>
          </div>
        </header>
        <div className="main">
          <main>
            <div className="page-title">
              <div>
                <div className="eyebrow">
                  WEATHER CONTEXT. PRODUCT PLANNING.
                </div>
                <h1>Buttonwillow — Agricultural Product Demand Dashboard</h1>
                <p>
                  Explore weather conditions, historical product sales, and
                  pricing scenarios to support your next business decision.
                </p>
              </div>
            </div>

            {dataSource === "demo" && (
              <div
                className="notice"
                role="note"
                aria-label="Demonstration sales data"
              >
                <strong>
                  Demonstration data — not actual Buttonwillow sales.
                </strong>{" "}
                Product names and quantities are fictional. Live weather is
                requested separately. Shared company data is not connected. Only
                import data you are authorized to use; imports stay in your tab
                and are not shared with teammates.
              </div>
            )}
            <div className="upload-actions">
              <button
                className="primary upload-data-button"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={17} /> Upload data
              </button>
              <details className="upload-help">
                <summary aria-label="About uploading data">
                  <Info size={18} />
                </summary>
                <div className="upload-help-content">
                  <strong>Upload an Excel workbook</strong>
                  <p>
                    Choose an .xlsx or .xls file. Required columns: product,
                    invoice date, and quantity. You can review and map the
                    columns before importing.
                  </p>
                  <p>
                    Manual uploads stay in this browser tab and are cleared on
                    reload. No spreadsheet is uploaded to a public server.
                  </p>
                </div>
              </details>
              <span className="upload-hint">
                Excel .xlsx / .xls · choose your workbook
              </span>
            </div>
            <nav
              className="section-tabs"
              aria-label="Sales intelligence sections"
            >
              {nav.map(([label], i) => (
                <button
                  key={label}
                  aria-label={label}
                  aria-current={page === i ? "page" : undefined}
                  className={page === i ? "active" : ""}
                  onClick={() => setPage(i)}
                >
                  {
                    [
                      "Overview",
                      "Product Details",
                      "Weather Forecast",
                      "Product Demand Predictions",
                      "Pricing Simulator",
                      "Data & Methodology",
                    ][i]
                  }
                </button>
              ))}
            </nav>
            {busy && (
              <div className="notice" role="status">
                {busy} Large workbooks may take a minute.
              </div>
            )}
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {sheets.length > 0 && headers.length > 0 && (
              <Panel
                title="Review your Excel import"
                caption="Select sheets with the same headers. Required: product, invoice date, quantity."
              >
                <div className="sheet-list">
                  {sheets.map((s) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        checked={selectedSheets.includes(s)}
                        onChange={(e) =>
                          setSelectedSheets((v) =>
                            e.target.checked
                              ? [...v, s]
                              : v.filter((x) => x !== s),
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <div className="mapping">
                  {fields.map((f) => (
                    <label key={f}>
                      {f}
                      {["product", "date", "quantity"].includes(f) ? " *" : ""}
                      <select
                        value={mapping[f] || ""}
                        onChange={(e) =>
                          setMapping((v) => ({ ...v, [f]: e.target.value }))
                        }
                      >
                        <option value="">Not provided</option>
                        {headers.map((h) => (
                          <option key={h}>{h}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="footnote">
                  Detected headers: {headers.join(" · ")}. Only mapped fields
                  are retained. Multiple sheets are appended without
                  deduplication; select disjoint records.
                </p>
                <button
                  className="primary"
                  disabled={
                    !!busy ||
                    !selectedSheets.length ||
                    !["product", "date", "quantity"].every((f) => mapping[f]) ||
                    new Set(Object.values(mapping).filter(Boolean)).size !==
                      Object.values(mapping).filter(Boolean).length
                  }
                  onClick={() => {
                    setBusy("Validating and importing sales records…");
                    worker.current?.postMessage({
                      type: "parse",
                      sheets: selectedSheets,
                      mapping,
                    });
                  }}
                >
                  Validate & import <ArrowRight size={16} />
                </button>
              </Panel>
            )}
            {page !== 2 && page !== 5 && (
              <div className="filters">
                <SlidersHorizontal size={17} />
                <label>
                  Unit
                  <select
                    aria-label="Quantity unit"
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      setProduct("");
                    }}
                  >
                    {!units.length && <option>No data</option>}
                    {units.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setProduct("");
                    }}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Product
                  <select
                    aria-label="Product"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  >
                    <option value="">All products</option>
                    {products.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  From
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label>
                  Sales ZIP / location
                  <select
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value);
                      setProduct("");
                    }}
                  >
                    <option value="">All locations</option>
                    {zips.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {start > end && (
              <div className="notice error">
                The start date must be before the end date.
              </div>
            )}
            {!hasData && !busy && page !== 2 && (
              <div className="welcome">
                <div className="welcome-icon">
                  <Database size={24} />
                </div>
                <div>
                  <strong>Bring your sales into focus</strong>
                  <p>
                    Import your sales workbook to see real products and
                    performance. Your workbook stays in this browser tab.
                  </p>
                </div>
                <button onClick={() => fileInput.current?.click()}>
                  Choose workbook <ArrowRight size={16} />
                </button>
              </div>
            )}

            {page === 0 && hasData && (
              <div className="analysis-callout" role="status">
                <CheckCircle2 size={24} />
                <div>
                  <strong>
                    {dataSource === "demo"
                      ? "Fictional sales are ready to explore"
                      : "Your sales data is ready for analysis"}
                  </strong>
                  <p>
                    {sales.length.toLocaleString()} valid records from{" "}
                    {fileName}. Next, confirm the sales location and check
                    whether weather improves the demand estimate.
                  </p>
                </div>
                <button className="primary" onClick={() => setPage(3)}>
                  Analyze weather & demand <ArrowRight size={16} />
                </button>
              </div>
            )}
            {page === 0 && (
              <section className="panel prediction-workspace">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">
                      01 / PRODUCT DEMAND PREDICTIONS
                    </div>
                    <h2>Weather-Based Product Predictions</h2>
                    <p>
                      Explore potential demand using your sales history and
                      public weather.
                    </p>
                  </div>
                  <span className="badge">
                    {hasData
                      ? dataSource === "demo"
                        ? "Fictional demonstration history"
                        : "Imported history · source unverified"
                      : "Awaiting your workbook"}
                  </span>
                </div>
                <div className="prediction-controls">
                  <label>
                    1. Select a weather location
                    <select
                      aria-label="Prediction weather location"
                      value={places.indexOf(place)}
                      onChange={(e) => setPlace(places[Number(e.target.value)])}
                    >
                      {!places.includes(place) && (
                        <option value={-1}>{place.name}</option>
                      )}
                      {places.map((p, i) => (
                        <option value={i} key={p.name}>
                          {p.name}, California
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    2. Select a product
                    <select
                      aria-label="Prediction product"
                      value={selected}
                      onChange={(e) => setProduct(e.target.value)}
                    >
                      {!ranking.length && (
                        <option value="">
                          Import Excel to choose a real product
                        </option>
                      )}
                      {ranking.map((r) => (
                        <option key={r.name}>
                          {r.name} — {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="forecast-strip">
                  <CloudSun size={25} />
                  <div>
                    <b>3. Upcoming weather · {place.name}</b>
                    <p>
                      {weatherBusy
                        ? "Retrieving the public weather forecast…"
                        : weatherError
                          ? "Forecast unavailable. Open Weather Forecast to retry or review the service error."
                          : days
                              .slice(0, 3)
                              .map(
                                (d) =>
                                  new Date(
                                    d.date + "T12:00:00",
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  }) +
                                  ": " +
                                  fmt(d.high) +
                                  "°F high, " +
                                  fmt(d.probability) +
                                  "% rain chance",
                              )
                              .join(" · ")}
                    </p>
                    <small>
                      Public forecast · Rain chance is not rainfall amount.
                      Weather location does not automatically reassign sales.
                    </small>
                  </div>
                  <button
                    aria-label="Refresh prediction weather"
                    onClick={() => setRefresh((v) => v + 1)}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="prediction-grid">
                  <div className="prediction-explore">
                    <h3>4. Explore the product history</h3>
                    <p>
                      Review the selected product’s actual quantities, then test
                      whether historical weather adds useful forecasting
                      evidence.
                    </p>
                    <dl className="product-facts">
                      <div>
                        <dt>Selected product</dt>
                        <dd>{selected || "No workbook imported"}</dd>
                      </div>
                      <div>
                        <dt>Historical net quantity</dt>
                        <dd>
                          {hasData
                            ? fmt(sum(selectedSales.map((r) => r.quantity)))
                            : "—"}{" "}
                          {unit}
                        </dd>
                      </div>
                      <div>
                        <dt>Selected sales period</dt>
                        <dd>
                          {start && end
                            ? start + " – " + end
                            : "Awaiting invoice dates"}
                        </dd>
                      </div>
                    </dl>
                    <button className="primary" onClick={() => setPage(3)}>
                      <TrendingUp size={16} /> Review demand evidence
                    </button>
                    <button className="text-button" onClick={() => setPage(4)}>
                      Explore pricing scenarios <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="prediction-result">
                    <h3>5. Estimated weekly product quantity</h3>
                    <p>
                      {selected || "Choose a product"}
                      {unit ? " · " + unit : ""}
                    </p>
                    {model.estimate !== undefined ? (
                      <>
                        <strong>
                          {fmt(model.estimate)} <small>{unit}</small>
                        </strong>
                        <p>
                          {fmt(model.low)}–{fmt(model.high)} exploratory error
                          band
                        </p>
                      </>
                    ) : (
                      <>
                        <strong className="pending-estimate">
                          Insufficient data for reliable forecast.
                        </strong>
                        <p>
                          Confirm sales geography and complete coverage, then
                          compare the weather model against the historical
                          baseline.
                        </p>
                      </>
                    )}
                    <div className="result-note">
                      Exploratory estimates require supporting data and
                      validation. Historical sales quantities are not demand
                      predictions.
                    </div>
                  </div>
                </div>
                <details className="calculation-details">
                  <summary>6. Understand the calculation</summary>
                  <p>
                    The demand workspace matches complete sales weeks with
                    historical weather and uses chronological validation.
                    Upcoming estimates appear only when the model improves on a
                    trailing historical baseline and passes the data-sufficiency
                    checks. Pricing scenarios use explicitly entered price,
                    quantity, and elasticity assumptions.
                  </p>
                </details>
              </section>
            )}
            {(page === 0 || page === 1) && (
              <>
                <div className="kpis">
                  <div className="kpi">
                    <span>
                      NET QUANTITY SOLD <ChartNoAxesCombined size={17} />
                    </span>
                    <strong>
                      {hasData ? fmt(total) : "—"}{" "}
                      <small>{unit.toLowerCase()}</small>
                    </strong>
                    <p>
                      {dataSource === "demo"
                        ? "Fictional demonstration quantities"
                        : "Imported quantities, including adjustments"}
                    </p>
                  </div>
                  <div className="kpi">
                    <span>
                      PRODUCTS IN VIEW <Leaf size={17} />
                    </span>
                    <strong>
                      {hasData
                        ? fmt(new Set(filtered.map((r) => r.product)).size)
                        : "—"}
                    </strong>
                    <p>Within selected filters and unit</p>
                  </div>
                  <div className="kpi">
                    <span>
                      SALES RECORDS <Database size={17} />
                    </span>
                    <strong>{hasData ? fmt(filtered.length) : "—"}</strong>
                    <p>
                      {hasData
                        ? "Validated imported records"
                        : "Waiting for your Excel workbook"}
                    </p>
                  </div>
                  <div className="kpi">
                    <span>
                      WEATHER OUTLOOK <CloudSun size={17} />
                    </span>
                    <strong>
                      {days.length
                        ? `${fmt(Math.max(...days.map((d) => d.high).filter((v) => v !== null)))}°F`
                        : "—"}
                    </strong>
                    <p>{place.name} · highest in next 7 days</p>
                  </div>
                </div>
                <div className="overview-grid">
                  <Panel
                    title="Sales & Product Performance"
                    caption={`Net quantity · ${unit || "select a unit"} · ${frequency === "week" ? "weekly" : "monthly"} invoice totals`}
                    action={
                      <select
                        aria-label="Aggregation"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                      >
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                      </select>
                    }
                  >
                    <TrendChart data={chart} />
                    <div className="chart-footer">
                      <span className="legend-dot" /> Historical net quantities{" "}
                      <span>Gaps in records are not assumed to be zero.</span>
                    </div>
                  </Panel>
                  <Panel
                    title="Highest-volume products"
                    caption={`Ranked within ${unit || "the selected unit"}`}
                    action={
                      <button
                        className="icon-button"
                        disabled={!hasData}
                        onClick={exportSummary}
                        aria-label="Export product summary"
                      >
                        <Download size={17} />
                      </button>
                    }
                  >
                    {ranking.length ? (
                      <div className="ranking">
                        {ranking.slice(0, 5).map((r, i) => (
                          <button
                            key={r.name}
                            onClick={() => {
                              setProduct(r.name);
                              setPage(1);
                            }}
                          >
                            <span className="rank">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <strong>{r.name}</strong>
                              <div className="rank-track">
                                <span
                                  style={{
                                    width: `${Math.max(0, (r.quantity / (ranking[0].quantity || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <b>{fmt(r.quantity)}</b>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">
                        <Leaf size={30} />
                        <p>
                          Your actual top products will appear after import.
                        </p>
                      </div>
                    )}
                    <p className="footnote">
                      Quantities are never presented as dollar revenue.
                    </p>
                  </Panel>
                </div>
              </>
            )}

            {page === 2 && (
              <Panel
                title="Weather Intelligence"
                caption={place.name + " · 7-day forecast"}
                action={
                  <span className="badge">
                    {days.length ? "PUBLIC FORECAST" : "AWAITING SERVICE"}
                  </span>
                }
              >
                {weatherContent}
              </Panel>
            )}
            {page === 0 && (
              <div className="weather-disclosures">
                <details className="panel weather-disclosure">
                  <summary>
                    <div>
                      <span className="eyebrow">03 / PUBLIC WEATHER</span>
                      <h2>Weather Forecast</h2>
                      <p>
                        Upcoming temperatures, rainfall probability,
                        precipitation, and wind
                      </p>
                    </div>
                    <span>Expand / collapse</span>
                  </summary>
                  <div className="disclosure-body">{weatherContent}</div>
                </details>
                <details className="panel weather-disclosure">
                  <summary>
                    <div>
                      <span className="eyebrow">04 / WEATHER CONTEXT</span>
                      <h2>Historical Weather</h2>
                      <p>
                        Match public historical weather to verified sales dates
                        and geography
                      </p>
                    </div>
                    <span>Expand / collapse</span>
                  </summary>
                  <div className="disclosure-body">
                    <p>
                      Historical weather matching requires a confirmed sales
                      location and a complete extract. Explore the existing
                      demand workspace to retrieve reanalysis weather and review
                      chronological validation.
                    </p>
                    <button className="primary" onClick={() => setPage(3)}>
                      Open historical weather analysis <ArrowRight size={15} />
                    </button>
                  </div>
                </details>
              </div>
            )}
            {(page === 0 || page === 1 || page === 3) && (
              <Panel
                title="Recommended Products to Focus On"
                caption="Historical momentum is a review signal. Weather recommendations require a supported model."
                action={
                  <input
                    aria-label="Filter opportunities"
                    placeholder="Filter products…"
                    value={opportunityQuery}
                    onChange={(e) => setOpportunityQuery(e.target.value)}
                  />
                }
              >
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product / {unit || "unit"}</th>
                        <th>Historical net quantity</th>
                        <th>Recent change</th>
                        <th>Forecast / confidence</th>
                        <th>Weather evidence</th>
                        <th>Suggested business action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking
                        .filter(
                          (r) =>
                            (!product || r.name === product) &&
                            r.name
                              .toLowerCase()
                              .includes(opportunityQuery.toLowerCase()),
                        )
                        .slice(0, 50)
                        .map((r) => {
                          const supported =
                            r.name === selected && model.estimate !== undefined;
                          return (
                            <tr key={r.name}>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => {
                                    setProduct(r.name);
                                    setPage(4);
                                  }}
                                >
                                  {r.name} <ArrowUpRight size={12} />
                                </button>
                              </td>
                              <td>{fmt(r.quantity)}</td>
                              <td>
                                <span
                                  className={
                                    r.change !== undefined && r.change > 0
                                      ? "positive"
                                      : "muted"
                                  }
                                >
                                  {r.change === undefined
                                    ? "Insufficient periods"
                                    : `${r.change > 0 ? "+" : ""}${fmt(r.change)}%`}
                                </span>
                              </td>
                              <td>
                                {supported
                                  ? `${fmt(model.estimate)} · exploratory`
                                  : "Not available · insufficient evidence"}
                              </td>
                              <td>
                                {supported
                                  ? `${place.name}: temperature & precipitation model`
                                  : "No supported weather signal"}
                              </td>
                              <td>
                                {r.change === undefined
                                  ? "Maintain current sales focus"
                                  : r.change > 15
                                    ? "Investigate recent sales increase"
                                    : r.change < -15
                                      ? "Monitor recent sales decrease"
                                      : "Maintain current sales focus"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {!ranking.length && (
                    <div className="empty">
                      <p>
                        Import sales data to identify evidence-based
                        opportunities.
                      </p>
                    </div>
                  )}
                </div>
                <p className="footnote">
                  Change compares the last four versus preceding four interior
                  calendar weeks; boundary weeks are excluded. It assumes the
                  imported history covers these periods. Showing up to 50
                  matching products. Select a product to evaluate pricing.
                </p>
              </Panel>
            )}
            {page === 3 && (
              <>
                <Panel
                  title="Weather-Based Predictions & Insights"
                  caption="Model one product, one unit, and a confirmed sales geography."
                >
                  <div className="prediction-controls">
                    <label>
                      1. Weather location for these sales
                      <select
                        aria-label="Analysis weather location"
                        value={places.indexOf(place)}
                        onChange={(e) =>
                          setPlace(places[Number(e.target.value)])
                        }
                      >
                        {!places.includes(place) && (
                          <option value={-1}>{place.name}</option>
                        )}
                        {places.map((p, i) => (
                          <option key={p.name} value={i}>
                            {p.name}, California
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      Product to model
                      <select
                        aria-label="Forecast product"
                        value={selected}
                        onChange={(e) => setProduct(e.target.value)}
                      >
                        {ranking.map((r) => (
                          <option key={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p>
                    Weather location: <b>{place.name}</b>. Sales location
                    filter: <b>{zip || "all locations"}</b>.
                  </p>
                  <h3>2. Confirm the data and geography</h3>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I confirm the filtered sales correspond to {place.name}, and
                    this is an appropriate weather location.
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={complete}
                      onChange={(e) => setComplete(e.target.checked)}
                    />
                    This is a complete sales extract for the selected dates;
                    unrecorded weeks can be treated as zero sales.
                  </label>
                  <ul
                    className="analysis-checklist"
                    aria-label="Analysis readiness"
                  >
                    {readiness.checks.map((check) => (
                      <li
                        className={check.ready ? "ready" : "needs-attention"}
                        key={check.label}
                      >
                        {check.ready ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <Info size={17} />
                        )}
                        <div>
                          <b>{check.label}</b>
                          <span>{check.detail}</span>
                        </div>
                        <small>{check.ready ? "Ready" : "Action needed"}</small>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="primary"
                    disabled={!readiness.canAnalyze || modelBusy}
                    onClick={loadHistory}
                  >
                    {modelBusy
                      ? "Matching weather and validating model…"
                      : "Analyze weather & demand"}
                  </button>
                  {modelError && (
                    <p role="alert" className="error">
                      {modelError}
                    </p>
                  )}
                  <div className="notice">
                    <Info size={18} />
                    <span>
                      {!history.length
                        ? "Complete the readiness checks, then run the analysis. Forecast numbers will only appear when supported by validation."
                        : model.reason
                          ? `Insufficient data for reliable forecast. ${model.reason}`
                          : model.explanation}
                    </span>
                  </div>
                  <section
                    className="analysis-insights"
                    aria-label="Weather and sales insights"
                  >
                    <article>
                      <div className="eyebrow">UPCOMING WEATHER CONTEXT</div>
                      <h3>{place.name} · next 7 days</h3>
                      <p>{weatherContext(days)}</p>
                      <button onClick={() => setRefresh((v) => v + 1)}>
                        <RefreshCw size={14} /> Refresh forecast
                      </button>
                    </article>
                    <article>
                      <div className="eyebrow">HISTORICAL SALES INSIGHT</div>
                      <h3>{selected || "Choose a product"}</h3>
                      <p>
                        {selectedSales.length
                          ? `${fmt(sum(selectedSales.map((r) => r.quantity)))} ${unit} net quantity across ${selectedSales.length.toLocaleString()} records.`
                          : "Upload sales data to review actual product activity."}
                      </p>
                      <p>
                        {selectedTrend === undefined
                          ? "Not enough comparable sales periods to establish a recent trend."
                          : `Recent net quantities ${selectedTrend >= 0 ? "increased" : "decreased"} ${fmt(Math.abs(selectedTrend))}% versus the preceding four interior weeks. This is a sales trend, not proof of a weather effect.`}
                      </p>
                    </article>
                    <article>
                      <div className="eyebrow">WEATHER MODEL EVIDENCE</div>
                      <h3>
                        {model.estimate !== undefined
                          ? "Exploratory forecast available"
                          : "Validation required"}
                      </h3>
                      <p>
                        {model.mae !== undefined &&
                        model.baselineMae !== undefined
                          ? model.mae < model.baselineMae
                            ? `The weather model reduced holdout absolute error from ${fmt(model.baselineMae)} to ${fmt(model.mae)} ${unit} per week. ${model.explanation}`
                            : `The weather model's error (${fmt(model.mae)}) did not improve on the historical baseline (${fmt(model.baselineMae)}). Use the historical baseline for planning.`
                          : "Run historical weather matching to compare a weather-aware model against the trailing sales baseline. No weather effect is assumed."}
                      </p>
                      {model.estimate !== undefined && (
                        <p>
                          Review inventory and current orders against an
                          exploratory estimate of {fmt(model.estimate)} {unit};
                          the error band and validation appear below.
                        </p>
                      )}
                    </article>
                  </section>
                  {!model.reason && (
                    <>
                      <div className="metrics">
                        <div>
                          Weekly baseline
                          <strong>
                            {fmt(model.baseline)} {unit}
                          </strong>
                        </div>
                        <div>
                          Weather validation MAE
                          <strong>{fmt(model.mae)}</strong>
                        </div>
                        <div>
                          Baseline validation MAE
                          <strong>{fmt(model.baselineMae)}</strong>
                        </div>
                        <div>
                          Upcoming 7-day estimate
                          <strong>
                            {fmt(model.estimate)} {unit}
                          </strong>
                        </div>
                      </div>
                      {model.estimate !== undefined && (
                        <p>
                          Exploratory error band: {fmt(model.low)}–
                          {fmt(model.high)} {unit}. This is ±2 validation MAE,
                          not a calibrated confidence interval. Change versus
                          trailing baseline:{" "}
                          {model.baseline
                            ? fmt(
                                (model.estimate / model.baseline! - 1) * 100,
                              ) + "%"
                            : "unavailable"}
                          .
                        </p>
                      )}
                      <h3>Chronological holdout · final 20% of weeks</h3>
                      <div className="chart">
                        <ResponsiveContainer>
                          <LineChart data={model.validation}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" minTickGap={50} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              dataKey="actual"
                              stroke="#234d3e"
                              dot={false}
                            />
                            <Line
                              dataKey="weather"
                              stroke="#ad8439"
                              dot={false}
                            />
                            <Line
                              dataKey="baseline"
                              stroke="#8b9aaf"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="footnote">
                        {model.weeks} full weeks. Regression uses weekly mean
                        temperature and total precipitation. A fixed first-80%
                        training split avoids random mixing. The baseline uses
                        only the preceding eight weeks for each validation week.
                        Archive weather is reanalysis; validation with observed
                        weather may overstate performance against forecast
                        weather.
                      </p>
                    </>
                  )}
                </Panel>
              </>
            )}
            {page === 4 && (
              <Panel
                title="Pricing & Revenue Simulator"
                caption="HYPOTHETICAL SCENARIOS · No company prices are changed."
              >
                <div className="pricing-grid">
                  <div>
                    <label className="block">
                      Product
                      <select
                        aria-label="Pricing product"
                        value={selected}
                        onChange={(e) => setProduct(e.target.value)}
                      >
                        {ranking.map((r) => (
                          <option key={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Historical net quantity:{" "}
                      <b>
                        {fmt(sum(selectedSales.map((r) => r.quantity)))} {unit}
                      </b>{" "}
                      over the filtered period.
                    </p>
                    <div className="mapping">
                      <label>
                        Baseline selling price ($/{unit || "unit"})
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={base}
                          onChange={(e) => setBase(e.target.value)}
                          placeholder="Required"
                        />
                      </label>
                      <label>
                        Unit cost ($, optional)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                          placeholder="Not provided"
                        />
                      </label>
                      <label>
                        Baseline scenario quantity ({unit || "units"})
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          placeholder="Enter quantity for your scenario"
                        />
                      </label>
                    </div>
                    <p className="footnote">
                      Price and cost prefill only when the latest selected
                      record provides them. Otherwise enter assumptions.
                      Scenario quantity is a user assumption for a chosen
                      period.
                    </p>
                    <div className="slider-label">
                      <b>Proposed price adjustment</b>
                      <strong>
                        {adjust > 0 ? "+" : ""}
                        {adjust}%
                      </strong>
                    </div>
                    <input
                      aria-label="Proposed price adjustment"
                      className="range"
                      type="range"
                      min={-50}
                      max={50}
                      value={adjust}
                      onChange={(e) => setAdjust(+e.target.value)}
                    />
                    <div className="range-ends">
                      <span>−50%</span>
                      <span>Current price</span>
                      <span>+50%</span>
                    </div>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={elasticEnabled}
                        onChange={(e) => setElasticEnabled(e.target.checked)}
                      />
                      Apply hypothetical price elasticity
                    </label>
                    <label className="block">
                      Elasticity assumption: {elasticity}
                      <input
                        aria-label="Elasticity assumption"
                        type="range"
                        min={-3}
                        max={0}
                        step={0.1}
                        value={elasticity}
                        disabled={!elasticEnabled}
                        onChange={(e) => setElasticity(+e.target.value)}
                      />
                    </label>
                    <p className="footnote">
                      Demand = baseline quantity × (proposed price / baseline
                      price)^elasticity. Elasticity is not statistically
                      estimated. Disabled means unchanged demand.
                    </p>
                  </div>
                  <div className="scenario-highlight">
                    <div className="eyebrow">YOUR PROPOSED SCENARIO</div>
                    <strong>{dollars(pricing[3]?.price)}</strong>
                    <p>Proposed selling price per {unit || "unit"}</p>
                    <div className="metrics vertical">
                      <div>
                        Price change
                        <strong>
                          {pricing.length
                            ? `${dollars(pricing[3].price - Number(base))} (${adjust}%)`
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        Estimated quantity
                        <strong>
                          {fmt(pricing[3]?.quantity)} {unit}
                        </strong>
                      </div>
                      <div>
                        Estimated revenue
                        <strong>{dollars(pricing[3]?.revenue)}</strong>
                      </div>
                      <div>
                        Estimated gross profit
                        <strong>{dollars(pricing[3]?.profit)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                {pricing.length ? (
                  <>
                    <div className="chart">
                      <ResponsiveContainer>
                        <BarChart data={pricing}>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => "$" + fmt(v)} />
                          <Tooltip formatter={(v) => dollars(Number(v))} />
                          <Legend />
                          <Bar
                            name="Estimated revenue"
                            dataKey="revenue"
                            fill="#386d55"
                            radius={[4, 4, 0, 0]}
                          />
                          {cost !== "" && (
                            <Bar
                              name="Estimated gross profit"
                              dataKey="profit"
                              fill="#bda66a"
                              radius={[4, 4, 0, 0]}
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Scenario</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Revenue</th>
                            <th>Gross profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.map((s) => (
                            <tr key={s.name}>
                              <td>{s.name}</td>
                              <td>{dollars(s.price)}</td>
                              <td>{fmt(s.quantity)}</td>
                              <td>{dollars(s.revenue)}</td>
                              <td>{dollars(s.profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="notice">
                    Enter a positive baseline price and nonnegative baseline
                    quantity. Unit cost is optional and must be nonnegative.
                  </div>
                )}
              </Panel>
            )}
            {page === 5 && (
              <>
                <Panel
                  title="Your workbook"
                  caption="No sales records are transmitted to an application server."
                >
                  <div className="metrics">
                    <div>
                      Imported file
                      <strong>
                        {hasData ? fileName : "No workbook imported"}
                      </strong>
                    </div>
                    <div>
                      Valid records<strong>{fmt(sales.length)}</strong>
                    </div>
                    <div>
                      Units<strong>{units.length || "—"}</strong>
                    </div>
                  </div>
                  <p>
                    The supplied workbook contains Item Description, Category
                    Description, Quantity, SUOM, Date Invoiced, Zip, and Source
                    Description. It does not contain selling prices, costs, or
                    inventory. Source Description is not retained.
                  </p>
                  <p>
                    Some product cells are date-typed; these are excluded rather
                    than converted to invented names. Negative quantities are
                    retained in historical net totals and block demand modeling
                    until resolved. Review category filters to exclude service
                    charges where appropriate.
                  </p>
                  <h3>Import validation</h3>
                  {Object.entries(issues).map(([k, v]) => (
                    <p key={k}>
                      {k}: <b>{fmt(v)}</b>
                    </p>
                  ))}
                  {!Object.keys(issues).length && (
                    <p>
                      {hasData
                        ? "No validation issues detected."
                        : "Import a workbook to see validation counts."}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setSales([]);
                      setDataSource("none");
                      setHistory([]);
                      setIssues({});
                      setFileName("");
                      setHeaders([]);
                      setSheets([]);
                      worker.current?.terminate();
                      setBusy("");
                    }}
                  >
                    Clear imported data
                  </button>
                </Panel>
                <Panel title="Data & Methodology">
                  <div className="method-grid">
                    <article>
                      <CheckCircle2 />
                      <h3>Historical performance</h3>
                      <p>
                        Actual imported invoice quantities. Weeks start Monday;
                        monthly totals use calendar months. All quantities are
                        separated by unit. No conversion or dollar revenue is
                        inferred. Seasonal charts require sufficient annual
                        coverage; missing records may mean missing coverage.
                      </p>
                    </article>
                    <article>
                      <CloudSun />
                      <h3>Weather sources</h3>
                      <p>
                        Open-Meteo forecast, geocoding, and historical
                        reanalysis. Weather requests contain location
                        coordinates and dates only. Sales ZIPs are not
                        automatically matched to a city. Forecast location
                        changes never silently reassign sales.
                      </p>
                      <a href="https://open-meteo.com/en/docs">
                        Forecast documentation ↗
                      </a>{" "}
                      ·{" "}
                      <a href="https://open-meteo.com/en/docs/historical-weather-api">
                        Archive documentation ↗
                      </a>
                    </article>
                    <article>
                      <TrendingUp />
                      <h3>Exploratory demand</h3>
                      <p>
                        At least 52 complete weeks and 26 positive-sales weeks.
                        Regression uses temperature and rainfall with a small
                        ridge penalty. Final 20% is held out chronologically.
                        Upcoming estimates require lower error than the
                        trailing-average baseline, recent sales, complete
                        weather and weather within historical feature ranges.
                        Correlation is not causation; stockouts, promotions,
                        seasonality and omitted factors remain confounders.
                      </p>
                    </article>
                    <article>
                      <SlidersHorizontal />
                      <h3>Pricing assumptions</h3>
                      <p>
                        Revenue = price × quantity. Gross profit = (price −
                        cost) × quantity; excludes overhead, taxes and
                        discounts. Missing costs remain missing. Elasticity is
                        hypothetical. No inference about optimal prices or
                        causal price effects is made.
                      </p>
                    </article>
                  </div>
                </Panel>
              </>
            )}
            <footer>
              <span>
                <Leaf size={14} /> Buttonwillow Warehouse Company
              </span>
              <span>Sales intelligence · Student research prototype</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
