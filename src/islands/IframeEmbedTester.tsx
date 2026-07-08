import { useState } from "react";

type Example = { label: string; url: string };

const EXAMPLES: Example[] = [
  { label: "mock cognito login", url: "/labs/cognito-child" },
  { label: "mock msal login", url: "/labs/msal-child" },
];

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const btnClass =
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider px-3.5 py-2 border border-[color:var(--rule)] text-[color:var(--ink-2)] bg-transparent transition-colors hover:border-[color:var(--ink-3)] hover:text-[color:var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[color:var(--rule)] disabled:hover:text-[color:var(--ink-2)]";

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
      <p className="text-sm leading-relaxed text-(--ink-2)">
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

      <details className="text-xs text-(--ink-2)">
        <summary className="cursor-pointer">
          Cognito vs. MSAL — what's the difference?
        </summary>
        <p className="mt-2 leading-relaxed text-ink-3">
          MSAL talks to Microsoft Entra ID directly. Cognito sits in front of
          Entra ID as a broker — your app hits Cognito's Hosted UI first, which
          redirects to Entra ID and back. Both paths land on{" "}
          <code className="text-ink-2">login.microsoftonline.com</code> for the
          actual sign-in, so both hit the same iframe-blocking behavior there;
          Cognito just adds an extra hop (and its own headers) before reaching
          Microsoft. Testing both isolates whether a failure is Cognito's fault
          or Microsoft's.
        </p>
      </details>

      <div className="flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
          placeholder="https://example.com or dev.ilogics.iqos.id"
          className="flex-1 border border-rule px-3 py-2 font-mono text-[12.5px] text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none"
        />
        <button onClick={() => load()} className={btnClass}>
          load
        </button>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          disabled={!src}
          className={btnClass}
        >
          ↻ reload
        </button>
      </div>

      {EXAMPLES.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-wider text-ink-3 uppercase">
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
        <div className="flex h-140 w-full items-center justify-center border border-dashed border-rule font-mono text-xs text-ink-3">
          enter a URL above and hit load
        </div>
      )}
    </div>
  );
}
