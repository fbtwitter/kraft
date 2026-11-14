import { useId, useState } from "react";
import "../styles/linked-amounts.css";

const prices = { buy: 1234567, sell: 1201234 };
const wallet = 250000;
const holding = 4321;
const idr = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
const grams = (units: number) => (units / 10000).toFixed(4).replace(".", ",");

export default function LinkedAmounts() {
  const id = useId();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [source, setSource] = useState<"rupiah" | "grams">("rupiah");
  const [raw, setRaw] = useState("100000");
  const price = prices[mode];
  const normalized = raw.replace(",", ".");
  const valid =
    source === "rupiah"
      ? /^\d{1,9}$/.test(raw)
      : /^\d{1,5}([.,]\d{0,4})?$/.test(raw);
  // Integer ten-thousandths keep the displayed gold quantity and quote consistent.
  const units = valid
    ? source === "grams"
      ? Math.round(Number(normalized) * 10000)
      : Math.floor((Number(raw) * 10000) / price)
    : 0;
  const amount =
    mode === "buy"
      ? Math.ceil((units * price) / 10000)
      : Math.floor((units * price) / 10000);
  const maxUnits =
    mode === "buy" ? Math.floor((wallet * 10000) / price) : holding;
  const error = !raw
    ? "Enter an amount in either field."
    : !valid
      ? "Use whole rupiah or up to four decimal places for grams."
      : units < 1
        ? "The minimum quantity is 0,0001 g."
        : units > maxUnits ||
            (source === "rupiah" && mode === "buy" && Number(raw) > wallet)
          ? mode === "buy"
            ? "This amount exceeds the sample wallet balance."
            : "This amount exceeds the sample gold balance."
          : "";

  function edit(field: "rupiah" | "grams", value: string) {
    setSource(field);
    setRaw(value);
  }

  return (
    <div className="demo-layout linked-amounts">
      <p className="field-help">
        Fictional prices and balances. Edit either amount to see the conversion.
      </p>
      <div
        className="amount-actions"
        role="group"
        aria-label="Transaction type"
      >
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            className={`btn ${mode === value ? "primary" : "ghost"}`}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {value === "buy" ? "Buy gold" : "Sell gold"}
          </button>
        ))}
      </div>
      <dl className="amount-facts">
        <div>
          <dt>Sample price / gram</dt>
          <dd>{idr(price)}</dd>
        </div>
        <div>
          <dt>{mode === "buy" ? "Sample wallet" : "Sample gold balance"}</dt>
          <dd>{mode === "buy" ? idr(wallet) : `${grams(holding)} g`}</dd>
        </div>
      </dl>
      <div className="amount-fields">
        <label htmlFor={`${id}-rupiah`}>
          Rupiah (IDR)
          <input
            id={`${id}-rupiah`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={12}
            value={
              source === "rupiah" ? raw : valid && raw ? String(amount) : ""
            }
            onChange={(event) => edit("rupiah", event.target.value)}
            aria-invalid={!!error}
            aria-describedby={`${id}-help ${id}-status`}
          />
        </label>
        <label htmlFor={`${id}-grams`}>
          Gold (grams)
          <input
            id={`${id}-grams`}
            inputMode="decimal"
            autoComplete="off"
            maxLength={12}
            value={source === "grams" ? raw : valid && raw ? grams(units) : ""}
            onChange={(event) => edit("grams", event.target.value)}
            aria-invalid={!!error}
            aria-describedby={`${id}-help ${id}-status`}
          />
        </label>
      </div>
      <p id={`${id}-help`} className="field-help">
        Use whole rupiah and up to four decimal places for grams (comma or dot).
        Minimum: 0,0001 g.
      </p>
      <div className="amount-actions">
        <button
          className="btn ghost"
          onClick={() => edit("grams", grams(maxUnits))}
        >
          {mode === "buy" ? "Use maximum" : "Sell all"}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setMode("buy");
            edit("rupiah", "100000");
          }}
        >
          Reset
        </button>
      </div>
      <div className="amount-result" role="status" id={`${id}-status`}>
        {error ? (
          <p>{error}</p>
        ) : (
          <>
            <p>
              {mode === "buy" ? "You would pay" : "You would receive"}{" "}
              <strong>{idr(amount)}</strong> {mode === "buy" ? "for" : "from"}{" "}
              <strong>{grams(units)} g</strong>.
            </p>
            <p className="field-help">
              {mode === "buy" ? "Payment rounds up" : "Proceeds round down"} to
              whole rupiah.{" "}
              {source === "rupiah"
                ? "Gold rounds down to four decimal places; the quote uses that quantity."
                : "The quote uses the gold quantity you entered."}
            </p>
            {source === "rupiah" && (
              <p className="field-help">
                Difference from entered rupiah: {idr(Number(raw) - amount)}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
