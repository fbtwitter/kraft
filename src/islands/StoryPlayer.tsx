import { useCallback, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { domToPng } from "modern-screenshot";
import "swiper/css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Template = a genuinely different type treatment (font-family/weight/size,
// the gap rhythm between text blocks, whether an eyebrow label exists at
// all). Only add one when a slide needs a different *kind* of text, not just
// a different arrangement of the same text.
type TemplateId = "prose" | "statement" | "stat";
type TextColor = "light" | "dark";

// Variant = content ordering and placement within a template — never a
// typography change.
type ContentOrder = "title-first" | "body-first";
type Position = "top" | "center" | "bottom";
type Align = "left" | "center";

interface SlideVariant {
  order?: ContentOrder; // default "title-first"
  position?: Position; // default "center"
  align?: Align; // default "center"
}

interface SlideBackground {
  className?: string; // Tailwind bg-* classes (gradient/solid) — used by our own sample slides
  imageUrl?: string; // a real photo, as a host app actually sends — takes priority over className
}

interface SlideLayout {
  template: TemplateId;
  background: SlideBackground;
  textColor?: TextColor; // defaults to "light"
  variant?: SlideVariant;
}

export interface Slide {
  layout: SlideLayout;
  eyebrow?: string; // our own addition for the sample slides — a real host doesn't send this
  title: string;
  body?: string;
  cta?: { label: string; url: string };
  shareable?: boolean; // defaults to true; hides the share button when a slide sets this false
}

export interface InitPayload {
  slides: Slide[];
}

// the shape a real embedding host actually sends (see the ayo-wrapped POC) —
// snake_case, nested content, an opaque template id the host doesn't know
// the meaning of, and no concept of "eyebrow" at all. normalizeRawSlide
// below is what translates this into our internal Slide shape.
export interface RawSlide {
  // "template" is our TemplateId, chosen by the host; "variant" is the
  // host's own label for which content variant this is — unrelated to our
  // internal SlideVariant (order/position/align), just a passthrough string
  retailer_wrapped_template: { template: string; variant?: string };
  background_image?: string;
  shareable?: 0 | 1;
  content: { title: string; body?: string };
  cta?: { label: string; url: string };
  parameter?: Record<string, string>;
}

export interface RawInitPayload {
  slides: RawSlide[];
}

const TEMPLATE_IDS: TemplateId[] = ["prose", "statement", "stat"];

function normalizeRawSlide(raw: RawSlide): Slide {
  const requested = raw.retailer_wrapped_template?.template;
  const template = TEMPLATE_IDS.includes(requested as TemplateId)
    ? (requested as TemplateId)
    : "prose"; // unrecognized/malformed template id — fall back to prose

  return {
    layout: {
      template,
      background: raw.background_image
        ? { imageUrl: raw.background_image }
        : { className: "bg-neutral-900" },
    },
    title: raw.content.title,
    body: raw.content.body,
    cta: raw.cta,
    shareable: raw.shareable !== 0,
  };
}

// stand-ins for the POC's GA4 firing (fireOpen/firePageView/fireEngagement/
// fireComplete/fireShare) — kraft has no backend or analytics account to send
// these to, so they're just postMessage events, visible in the console below
// the player instead of disappearing into a real analytics network call
type AnalyticsMessage =
  | { type: "ANALYTICS"; event: "open" }
  | { type: "ANALYTICS"; event: "page_view"; slideIndex: number }
  | {
      type: "ANALYTICS";
      event: "engagement";
      slideIndex: number;
      seconds: number;
    }
  | { type: "ANALYTICS"; event: "complete" }
  | { type: "ANALYTICS"; event: "share"; slideIndex: number }
  | { type: "ANALYTICS"; event: "exit"; slideIndex: number };

type OutboundMessage =
  | { type: "READY" }
  | { type: "CTA_CLICKED"; url: string; label: string; slideIndex: number }
  | { type: "SHARE_IMAGE"; base64: string; slideIndex: number }
  | { type: "PLAYER_CLOSE_REQUESTED" }
  | AnalyticsMessage;

// true when this page is loaded inside an iframe/webview by a host app,
// rather than viewed standalone (e.g. the kraft experiment page itself)
function isEmbedded() {
  return window.parent !== window;
}

function sendToParent(message: OutboundMessage) {
  if (!isEmbedded()) return;
  // postMessage to '*' is intentional for child→parent: we don't know the
  // host app's origin ahead of time (mirrors the POC this is based on)
  window.parent.postMessage(message, "*");
}

function describeMessage(message: OutboundMessage): string {
  switch (message.type) {
    case "READY":
      return "→ READY";
    case "CTA_CLICKED":
      return `→ CTA_CLICKED "${message.label}"`;
    case "SHARE_IMAGE":
      return `→ SHARE_IMAGE (slide ${message.slideIndex + 1})`;
    case "PLAYER_CLOSE_REQUESTED":
      return "→ PLAYER_CLOSE_REQUESTED";
    case "ANALYTICS":
      switch (message.event) {
        case "open":
          return "→ ANALYTICS open";
        case "page_view":
          return `→ ANALYTICS page_view (slide ${message.slideIndex + 1})`;
        case "engagement":
          return `→ ANALYTICS engagement (slide ${message.slideIndex + 1}, ${message.seconds}s)`;
        case "complete":
          return "→ ANALYTICS complete";
        case "share":
          return `→ ANALYTICS share (slide ${message.slideIndex + 1})`;
        case "exit":
          return `→ ANALYTICS exit (slide ${message.slideIndex + 1})`;
      }
  }
}

const INIT_TIMEOUT_MS = 3000;

const AUTOPLAY_DELAY = 5000;

// used standalone (not embedded) and as the fallback if an embedding host
// never sends an INIT message within INIT_TIMEOUT_MS
const SAMPLE_SLIDES: Slide[] = [
  {
    layout: {
      template: "prose",
      background: {
        className:
          "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500",
      },
      variant: { position: "bottom", align: "left" },
    },
    eyebrow: "kraft · recap",
    title: "Your year in experiments",
    body: "A quick look back at what shipped in the lab.",
  },
  {
    layout: {
      template: "stat",
      background: {
        className: "bg-gradient-to-b from-emerald-500 to-teal-600",
      },
    },
    eyebrow: "shipped",
    title: "5",
    body: "Interactive experiments published so far — from counters to iframe testers.",
  },
  {
    layout: { template: "prose", background: { className: "bg-neutral-900" } },
    eyebrow: "favorite tag",
    title: "“react”",
    body: "Most experiments reach for an island before anything else.",
  },
  {
    layout: {
      template: "statement",
      background: { className: "bg-[color:var(--accent)]" },
      textColor: "dark",
    },
    eyebrow: "keep building",
    title: "More weird stuff coming",
  },
  {
    layout: {
      template: "prose",
      background: {
        className:
          "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500",
      },
      variant: { position: "bottom", align: "left" },
    },
    eyebrow: "kraft",
    title: "Thanks for playing",
    body: "This player is itself an experiment — swipe, tap, or let it autoplay.",
    cta: { label: "View source", url: "https://github.com/fbtwitter/kraft" },
  },
];

interface SlideCardProps {
  slide: Slide;
  slideIndex: number;
  containerRef: (el: HTMLDivElement | null) => void;
  onSend: (message: OutboundMessage) => void;
}

function CTAButton({
  label,
  url,
  slideIndex,
  variant = "light",
  onSend,
}: {
  label: string;
  url: string;
  slideIndex: number;
  variant?: "light" | "dark";
  onSend: (message: OutboundMessage) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // logged either way; only prevents navigation when a host app is
    // actually there to hand it off to
    onSend({ type: "CTA_CLICKED", url, label, slideIndex });
    if (isEmbedded()) e.preventDefault();
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`mt-4 inline-block w-fit rounded-full px-5 py-2.5 font-mono text-xs tracking-wider uppercase transition-colors ${
        variant === "dark"
          ? "bg-black text-white hover:bg-black/80"
          : "bg-white text-black hover:bg-white/85"
      }`}
    >
      {label}
    </a>
  );
}

