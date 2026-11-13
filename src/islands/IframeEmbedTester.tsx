import { RotateCw } from "lucide-react";
import { useState } from "react";

type Example = { label: string; url: string };

const EXAMPLES: Example[] = [
  { label: "hosted sign-in example", url: "/labs/hosted-sign-in" },
  { label: "direct sign-in example", url: "/labs/direct-sign-in" },
];

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const btnClass =
  "font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider px-3.5 py-2 border border-[color:var(--rule)] text-[color:var(--ink-2)] bg-transparent transition-colors hover:border-[color:var(--ink-3)] hover:text-[color:var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[color:var(--rule)] disabled:hover:text-[color:var(--ink-2)]";

export default function IframeEmbedTester() {
  const [input, setInput] = useState("");
  const [src, setSrc] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  function load(url?: string) {
    const target = normalizeUrl(url ?? input);
    if (!target) return;
    setSrc(target);
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 font-sans">
      <p className="text-base leading-relaxed text-(--ink-2)">
        Type any URL — your own app, a login screen, an internal tool, anything
        — and load it below in a real{" "}
        <span className="text-(--ink)">&lt;iframe&gt;</span> to check whether it
        renders or gets blocked by{" "}
        <code className="text-(--ink)">X-Frame-Options</code> / CSP{" "}
        <code className="text-(--ink)">frame-ancestors</code>. A blank or
        refused frame means it's blocked — browsers don't expose a
        script-readable reason why, so this is a visual test, not an automated
        pass/fail.
      </p>

      <details className="text-sm text-(--ink-2)">
        <summary className="cursor-pointer">
          Hosted vs. direct sign-in — what's the difference?
        </summary>
        <p className="mt-2 leading-relaxed text-ink-3">
          A hosted flow sends visitors to a separate sign-in page. A direct flow
          starts from the app. Either page may block being shown inside a frame;
          use the examples below to compare redirects, popups, and hidden-frame
          requests.
        </p>
      </details>

      <div className="flex flex-wrap gap-2">
        <input
          aria-label="URL to embed"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
          placeholder="https://example.com or /labs/sample-page"
          className="min-w-0 flex-1 border border-rule px-3 py-2 font-mono text-base text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
        />
        <button onClick={() => load()} className={btnClass}>
          load
        </button>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          disabled={!src}
          className={btnClass}
        >
          <RotateCw size={16} aria-hidden="true" /> reload
        </button>
      </div>

      {EXAMPLES.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm tracking-wider text-ink-3 uppercase">
            quick examples:
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              onClick={() => {
                setInput(ex.url);
                load(ex.url);
              }}
              className={btnClass}
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}

      {src ? (
        <iframe
          key={iframeKey}
          title="embed target"
          src={src}
          className="h-140 w-full border border-rule"
        />
      ) : (
        <div className="flex h-140 w-full items-center justify-center border border-dashed border-rule font-mono text-sm text-ink-3">
          enter a URL above and hit load
        </div>
      )}
    </div>
  );
}
