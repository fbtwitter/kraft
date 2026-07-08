import { useRef, useState } from "react";

type LogEntry = { id: number; text: string };

export type Action = {
  key: string;
  label: string;
  lines: string[];
};

type Props = {
  subtitle: string;
  actions: Action[];
};

export default function MockLoginChild({ subtitle, actions }: Props) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  function run(lines: string[]) {
    lines.forEach((text, i) => {
      setTimeout(() => {
        idRef.current += 1;
        setLog((l) => [...l, { id: idRef.current, text }]);
      }, i * 450);
    });
  }

  return (
    <div className="w-full max-w-xl border border-black bg-white p-6 font-mono text-black">
      <p className="mb-5 text-[11px] tracking-widest text-black uppercase">
        {subtitle}
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => run(action.lines)}
            className="border border-black bg-black px-4 py-2 text-[11px] tracking-wider text-white uppercase transition-colors hover:bg-white hover:text-black"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="mb-5 border-l-4 border-black px-4 py-3 text-[11.5px] leading-relaxed text-black">
        <strong>Raw interactive-login iframe:</strong> BLOCKED — refused to
        connect (<code>X-Frame-Options: DENY</code>). Microsoft's login page
        refuses to render inside any frame, by design — this box represents that
        observed behavior rather than a live request.
      </div>

      <div className="max-h-52.5 min-h-32.5 overflow-y-auto bg-black px-4 py-3 text-[11.5px] leading-relaxed text-white">
        {log.length === 0 ? (
          <span className="text-white/40">
            click a button above — every action is logged here
          </span>
        ) : (
          log.map((entry) => <div key={entry.id}>{entry.text}</div>)
        )}
      </div>
    </div>
  );
}