const POSITION_CLASS: Record<Position, string> = {
  top: "justify-start pt-16",
  center: "justify-center",
  bottom: "justify-end pb-16",
};

const ALIGN_CLASS: Record<Align, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
};

// a real photo (host-provided) draws over the frame with a scrim for text
// legibility; className backgrounds (our own sample slides) don't need one
function SlideBackdrop({ background }: { background: SlideBackground }) {
  if (!background.imageUrl) return null;
  return (
    <>
      <img
        src={background.imageUrl}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
    </>
  );
}

// eyebrow label + heading + optional body — the standard caption/quote slide
function Prose({ slide, slideIndex, containerRef, onSend }: SlideCardProps) {
  const { background, textColor = "light", variant = {} } = slide.layout;
  const {
    order = "title-first",
    position = "center",
    align = "center",
  } = variant;
  const isDark = textColor === "dark";
  const textClass = isDark ? "text-black" : "text-white";
  const mutedClass = isDark ? "text-black/70" : "text-white/70";
  const eyebrowClass = isDark ? "text-black/50" : "text-white/50";

  const title = (
    <h2 key="title" className={`text-2xl font-medium ${textClass}`}>
      {slide.title}
    </h2>
  );
  const body = slide.body && (
    <p
      key="body"
      className={`font-[Inter] text-sm leading-relaxed ${mutedClass}`}
    >
      {slide.body}
    </p>
  );
  const blocks = order === "body-first" ? [body, title] : [title, body];

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col gap-2 px-6 ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} />
      {slide.eyebrow && (
        <p
          className={`font-mono text-xs tracking-wider uppercase ${eyebrowClass}`}
        >
          {slide.eyebrow}
        </p>
      )}
      {blocks}
      {slide.cta && (
        <CTAButton
          {...slide.cta}
          slideIndex={slideIndex}
          variant={isDark ? "dark" : "light"}
          onSend={onSend}
        />
      )}
    </div>
  );
}

