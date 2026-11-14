import SelectField from "./SelectField";
import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, Check, X, Eye, EyeOff } from "lucide-react";

function usePending() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => clearTimeout(timer.current);
  useEffect(() => cancel, []);
  return {
    cancel,
    after: (fn: () => void, delay: number) => {
      cancel();
      timer.current = setTimeout(fn, delay);
    },
  };
}

export function ConnectionRecovery() {
  const [preset, setPreset] = useState("recover");
  const [state, setState] = useState("Connected");
  const [attempt, setAttempt] = useState(0);
  const pending = usePending();
  function retry(count = 1) {
    setAttempt(count);
    setState("Reconnecting");
    pending.after(() => {
      if (preset === "recover") setState("Connected");
      else if (count < 3) retry(count + 1);
      else setState("Retry limit reached");
    }, 1000);
  }
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Preset{" "}
        <SelectField
          value={preset}
          onValueChange={(value) => {
            pending.cancel();
            setPreset(value);
            setState("Connected");
            setAttempt(0);
          }}
        >
          <option value="recover">Recover on retry</option>
          <option value="fail">Fail three attempts</option>
        </SelectField>
      </label>
      <div className="pattern-state" role="status">
        {state === "Connected" ? <Wifi size={28} /> : <WifiOff size={28} />}
        <strong>{state}</strong>
        {attempt > 0 && <span>Attempt {attempt} of 3</span>}
      </div>
      <div className="pattern-actions">
        <button
          className="btn"
          onClick={() => {
            pending.cancel();
            setState("Disconnected");
            setAttempt(0);
          }}
        >
          Disconnect
        </button>
        <button
          className="btn primary"
          disabled={state === "Connected" || state === "Reconnecting"}
          onClick={() => retry()}
        >
          Reconnect
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            pending.cancel();
            setState("Connected");
            setAttempt(0);
          }}
        >
          Reset
        </button>
      </div>
      <p className="muted">Simulated connection. No server is contacted.</p>
    </div>
  );
}

export function AsyncStates() {
  const [preset, setPreset] = useState("success");
  const [state, setState] = useState("Ready");
  const pending = usePending();
  const load = () => {
    setState("Loading");
    pending.after(
      () =>
        setState(
          preset === "success" || preset === "slow"
            ? "Loaded"
            : preset === "empty"
              ? "No results"
              : "Request failed",
        ),
      preset === "slow" ? 4000 : 900,
    );
  };
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Preset{" "}
        <SelectField
          value={preset}
          onValueChange={(value) => {
            pending.cancel();
            setPreset(value);
            setState("Ready");
          }}
        >
          <option value="success">Success</option>
          <option value="empty">Empty result</option>
          <option value="error">Failure</option>
          <option value="slow">Slow request</option>
        </SelectField>
      </label>
      <div className="pattern-actions">
        <button
          className="btn primary"
          disabled={state === "Loading"}
          onClick={load}
        >
          {state === "Request failed" ? "Retry" : "Load sample"}
        </button>
        <button
          className="btn ghost"
          disabled={state !== "Loading"}
          onClick={() => {
            pending.cancel();
            setState("Cancelled");
          }}
        >
          Cancel request
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            pending.cancel();
            setState("Ready");
          }}
        >
          Reset
        </button>
      </div>
      <div
        className="pattern-state"
        role="status"
        aria-busy={state === "Loading"}
      >
        <strong>{state}</strong>
        {state === "Loaded" && <span>Your sample result is ready.</span>}
        {state === "Request failed" && (
          <span>Nothing was changed. Try again or choose another preset.</span>
        )}
      </div>
      <p className="muted">Request timing and results are simulated.</p>
    </div>
  );
}

export function ConfirmationFlow() {
  const modal = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("Sample item");
  const [saved, setSaved] = useState("Sample item");
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Item name
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-2 block w-full"
        />
      </label>
      <button
        className="btn primary"
        disabled={!value.trim()}
        onClick={() => modal.current?.showModal()}
      >
        Review change
      </button>
      <p role="status">Saved value: {saved}</p>
      <dialog className="pattern-dialog" ref={modal}>
        <h3>Confirm this change?</h3>
        <p className="muted">Your saved item will become:</p>
        <strong className="pattern-value">{value}</strong>
        <div className="pattern-actions">
          <button className="btn ghost" onClick={() => modal.current?.close()}>
            Back to editing
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setSaved(value);
              modal.current?.close();
            }}
          >
            <Check size={16} /> Confirm change
          </button>
        </div>
        <button
          className="pattern-close"
          aria-label="Close confirmation"
          onClick={() => modal.current?.close()}
        >
          <X size={18} />
        </button>
      </dialog>
    </div>
  );
}

