import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="demo-layout counter-demo">
      <output
        className="counter-value"
        aria-live="polite"
        aria-label="Current count"
      >
        {count}
      </output>
      <div className="counter-actions">
        <button
          className="btn ghost"
          aria-label="Decrease count"
          onClick={() => setCount((value) => value - 1)}
        >
          −
        </button>
        <button className="btn ghost" onClick={() => setCount(0)}>
          Reset
        </button>
        <button
          className="btn primary"
          aria-label="Increase count"
          onClick={() => setCount((value) => value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