// large bold headline, no eyebrow rhythm — for a single standalone statement
function Statement({
  slide,
  slideIndex,
  containerRef,
  onSend,
}: SlideCardProps) {
  const { background, textColor = "light", variant = {} } = slide.layout;
  const {
    order = "title-first",
    position = "center",
    align = "center",
  } = variant;
  const isDark = textColor === "dark";
  const textClass = isDark ? "text-black" : "text-white";
  const mutedClass = isDark ? "text-black/70" : "text-white/70";

  const title = (
    <h2 key="title" className={`text-4xl leading-tight font-bold ${textClass}`}>
      {slide.title}
    </h2>
  );
  const body = slide.body && (
    <p
      key="body"
      className={`font-[Inter] text-sm leading-relaxed ${mutedClass}`}
    >
      {slide.body}
    </p>
  );
  const blocks = order === "body-first" ? [body, title] : [title, body];

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col gap-4 px-8 ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} />
      {blocks}
      {slide.cta && (
        <CTAButton
          {...slide.cta}
          slideIndex={slideIndex}
          variant={isDark ? "dark" : "light"}
          onSend={onSend}
        />
      )}
    </div>
  );
}

// giant isolated numeral/word above a caption panel — its own two-region
// gap rhythm, always in this order, so it doesn't take a variant
function Stat({ slide, slideIndex, containerRef, onSend }: SlideCardProps) {
  const { background } = slide.layout;
  return (
    <div ref={containerRef} className="flex h-full w-full flex-col">
      <div
        className={`relative flex flex-1 items-center justify-center ${background.imageUrl ? "" : background.className}`}
      >
        <SlideBackdrop background={background} />
        <span className="text-6xl font-bold text-white">{slide.title}</span>
      </div>
      <div className="flex flex-col gap-2 bg-black p-6">
        {slide.eyebrow && (
          <p className="font-mono text-xs tracking-wider text-white/50 uppercase">
            {slide.eyebrow}
          </p>
        )}
        {slide.body && (
          <p className="font-[Inter] text-sm leading-relaxed text-white/80">
            {slide.body}
          </p>
        )}
        {slide.cta && (
          <CTAButton
            {...slide.cta}
            slideIndex={slideIndex}
            variant="light"
            onSend={onSend}
          />
        )}
      </div>
    </div>
  );
}

function SlideCard(props: SlideCardProps) {
  switch (props.slide.layout.template) {
    case "prose":
      return <Prose {...props} />;
    case "statement":
      return <Statement {...props} />;
    case "stat":
      return <Stat {...props} />;
  }
}

function ShareIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.2929 2.29289C11.6834 1.90237 12.3166 1.90237 12.7071 2.29289L15.7071 5.29289C16.0976 5.68342 16.0976 6.31658 15.7071 6.70711C15.3166 7.09763 14.6834 7.09763 14.2929 6.70711L13 5.41421V14C13 14.5523 12.5523 15 12 15C11.4477 15 11 14.5523 11 14V5.41421L9.70711 6.70711C9.31658 7.09763 8.68342 7.09763 8.29289 6.70711C7.90237 6.31658 7.90237 5.68342 8.29289 5.29289L11.2929 2.29289ZM4.87868 8.87868C5.44129 8.31607 6.20435 8 7 8H8C8.55228 8 9 8.44772 9 9C9 9.55228 8.55228 10 8 10H7C6.73478 10 6.48043 10.1054 6.29289 10.2929C6.10536 10.4804 6 10.7348 6 11V19C6 19.2652 6.10536 19.5196 6.29289 19.7071C6.48043 19.8946 6.73478 20 7 20H17C17.2652 20 17.5196 19.8946 17.7071 19.7071C17.8946 19.5196 18 19.2652 18 19V11C18 10.7348 17.8946 10.4804 17.7071 10.2929C17.5196 10.1054 17.2652 10 17 10H16C15.4477 10 15 9.55228 15 9C15 8.44772 15.4477 8 16 8H17C17.7957 8 18.5587 8.31607 19.1213 8.87868C19.6839 9.44129 20 10.2043 20 11V19C20 19.7957 19.6839 20.5587 19.1213 21.1213C18.5587 21.6839 17.7957 22 17 22H7C6.20435 22 5.44129 21.6839 4.87868 21.1213C4.31607 20.5587 4 19.7957 4 19V11C4 10.2044 4.31607 9.44129 4.87868 8.87868Z"
        fill="white"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z"
        fill="#FEFEFE"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

interface LogEntry {
  id: number;
  text: string;
}

function PostMessageConsole({
  log,
  logRef,
}: {
  log: LogEntry[];
  logRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={logRef}
      className="fixed right-4 bottom-4 z-50 max-h-[50vh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-black/20 bg-black/90 p-3 font-mono text-[11px] leading-relaxed text-white shadow-lg"
    >
      {log.length === 0 ? (
        <span className="text-white/40">
          postMessage traffic will appear here…
        </span>
      ) : (
        log.map((entry) => (
          <div key={entry.id} className="text-emerald-300">
            {entry.text}
          </div>
        ))
      )}
    </div>
  );
}

