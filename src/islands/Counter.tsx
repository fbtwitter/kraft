import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
        padding: "2rem 0",
        width: "100%",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(64px, 12vw, 120px)",
          fontWeight: 500,
          color: "var(--ink)",
          lineHeight: 1,
          tabularNums: "tabular-nums",
        }}
      >
        {count}
      </span>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => setCount((c) => c - 1)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "20px",
            width: "48px",
            height: "48px",
            border: "1px solid var(--rule)",
            borderRadius: "999px",
            color: "var(--ink-2)",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--ink-3)";
            (e.target as HTMLElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--rule)";
            (e.target as HTMLElement).style.color = "var(--ink-2)";
          }}
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0 18px",
            height: "48px",
            border: "1px solid var(--rule)",
            borderRadius: "999px",
            color: "var(--ink-3)",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--ink-3)";
            (e.target as HTMLElement).style.color = "var(--ink-2)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--rule)";
            (e.target as HTMLElement).style.color = "var(--ink-3)";
          }}
        >
          reset
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "20px",
            width: "48px",
            height: "48px",
            border: "1px solid var(--rule)",
            borderRadius: "999px",
            color: "var(--ink-2)",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--ink-3)";
            (e.target as HTMLElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = "var(--rule)";
            (e.target as HTMLElement).style.color = "var(--ink-2)";
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
