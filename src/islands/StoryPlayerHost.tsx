import SelectField from "./SelectField";
import { useEffect, useRef, useState } from "react";
import type { RawInitPayload, RawSlide } from "./StoryPlayer";

// a dedicated minimal page, not the experiment's own auto-generated
// "/island" route — that route renders the whole MDX file, which includes
// this very host component, so pointing here would recursively iframe itself
const CHILD_SRC = "/labs/story-player-child";

// Local pastel backdrops stand in for campaign images while keeping the
// source project's full-bleed image and focal-point behavior visible.
const createDemoImage = (start: string, end: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="390" height="844" fill="url(#g)"/><circle cx="195" cy="260" r="90" fill="white" fill-opacity=".35"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const DEMO_IMAGE = createDemoImage("#fff5df", "#f7cbb7");
const DEMO_IMAGE_BLUE = createDemoImage("#eff6ff", "#c7d2fe");
const DEMO_IMAGE_GREEN = createDemoImage("#ecfdf5", "#d1fae5");
const DEMO_IMAGE_LILAC = createDemoImage("#f5f3ff", "#fbcfe8");

// a second, visually distinct data URI standing in for an inline
// image within the content stack — deliberately different from DEMO_IMAGE
// (a full-bleed background) so the two are obviously different sources
const DEMO_INLINE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2306b6d4'/%3E%3Cstop offset='1' stop-color='%233b82f6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23p)'/%3E%3Crect x='60' y='60' width='180' height='180' rx='16' fill='white' fill-opacity='0.25'/%3E%3C/svg%3E";

// Source-compatible slide payloads with sample-only content and images.
const HOST_SLIDES: RawSlide[] = [
  {
    // template id 1 -> centered layout
    retailer_wrapped_template_id: "1",
    background_image: DEMO_IMAGE,
    content: [
      { style: "title", order: 1, value: "Kilas Balik 2026" },
      {
        style: "body",
        order: 2,
        value: "Hai {nama}! Tahun ini penuh momen seru.",
      },
      {
        style: "body",
        order: 3,
        value: "Yuk lihat kembali beberapa yang paling berkesan.",
      },
      { style: "pointer", order: 4, value: "Ketuk sisi kanan untuk lanjut" },
    ],
    parameter: {
      nama: "Alex",
    },
  },
  {
    // template id 2 -> centered layout
    retailer_wrapped_template_id: "2",
    background_image: DEMO_IMAGE_BLUE,
    content: [
      {
        style: "body",
        order: 1,
        value: "Satu momen kecil mengubah hari biasa menjadi istimewa.",
      },
      { style: "image_url", order: 2, value: DEMO_INLINE_IMAGE },
      { style: "title", order: 3, value: "Momen Favorit" },
      {
        style: "body",
        order: 4,
        value: "Tersimpan sebagai salah satu sorotan tahun ini.",
      },
    ],
  },
  {
    // template id 3 -> centered layout
    retailer_wrapped_template_id: "3",
    background_image: DEMO_IMAGE_GREEN,
    content: [
      {
        style: "body",
        order: 1,
        value: "Setiap langkah kecil membentuk cerita yang lebih besar.",
      },
      { style: "image_parameter", order: 2, value: "{highlight_image}" },
      { style: "title", order: 3, value: "Terus Bertumbuh" },
      {
        style: "body",
        order: 4,
        value: "Sedikit demi sedikit, banyak hal berhasil kamu capai.",
      },
    ],
    parameter: { highlight_image: DEMO_INLINE_IMAGE },
  },
  {
    // template id 4 -> top aligned
    retailer_wrapped_template_id: "4",
    background_image: DEMO_IMAGE_LILAC,
    background_focal_point: "top",
    content: [
      {
        style: "body",
        order: 1,
        value: "Lebih banyak alasan untuk merayakan.",
      },
      { style: "title", order: 2, value: "1.284 Momen" },
      {
        style: "body",
        order: 3,
        value: "Satu per satu, semuanya membawamu lebih jauh.",
      },
    ],
  },
  {
    // template id 5 -> centered layout
    retailer_wrapped_template_id: "5",
    background_image: DEMO_IMAGE_BLUE,
    content: [
      {
        style: "body",
        order: 1,
        value: "Hal yang paling sering kamu cari tahun ini...",
      },
      { style: "title", order: 2, value: "Paling Dicari" },
      { style: "image_parameter", order: 3, value: "{highlight_image}" },
      {
        style: "body",
        order: 4,
        value: "Sebuah momen kecil yang berarti banyak.",
      },
    ],
    parameter: { highlight_image: DEMO_INLINE_IMAGE },
  },
  {
    // template id 6 -> centered layout
    retailer_wrapped_template_id: "6",
    background_image: DEMO_IMAGE_GREEN,
    content: [
      {
        style: "body",
        order: 1,
        value: "Momen terasa lebih berarti saat dibagikan.",
      },
      { style: "title", order: 2, value: "Cerita Bersama" },
      { style: "image_url", order: 3, value: DEMO_INLINE_IMAGE },
      {
        style: "body",
        order: 4,
        value: "Terima kasih sudah mengajak orang lain ikut merayakannya.",
      },
    ],
  },
  {
    // template id 7 -> centered layout
    retailer_wrapped_template_id: "7",
    background_image: DEMO_IMAGE_LILAC,
    content: [
      { style: "title", order: 1, value: "Terima Kasih!" },
      {
        style: "body",
        order: 2,
        value: "Perjalananmu tahun ini luar biasa.",
      },
      {
        style: "body",
        order: 3,
        value: "Semoga tahun depan menghadirkan cerita baru.",
      },
      {
        style: "body",
        order: 4,
        value: "Terus melangkah, satu hari pada satu waktu.",
      },
    ],
  },
  {
    // template id 8 -> centered layout with a light CTA
    retailer_wrapped_template_id: "8",
    background_image: DEMO_IMAGE,
    cta_variant: "light",
    content: [
      { style: "title", order: 1, value: "Siap menyambut tahun berikutnya?" },
      {
        style: "body",
        order: 2,
        value: "Simpan cerita favoritmu untuk dikenang kembali.",
      },
      {
        style: "cta",
        order: 3,
        value: { label: "Lihat Kilas Balik", url: "https://example.com" },
      },
    ],
  },
];

