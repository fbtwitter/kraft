import { useId, useState } from "react";
import SelectField from "./SelectField";
import "../styles/time-series.css";

const data = Array.from({ length: 90 }, (_, index) => {
  const buy = 1200000 + index * 420 + Math.round(Math.sin(index * 0.6) * 8500);
  return {
    date: new Date(Date.UTC(2026, 7, 17 + index)),
    buy,
    sell: buy - 28000 - (index % 5) * 400,
  };
});
const money = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
const left = 104;
const right = 624;
const top = 20;
const bottom = 224;

export default function TimeSeriesExplorer() {
  const id = useId();
  const [days, setDays] = useState(7);
  const [index, setIndex] = useState(6);
  const [scenario, setScenario] = useState("sample");
  const points = data.slice(-days);
  const selected = points[index];
  const low =
    Math.floor(Math.min(...points.map((point) => point.sell)) / 10000) * 10000 -
    5000;
  const high =
    Math.ceil(Math.max(...points.map((point) => point.buy)) / 10000) * 10000 +
    5000;
  const x = (position: number) =>
    left + (position / (days - 1)) * (right - left);
  const y = (price: number) =>
    bottom - ((price - low) / (high - low)) * (bottom - top);

  function inspect(clientX: number, element: SVGSVGElement) {
    const rect = element.getBoundingClientRect();
    const chartX = ((clientX - rect.left) / rect.width) * 640;
    setIndex(
      Math.max(
        0,
        Math.min(
          days - 1,
          Math.round(((chartX - left) / (right - left)) * (days - 1)),
        ),
      ),
    );
  }

  function reset() {
    setDays(7);
    setIndex(6);
    setScenario("sample");
  }

  return (
    <div className="demo-layout time-series">
      <p className="field-help">
        Fictional daily gold prices per gram, ending 14 Nov 2026. These values
        are fixed sample data.
      </p>
      <label htmlFor={`${id}-scenario`}>
        Scenario
        <SelectField
          id={`${id}-scenario`}
          aria-label="Scenario"
          value={scenario}
          onValueChange={setScenario}
        >
          <option value="sample">Sample prices</option>
          <option value="loading">Loading prices</option>
          <option value="empty">No prices</option>
        </SelectField>
      </label>
      <div className="series-ranges" role="group" aria-label="Date range">
        {[7, 30, 90].map((range) => (
          <button
            key={range}
            className={`btn ${days === range ? "primary" : "ghost"}`}
            aria-pressed={days === range}
            onClick={() => {
              setDays(range);
              setIndex(range - 1);
            }}
          >
            {range} days
          </button>
        ))}
      </div>
      {scenario === "sample" ? (
        <>
          <div className="series-legend">
            <span>— Buy price</span>
            <span>┄ Sell price</span>
          </div>
          <svg
            className="series-chart"
            viewBox="0 0 640 260"
            role="img"
            aria-label={`${days}-day sample buy and sell price chart`}
            aria-describedby={`${id}-help`}
            onPointerMove={(event) => {
              if (event.pointerType === "mouse" || event.buttons)
                inspect(event.clientX, event.currentTarget);
            }}
            onPointerDown={(event) =>
              inspect(event.clientX, event.currentTarget)
            }
          >
            {[low, (low + high) / 2, high].map((price) => (
              <g key={price}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(price)}
                  y2={y(price)}
                  className="series-grid"
                />
                <text
                  className="series-full-price"
                  x={left - 10}
                  y={y(price) + 4}
                  textAnchor="end"
                >
                  {money(price)}
                </text>
                <text
                  className="series-short-price"
                  x={left - 10}
                  y={y(price) + 7}
                  textAnchor="end"
                >
                  {(price / 1000000).toFixed(3)}m
                </text>
              </g>
            ))}
            <text x={left} y={250}>
              {dateLabel(points[0].date).replace(" 2026", "")}
            </text>
            <text x={right} y={250} textAnchor="end">
              {dateLabel(points[days - 1].date).replace(" 2026", "")}
            </text>
            {(["buy", "sell"] as const).map((kind) => (
              <polyline
                key={kind}
                points={points
                  .map((point, position) => `${x(position)},${y(point[kind])}`)
                  .join(" ")}
                className={`series-line series-${kind}`}
              />
            ))}
            <line
              x1={x(index)}
              x2={x(index)}
              y1={top}
              y2={bottom}
              className="series-marker"
            />
            {(["buy", "sell"] as const).map((kind) => (
              <circle
                key={kind}
                cx={x(index)}
                cy={y(selected[kind])}
                r={4}
                className={`series-dot series-${kind}`}
              />
            ))}
          </svg>
          <label htmlFor={`${id}-date`}>
            Inspect date
            <input
              id={`${id}-date`}
              type="range"
              min={0}
              max={days - 1}
              step={1}
              value={index}
              aria-valuetext={dateLabel(selected.date)}
              aria-describedby={`${id}-help`}
              onChange={(event) => setIndex(Number(event.target.value))}
            />
          </label>
          <p id={`${id}-help`} className="field-help">
            Axis prices are in rupiah; m means million. Point or tap on the
            chart, or focus the date slider and use arrow keys. Home and End
            select the first and last dates.
          </p>
          <div className="series-readout" role="status">
            <h2>{dateLabel(selected.date)}</h2>
            <dl>
              <div>
                <dt>Buy / gram</dt>
                <dd>{money(selected.buy)}</dd>
              </div>
              <div>
                <dt>Sell / gram</dt>
                <dd>{money(selected.sell)}</dd>
              </div>
              <div>
                <dt>Difference</dt>
                <dd>{money(selected.buy - selected.sell)}</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <div className="series-state" role="status">
          <h2>
            {scenario === "loading"
              ? "Loading prices…"
              : "No prices for this range"}
          </h2>
          <p>
            {scenario === "loading"
              ? "A paused loading scenario. Load the sample prices when you are ready."
              : "This scenario has no price history to display."}
          </p>
          <button className="btn ghost" onClick={() => setScenario("sample")}>
            Load sample prices
          </button>
        </div>
      )}
      <button className="btn ghost" onClick={reset}>
        Reset
      </button>
    </div>
  );
}
