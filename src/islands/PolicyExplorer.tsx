import { useId, useState } from "react";
import SelectField from "./SelectField";
import "../styles/policy-explorer.css";

const policies = [
  {
    id: "SAMPLE-101",
    title: "Everyday accident cover",
    state: "active",
    period: "1 Jan 2026 – 31 Dec 2027",
    benefit: "Up to Rp 5.000.000",
    coverage: "Sample reimbursement for accidental injury treatment.",
    exclusion: "Routine checkups and pre-existing conditions are excluded.",
  },
  {
    id: "SAMPLE-102",
    title: "Home essentials cover",
    state: "active",
    period: "1 Jul 2026 – 30 Jun 2027",
    benefit: "Up to Rp 10.000.000",
    coverage: "Sample protection for household contents damaged by fire.",
    exclusion: "Wear and tear and unattended property are excluded.",
  },
  {
    id: "SAMPLE-090",
    title: "Weekend travel cover",
    state: "expired",
    period: "1 May 2025 – 31 May 2025",
    benefit: "Up to Rp 2.000.000",
    coverage: "Sample reimbursement for lost baggage during a covered trip.",
    exclusion: "Unreported losses and cash are excluded.",
  },
] as const;

export default function PolicyExplorer() {
  const id = useId();
  const [filter, setFilter] = useState<"active" | "expired">("active");
  const [scenario, setScenario] = useState("sample");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const visible =
    scenario === "empty"
      ? []
      : policies.filter((policy) => policy.state === filter);
  const preview = visible.find((policy) => policy.id === previewId);

  return (
    <div className="demo-layout policy-explorer">
      <p className="field-help">
        Fictional policies and documents for exploring this interface. All dates
        and statuses are fixed sample data.
      </p>
      <label htmlFor={`${id}-scenario`}>
        Scenario
        <SelectField
          id={`${id}-scenario`}
          aria-label="Scenario"
          value={scenario}
          onValueChange={(value) => {
            setScenario(value);
            setPreviewId(null);
          }}
        >
          <option value="sample">Sample policies</option>
          <option value="empty">No policies</option>
          <option value="unavailable">Documents unavailable</option>
        </SelectField>
      </label>
      <div className="policy-filters" role="group" aria-label="Policy status">
        {(["active", "expired"] as const).map((state) => (
          <button
            className={`btn ${filter === state ? "primary" : "ghost"}`}
            key={state}
            aria-pressed={filter === state}
            onClick={() => {
              setFilter(state);
              setPreviewId(null);
            }}
          >
            {state === "active" ? "Active" : "Expired"} (
            {scenario === "empty"
              ? 0
              : policies.filter((policy) => policy.state === state).length}
            )
          </button>
        ))}
      </div>
      <p className="field-help" role="status">
        {visible.length} {filter} {visible.length === 1 ? "policy" : "policies"}
      </p>
      {visible.length === 0 ? (
        <div className="policy-empty">
          <h2>No {filter} policies</h2>
          <p>This sample account has no policies to show.</p>
          <button
            className="btn ghost"
            onClick={() => {
              setScenario("sample");
              setPreviewId(null);
            }}
          >
            Load sample policies
          </button>
        </div>
      ) : (
        <div className="policy-list" key={`${filter}-${resetKey}`}>
          {visible.map((policy) => (
            <details key={policy.id} className="policy-item">
              <summary>
                <span>
                  {policy.title}
                  <small>{policy.id}</small>
                </span>
              </summary>
              <div className="policy-body">
                <dl>
                  <div>
                    <dt>Coverage period</dt>
                    <dd>{policy.period}</dd>
                  </div>
                  <div>
                    <dt>Benefit limit</dt>
                    <dd>{policy.benefit}</dd>
                  </div>
                </dl>
                <p>{policy.coverage}</p>
                <p className="field-help">{policy.exclusion}</p>
                {policy.state === "expired" && (
                  <p className="field-help">
                    Coverage has ended. The sample document remains available
                    for reference.
                  </p>
                )}
                <button
                  className="btn ghost"
                  aria-controls={`${id}-document`}
                  aria-expanded={previewId === policy.id}
                  onClick={() =>
                    setPreviewId(previewId === policy.id ? null : policy.id)
                  }
                >
                  {previewId === policy.id
                    ? "Hide document"
                    : "Preview document"}
                </button>
                {preview?.id === policy.id && (
                  <section
                    id={`${id}-document`}
                    aria-label={`${policy.title} document`}
                    className="policy-document"
                  >
                    {scenario === "unavailable" ? (
                      <>
                        <h3>Document unavailable</h3>
                        <p>
                          This scenario simulates an unavailable file. The
                          policy details are still accessible.
                        </p>
                        <button
                          className="btn ghost"
                          onClick={() => setScenario("sample")}
                        >
                          Restore sample document
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="field-help">
                          SAMPLE DOCUMENT · HTML PREVIEW
                        </p>
                        <h3>{policy.title}</h3>
                        <p>Reference: {policy.id}</p>
                        <p>Period: {policy.period}</p>
                        <p>Benefit limit: {policy.benefit}</p>
                        <p>
                          {policy.coverage} {policy.exclusion}
                        </p>
                        <p className="field-help">
                          This fictional document does not provide insurance
                          coverage.
                        </p>
                      </>
                    )}
                  </section>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
      <button
        className="btn ghost"
        onClick={() => {
          setScenario("sample");
          setFilter("active");
          setPreviewId(null);
          setResetKey((value) => value + 1);
        }}
      >
        Reset
      </button>
    </div>
  );
}