export default function StoryPlayer() {
  const [slides, setSlides] = useState<Slide[]>(SAMPLE_SLIDES);
  const [slidesSource, setSlidesSource] = useState<"sample" | "init">("sample");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fillPercent, setFillPercent] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [closed, setClosed] = useState(false);
  // isEmbedded() reads window.parent, which doesn't exist during SSR — this
  // is set after mount so the close button only ever renders client-side
  const [embedded, setEmbedded] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slideStartRef = useRef(Date.now());
  const activeIndexRef = useRef(0);
  const logIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const emit = useCallback((message: OutboundMessage) => {
    logIdRef.current += 1;
    // capture the id now — reading logIdRef.current from inside the updater
    // instead would race with any emit() calls made before React processes
    // this update, since the updater reads the ref live at that later point
    const id = logIdRef.current;
    setLog((entries) =>
      [...entries, { id, text: describeMessage(message) }].slice(-8),
    );
    sendToParent(message);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // fires regardless of embedding — stands in for the POC's GA4 "open"
  // event, which used to happen on every session, not only embedded ones
  useEffect(() => {
    emit({ type: "ANALYTICS", event: "open" });
    emit({ type: "ANALYTICS", event: "page_view", slideIndex: 0 });
  }, [emit]);

  useEffect(() => {
    if (!isEmbedded()) return; // standalone — sample slides are enough
    setEmbedded(true);

    emit({ type: "READY" });

    const timer = setTimeout(() => {
      // no INIT arrived in time — keep showing the sample slides
    }, INIT_TIMEOUT_MS);

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as { type?: string; payload?: RawInitPayload };

      if (
        msg?.type === "INIT" &&
        Array.isArray(msg.payload?.slides) &&
        msg.payload.slides.length > 0 &&
        msg.payload.slides.every((s) => typeof s?.content?.title === "string")
      ) {
        clearTimeout(timer);
        setSlides(msg.payload.slides.map(normalizeRawSlide));
        setSlidesSource("init");
        setActiveIndex(0);
        setFillPercent(0);
        return;
      }

      // SPECIAL CASE (mirrors ADR-0002 in the POC): the host confirms the
      // close request right before it tears the iframe/webview down, so we
      // fire "exit" with the last slide the visitor actually saw
      if (msg?.type === "PLAYER_CLOSE") {
        emit({
          type: "ANALYTICS",
          event: "exit",
          slideIndex: activeIndexRef.current,
        });
        setClosed(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timer);
    };
  }, [emit]);

  const handleCloseRequest = useCallback(() => {
    emit({ type: "PLAYER_CLOSE_REQUESTED" });
  }, [emit]);

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      setShowHint(false);
      const seconds = Math.round((Date.now() - slideStartRef.current) / 1000);
      emit({
        type: "ANALYTICS",
        event: "engagement",
        slideIndex: swiper.previousIndex,
        seconds,
      });
      slideStartRef.current = Date.now();
      activeIndexRef.current = swiper.activeIndex;
      setActiveIndex(swiper.activeIndex);
      setFillPercent(0);
      emit({
        type: "ANALYTICS",
        event: "page_view",
        slideIndex: swiper.activeIndex,
      });
    },
    [emit],
  );

  const handleReachEnd = useCallback(() => {
    emit({ type: "ANALYTICS", event: "complete" });
  }, [emit]);

  const handleAutoplayTimeLeft = useCallback(
    (_swiper: SwiperType, _time: number, percentage: number) => {
      setFillPercent(1 - percentage);
    },
    [],
  );

  const handleTap = useCallback(
    (swiper: SwiperType, event: MouseEvent | TouchEvent | PointerEvent) => {
      setShowHint(false);
      const target = event.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) return;
      const clientX =
        "changedTouches" in event
          ? event.changedTouches[0].clientX
          : (event as MouseEvent).clientX;
      const rect = swiper.el.getBoundingClientRect();
      if (clientX - rect.left > rect.width / 2) swiper.slideNext();
      else swiper.slidePrev();
    },
    [],
  );

  const handleShare = useCallback(async () => {
    const el = slideRefs.current[activeIndex];
    if (!el) return;
    setCapturing(true);
    try {
      const dataUrl = await domToPng(el, { scale: window.devicePixelRatio });
      const filename = `story-slide-${activeIndex + 1}.png`;

      emit({ type: "ANALYTICS", event: "share", slideIndex: activeIndex });

      // embedded — hand the image to the host app instead of handling it
      // ourselves
      if (isEmbedded()) {
        emit({ type: "SHARE_IMAGE", base64: dataUrl, slideIndex: activeIndex });
        return;
      }

      const file = new File([await (await fetch(dataUrl)).blob()], filename, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Story Player" });
          return;
        } catch (err) {
          // user dismissed the native share sheet — fall through to download
          if ((err as Error).name !== "AbortError") throw err;
          return;
        }
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } finally {
      setCapturing(false);
    }
  }, [activeIndex, emit]);

  return (
    <>
      <div className="relative mx-auto aspect-390/844 h-[min(100dvh,844px)] w-auto max-w-full overflow-hidden rounded-2xl bg-black select-none">
        <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 pt-3">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              {embedded ? (
                <button
                  onClick={handleCloseRequest}
                  aria-label="Close"
                  className="p-1 text-white"
                >
                  <CloseIcon />
                </button>
              ) : (
                <div className="h-7 w-7" />
              )}
              <span className="font-[Inter] text-base font-semibold text-white">
                Story Player
              </span>
            </div>
            {(slides[activeIndex]?.shareable ?? true) ? (
              <button
                onClick={handleShare}
                disabled={capturing}
                aria-label="Download current slide as image"
                className="p-1 text-white disabled:opacity-40"
              >
                <ShareIcon />
              </button>
            ) : (
              <div className="h-7 w-7" />
            )}
          </div>
          <div className="flex gap-1 px-3">
            {slides.map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full rounded-full bg-white transition-none"
                  style={{
                    width:
                      i < activeIndex
                        ? "100%"
                        : i === activeIndex
                          ? `${fillPercent * 100}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <Swiper
          key={slidesSource}
          modules={[Autoplay]}
          autoplay={{ delay: AUTOPLAY_DELAY, disableOnInteraction: false }}
          onSlideChange={handleSlideChange}
          onReachEnd={handleReachEnd}
          onAutoplayTimeLeft={handleAutoplayTimeLeft}
          onClick={handleTap}
          className="h-full w-full"
          allowTouchMove
        >
          {slides.map((slide, i) => (
            <SwiperSlide key={i}>
              <SlideCard
                slide={slide}
                slideIndex={i}
                onSend={emit}
                containerRef={(el) => {
                  slideRefs.current[i] = el;
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {showHint && (
          <div className="pointer-events-none absolute right-4 bottom-10 z-20">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 font-mono text-xs text-white">
              tap right to continue
              <ChevronIcon />
            </div>
          </div>
        )}

        {closed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 font-mono text-xs tracking-wider text-white/70 uppercase">
            player closed
          </div>
        )}
      </div>

      <PostMessageConsole log={log} logRef={logRef} />
    </>
  );
}
