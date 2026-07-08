import { useEffect, useRef, useState } from "react";
import type { RawInitPayload, RawSlide } from "./StoryPlayer";

// a dedicated minimal page, not the experiment's own auto-generated
// "/island" route — that route renders the whole MDX file, which includes
// this very host component, so pointing here would recursively iframe itself
const CHILD_SRC = "/labs/story-player-child";

// a plain SVG data URI standing in for a real S3-hosted photo — kraft is
// static with no asset backend, but the shape (a URL string) is what matters
const DEMO_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='390' height='844'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23fbbf24'/%3E%3Cstop offset='1' stop-color='%23f43f5e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='390' height='844' fill='url(%23g)'/%3E%3Ccircle cx='195' cy='260' r='90' fill='white' fill-opacity='0.25'/%3E%3C/svg%3E";

// the exact wire shape a real embedding host sends (see the ayo-wrapped POC)
// — deliberately different content from StoryPlayer's SAMPLE_SLIDES, so it's
// obvious this came from the host's INIT message, not the child's fallback
const HOST_SLIDES: RawSlide[] = [
  {
    retailer_wrapped_template: { template: "prose", variant: "template_1" },
    background_image: DEMO_IMAGE,
    shareable: 1,
    content: {
      title: "Sent from the parent page",
      body: "This content arrived over postMessage, not the child's sample data.",
    },
    parameter: { nama_toko: "", retailer_id: "1000", top_sell_sku: "MLDH-01" },
  },
  {
    retailer_wrapped_template: { template: "statement", variant: "template_2" },
    shareable: 0,
    content: {
      title: "Tap the CTA below",
      body: "It won't navigate — it postMessages CTA_CLICKED back to this page.",
    },
    cta: { label: "Test CTA", url: "https://example.com" },
    parameter: { nama_toko: "", retailer_id: "1000", top_sell_sku: "MLDH-01" },
  },
];

type LogEntry = { id: number; text: string };

// what the host actually receives from the child (mirrors StoryPlayer's
// OutboundMessage) — typed so CTA_CLICKED/SHARE_IMAGE can be handled the way
// a real embedding app would, not just logged as opaque text
type FromChildMessage =
  | { type: "READY" }
  | { type: "CTA_CLICKED"; url: string; label: string; slideIndex: number }
  | { type: "SHARE_IMAGE"; base64: string; slideIndex: number }
  | { type: "PLAYER_CLOSE_REQUESTED" }
  | { type: "ANALYTICS"; event: string }
  | { type?: undefined };

export default function StoryPlayerHost() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  function pushLog(text: string) {
    idRef.current += 1;
    // capture the id now — reading idRef.current from inside the updater
    // instead would race with any pushLog() calls made before React
    // processes this update, since the updater reads the ref live at that
    // later point (bit us once already in StoryPlayer's equivalent code)
    const id = idRef.current;
    setLog((entries) => [...entries, { id, text }].slice(-8));
  }

  async function shareOrDownload(dataUrl: string, filename: string) {
    const file = new File([await (await fetch(dataUrl)).blob()], filename, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Story Player" });
        pushLog("→ shared via native share sheet");
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          pushLog("→ share cancelled");
          return;
        }
        // real failure, not a user cancel — fall through to download
      }
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
    pushLog("→ downloaded image");
  }

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const msg = event.data as FromChildMessage;

      if (msg.type === "READY") {
        pushLog("← READY");
        const payload: RawInitPayload = { slides: HOST_SLIDES };
        iframeRef.current?.contentWindow?.postMessage({ type: "INIT", payload }, "*");
        pushLog("→ INIT (custom slides)");
        return;
      }

      if (msg.type === "PLAYER_CLOSE_REQUESTED") {
        pushLog("← PLAYER_CLOSE_REQUESTED");
        iframeRef.current?.contentWindow?.postMessage({ type: "PLAYER_CLOSE" }, "*");
        pushLog("→ PLAYER_CLOSE");
        return;
      }

      // "the embedding app handles the actual navigation" (kraft's CTA
      // definition) — the player only ever fires the message, never navigates
      // itself once embedded, so the host is the one that has to act on it
      if (msg.type === "CTA_CLICKED") {
        pushLog(`← CTA_CLICKED "${msg.label}"`);
        window.open(msg.url, "_blank", "noopener,noreferrer");
        pushLog(`→ opened ${msg.url}`);
        return;
      }

      // the base64 image is useless sitting in the message log — a real
      // host would actually do something with it: try the native share
      // sheet first, falling back to a download if it's unsupported
      if (msg.type === "SHARE_IMAGE") {
        pushLog(`← SHARE_IMAGE (slide ${msg.slideIndex + 1})`);
        shareOrDownload(msg.base64, `story-slide-${msg.slideIndex + 1}.png`);
        return;
      }

      pushLog(`← ${msg.type ?? "unknown message"}`);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [reloadKey]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex w-full max-w-[390px] shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-wider text-(--ink-3) uppercase">
            host page → iframe
          </span>
          <button
            onClick={() => {
              setLog([]);
              setReloadKey((k) => k + 1);
            }}
            className="font-mono text-[11px] tracking-wider text-(--ink-2) uppercase hover:text-(--ink)"
          >
            ↻ reload
          </button>
        </div>

        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={CHILD_SRC}
          title="story player (embedded via iframe)"
          className="aspect-390/844 w-full rounded-2xl border border-(--rule)"
        />
      </div>

      <div
        ref={logRef}
        className="max-h-40 min-h-16 w-full overflow-y-auto border border-(--rule) bg-(--surface) p-3 font-mono text-[11px] leading-relaxed text-(--ink-2) sm:sticky sm:top-4 sm:max-h-[70vh] sm:flex-1"
      >
        {log.length === 0 ? (
          <span className="text-(--ink-3)">waiting for the iframe to load…</span>
        ) : (
          log.map((entry) => <div key={entry.id}>{entry.text}</div>)
        )}
      </div>
    </div>
  );
}
