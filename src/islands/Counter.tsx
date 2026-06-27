import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <span className="text-6xl font-bold tabular-nums">{count}</span>
      <div className="flex gap-3">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors text-sm text-gray-500"
        >
          reset
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
