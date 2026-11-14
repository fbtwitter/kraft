import SelectField from "./SelectField";
import { useEffect, useRef, useState } from "react";
export default function CodeVerification() {
  const [preset, setPreset] = useState("normal");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(
    "Demo code: 123456. No message is sent.",
  );
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => () => clearTimeout(pending.current), []);
  function reset(value: string) {
    clearTimeout(pending.current);
    setPreset(value);
    setCode("");
    setAttempts(0);
    setBusy(false);
    setCooldown(0);
    setStatus("Demo code: 123456. No message is sent.");
  }
  return (
    <div className="demo-layout">
      <label className="block">
        Preset{" "}
        <SelectField value={preset} onValueChange={(value) => reset(value)}>
          <option value="normal">Verify and retry</option>
          <option value="expired">Expired code</option>
          <option value="network">Connection failure</option>
        </SelectField>
      </label>
      <p className="chip">Simulated verification · no SMS or account</p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setStatus("Checking code…");
          pending.current = setTimeout(() => {
            setBusy(false);
            if (preset === "network")
              setStatus("Connection failed. Your code is kept; try again.");
            else if (preset === "expired")
              setStatus("This code expired. Request a new one.");
            else if (code === "123456") {
              setStatus("Code verified.");
              setAttempts(0);
            } else {
              setAttempts((n) => n + 1);
              setStatus("That code does not match. Try again.");
            }
          }, 600);
        }}
      >
        <label className="block">
          Verification code
          <input
            className="mt-2 block w-full font-mono tracking-widest"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-describedby="verification-help verification-status"
            aria-invalid={attempts > 0 && status.includes("does not match")}
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />
        </label>
        <p className="field-help" id="verification-help">
          Enter six digits. Use 123456 for this demo.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn primary"
            disabled={busy || code.length !== 6 || attempts >= 3}
          >
            {busy ? "Checking…" : "Verify code"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy || cooldown > 0}
            onClick={() => {
              setCooldown(10);
              setAttempts(0);
              setPreset("normal");
              setStatus(
                "New demo code: 123456. Resend is available after the cooldown.",
              );
            }}
          >
            {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => reset(preset)}
          >
            Reset
          </button>
        </div>
      </form>
      <p role="status" id="verification-status">
        {attempts >= 3
          ? "Too many failed attempts. Resend a code to restart this demo."
          : status}
      </p>
    </div>
  );
}
