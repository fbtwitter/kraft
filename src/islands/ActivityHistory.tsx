import { useId, useState } from "react";
import SelectField from "./SelectField";
import "../styles/activity-history.css";

const transactions = [
  {
    id: "SAMPLE-105",
    date: "2026-11-14",
    time: "14:35",
    type: "purchase",
    units: 800,
    price: 1250000,
    failed: false,
  },
  {
    id: "SAMPLE-104",
    date: "2026-11-14",
    time: "09:10",
    type: "sale",
    units: 400,
    price: 1200000,
    failed: false,
  },
  {
    id: "SAMPLE-103",
    date: "2026-11-13",
    time: "16:20",
    type: "purchase",
    units: 2000,
    price: 1250000,
    failed: true,
  },
  {
    id: "SAMPLE-102",
    date: "2026-11-13",
    time: "10:05",
    type: "purchase",
    units: 1000,
    price: 1240000,
    failed: false,
  },
  {
    id: "SAMPLE-101",
    date: "2026-11-10",
    time: "11:45",
    type: "sale",
    units: 500,
    price: 1200000,
    failed: false,
  },
] as const;
const money = (amount: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
const gold = (units: number) =>
  `${(units / 10000).toFixed(4).replace(".", ",")} g`;
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

export default function ActivityHistory() {
  const id = useId();
  const [filter, setFilter] = useState("all");
  const [scenario, setScenario] = useState("sample");
  const [resetKey, setResetKey] = useState(0);
  const visible =
    scenario === "sample"
      ? transactions.filter((item) => filter === "all" || item.type === filter)
      : [];
  const dates = [...new Set(visible.map((item) => item.date))];

  return (
    <div className="demo-layout activity-history">
      <p className="field-help">
        Fictional gold transactions, newest first. Dates, times (WIB) and
        amounts are fixed sample data.
      </p>
      <label htmlFor={`${id}-scenario`}>
        Scenario
        <SelectField
          id={`${id}-scenario`}
          aria-label="Scenario"
          value={scenario}
          onValueChange={setScenario}
        >
          <option value="sample">Sample activity</option>
          <option value="empty">No activity</option>
          <option value="failed">History unavailable</option>
        </SelectField>
      </label>
      <div
        className="activity-filters"
        role="group"
        aria-label="Transaction type"
      >
        {[
          ["all", "All"],
          ["purchase", "Purchases"],
          ["sale", "Sales"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`btn ${filter === value ? "primary" : "ghost"}`}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {scenario === "failed" ? (
        <div className="activity-state" role="status">
          <h2>History unavailable</h2>
          <p>
            This scenario simulates a failed history request. No transactions
            have been changed.
          </p>
          <button className="btn ghost" onClick={() => setScenario("sample")}>
            Retry with sample activity
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="field-help">
            {visible.length}{" "}
            {visible.length === 1 ? "transaction" : "transactions"} across{" "}
            {dates.length} {dates.length === 1 ? "date" : "dates"}
          </p>
          {visible.length === 0 ? (
            <div className="activity-state">
              <h2>
                No{" "}
                {filter === "all"
                  ? "transactions"
                  : filter === "purchase"
                    ? "purchases"
                    : "sales"}{" "}
                yet
              </h2>
              <p>This sample account has no activity to show.</p>
              <button
                className="btn ghost"
                onClick={() => setScenario("sample")}
              >
                Load sample activity
              </button>
            </div>
          ) : (
            <div
              className="activity-groups"
              key={`${filter}-${scenario}-${resetKey}`}
            >
              {dates.map((date) => (
                <section key={date} aria-label={dateLabel(date)}>
                  <h2>
                    <time dateTime={date}>{dateLabel(date)}</time>
                  </h2>
                  <ul>
                    {visible
                      .filter((item) => item.date === date)
                      .map((item) => {
                        const amount = (item.units * item.price) / 10000;
                        return (
                          <li key={item.id}>
                            <details className="activity-receipt">
                              <summary>
                                <span className="activity-summary">
                                  <span>
                                    <strong>
                                      {item.type === "purchase"
                                        ? "Gold purchase"
                                        : "Gold sale"}
                                    </strong>
                                    <small>
                                      {item.time} WIB ·{" "}
                                      {item.failed ? "Failed" : "Completed"}
                                    </small>
                                  </span>
                                  <span className="activity-amount">
                                    {money(amount)}
                                    <small>{gold(item.units)}</small>
                                  </span>
                                </span>
                              </summary>
                              <div className="activity-receipt-body">
                                <h3>Sample receipt</h3>
                                <dl>
                                  <div>
                                    <dt>Reference</dt>
                                    <dd>{item.id}</dd>
                                  </div>
                                  <div>
                                    <dt>Status</dt>
                                    <dd>
                                      {item.failed ? "Failed" : "Completed"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Price / gram</dt>
                                    <dd>{money(item.price)}</dd>
                                  </div>
                                  <div>
                                    <dt>Quantity</dt>
                                    <dd>{gold(item.units)}</dd>
                                  </div>
                                  <div>
                                    <dt>
                                      {item.failed
                                        ? "Attempted amount"
                                        : item.type === "purchase"
                                          ? "Paid"
                                          : "Received"}
                                    </dt>
                                    <dd>{money(amount)}</dd>
                                  </div>
                                  <div>
                                    <dt>Fee</dt>
                                    <dd>{money(0)}</dd>
                                  </div>
                                </dl>
                                <p className="field-help">
                                  {item.failed
                                    ? "Insufficient sample wallet balance. No money or gold moved; the amount above was only attempted."
                                    : `Sample ${item.type === "purchase" ? "purchase" : "sale"} completed. This receipt is fictional.`}
                                </p>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      <button
        className="btn ghost"
        onClick={() => {
          setFilter("all");
          setScenario("sample");
          setResetKey((value) => value + 1);
        }}
      >
        Reset
      </button>
    </div>
  );
}