type LogEntry = { id: number; text: string };

const PRESETS: { id: string; label: string; slides: RawSlide[] }[] = [
  { id: "recap", label: "Year in review sample", slides: HOST_SLIDES },
  {
    id: "layouts",
    label: "Typography sampler",
    slides: [
      { ...HOST_SLIDES[0], retailer_wrapped_template: "prose" },
      {
        retailer_wrapped_template_id: "1",
        retailer_wrapped_template: "stat",
        background_image: DEMO_IMAGE,
        content: [
          { style: "title", order: 1, value: "1,284" },
          {
            style: "body",
            order: 2,
            value:
              "Transactions this year. A big number with a little context.",
          },
        ],
      },
      {
        retailer_wrapped_template_id: "1",
        retailer_wrapped_template: "statement",
        background_image: DEMO_IMAGE,
        content: [{ style: "title", order: 1, value: "Keep making things." }],
      },
    ],
  },
  {
    id: "media",
    label: "Images & links",
    slides: [HOST_SLIDES[1], HOST_SLIDES[2], HOST_SLIDES[7]],
  },
];

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
  const [presetId, setPresetId] = useState("recap");

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
        await navigator.share({ files: [file], title: "Kilas Balik" });
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
        const payload: RawInitPayload = {
          slides: PRESETS.find((preset) => preset.id === presetId)!.slides,
        };
        iframeRef.current?.contentWindow?.postMessage(
          { type: "INIT", payload },
          "*",
        );
        pushLog("→ INIT (custom slides)");
        return;
      }

      if (msg.type === "PLAYER_CLOSE_REQUESTED") {
        pushLog("← PLAYER_CLOSE_REQUESTED");
        iframeRef.current?.contentWindow?.postMessage(
          { type: "PLAYER_CLOSE" },
          "*",
        );
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
        shareOrDownload(
          msg.base64,
          `story-slide-${msg.slideIndex + 1}.png`,
        ).catch(() => pushLog("Could not share this image. Please try again."));
        return;
      }

      pushLog(
        `← ${msg.type === "ANALYTICS" ? `ANALYTICS ${msg.event}` : (msg.type ?? "unknown message")}`,
      );
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [reloadKey, presetId]);

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4">
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-(--ink-2)">
            Try a preset
            <SelectField
              aria-label="Try a preset"
              value={presetId}
              onValueChange={(value) => {
                setPresetId(value);
                setLog([]);
                setReloadKey((key) => key + 1);
              }}
              className="min-h-11 w-full rounded-lg border border-(--rule) bg-(--surface) px-3 text-(--ink)"
            >
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </SelectField>
          </label>
          <button
            onClick={() => {
              setLog([]);
              setReloadKey((k) => k + 1);
            }}
            className="min-h-11 rounded-lg border border-(--rule) px-3 text-sm text-(--ink-2) hover:text-(--ink)"
          >
            Restart
          </button>
        </div>

        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={CHILD_SRC}
          title="story player (embedded via iframe)"
          className="aspect-390/1120 w-full rounded-2xl border border-(--rule)"
        />
      </div>

      <details className="rounded-lg border border-(--rule) p-3 text-sm text-(--ink-2)">
        <summary className="cursor-pointer py-2">Inspect messages</summary>
        <p className="mb-3 text-sm leading-relaxed">
          The host sends the selected preset to the embedded player. Its replies
          appear below.
        </p>
        <div
          ref={logRef}
          className="max-h-48 min-h-16 w-full overflow-y-auto bg-(--surface) p-3 font-mono text-sm leading-relaxed text-(--ink-2)"
        >
          {log.length === 0 ? (
            <span className="text-(--ink-3)">
              waiting for the iframe to load…
            </span>
          ) : (
            log.map((entry) => <div key={entry.id}>{entry.text}</div>)
          )}
        </div>
      </details>
    </div>
  );
}