export function SkeletonLoading() {
  const [state, setState] = useState("ready");
  const [preset, setPreset] = useState("cards");
  const pending = usePending();
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Preset{" "}
        <SelectField value={preset} onValueChange={(value) => setPreset(value)}>
          <option value="cards">Cards</option>
          <option value="list">List</option>
        </SelectField>
      </label>
      <div className="pattern-actions">
        <button
          className="btn primary"
          onClick={() => {
            setState("loading");
            pending.after(() => setState("loaded"), 1800);
          }}
        >
          Load preview
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            pending.cancel();
            setState("ready");
          }}
        >
          Reset
        </button>
      </div>
      <p role="status">
        {state === "loading"
          ? "Loading sample content…"
          : state === "loaded"
            ? "Sample content loaded."
            : "Start a load to compare placeholder and content."}
      </p>
      <div className={`sample-${preset}`} aria-busy={state === "loading"}>
        {["Sketch an idea", "Try an interaction", "Review the result"].map(
          (title, index) => (
            <div className="sample-item" key={title}>
              {state !== "loaded" ? (
                <div aria-hidden="true" className="skeleton-lines">
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <>
                  <span className="meta">Sample {index + 1}</span>
                  <h3>{title}</h3>
                  <p className="muted">
                    A small piece of content, ready to explore.
                  </p>
                </>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function FeatureVariations() {
  const [variant, setVariant] = useState("list");
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Variant{" "}
        <SelectField
          aria-label="Variant"
          value={variant}
          onValueChange={(value) => setVariant(value)}
        >
          <option value="list">List</option>
          <option value="cards">Cards</option>
        </SelectField>
      </label>
      <label className="pattern-actions">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        Enable selected variation
      </label>
      <p role="status">
        {enabled
          ? `Showing ${variant} variation.`
          : "Showing default list fallback."}
      </p>
      <div className={`sample-${enabled ? variant : "list"}`}>
        {["First idea", "Another approach", "Something to revisit"].map(
          (title) => (
            <div className="sample-item" key={title}>
              <h3>{title}</h3>
              <p className="muted">The same data, presented differently.</p>
            </div>
          ),
        )}
      </div>
      <p className="muted">
        Local variation switch. No assignment or analytics service is used.
      </p>
    </div>
  );
}

export function PinEntry() {
  const [pin, setPin] = useState("");
  const [visible, setVisible] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState(
    "Demo PIN: 2468. This does not authenticate an account.",
  );
  return (
    <div className="pattern-demo demo-layout">
      <form
        className="pattern-demo demo-layout"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin === "2468") {
            setStatus("PIN accepted.");
            setAttempts(0);
          } else {
            setAttempts((n) => n + 1);
            setStatus("Incorrect PIN. Try again.");
          }
          setPin("");
        }}
      >
        <div className="form-field">
          <label htmlFor="demo-pin-code">Four-digit PIN</label>
          <div className="pattern-actions mt-2">
            <input
              aria-label="Four-digit PIN"
              id="demo-pin-code"
              aria-describedby="demo-pin-help demo-pin-status"
              aria-invalid={attempts > 0 && pin.length === 0}
              disabled={attempts >= 3}
              type={visible ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="[0-9]{4}"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="pin-field"
            />
            <button
              type="button"
              className="btn ghost"
              aria-label={visible ? "Hide PIN" : "Show PIN"}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="field-help" id="demo-pin-help">
            Use 2468. Four digits; three attempts before reset.
          </p>
        </div>
        <div className="pattern-actions">
          <button
            className="btn primary"
            disabled={pin.length !== 4 || attempts >= 3}
          >
            Check PIN
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setPin("");
              setVisible(false);
              setAttempts(0);
              setStatus(
                "Demo PIN: 2468. This does not authenticate an account.",
              );
            }}
          >
            Reset
          </button>
        </div>
      </form>
      <p role="status" id="demo-pin-status">
        {attempts >= 3
          ? "Demo locked after three attempts. Reset to try again."
          : status}
      </p>
    </div>
  );
}
