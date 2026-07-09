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
import "@fontsource/passion-one/400.css";

// Template = a genuinely different type treatment (font-family/weight/size,
// the gap rhythm between text blocks, whether an eyebrow label exists at
// all). Only add one when a slide needs a different *kind* of text, not just
// a different arrangement of the same text.
type TemplateId = "prose" | "statement" | "stat";
type TextColor = "light" | "dark";

// Variant = content placement within a template — never a typography
// change. Content *order* isn't a variant concern anymore: it's carried
// directly by the order of Slide.content itself.
type Position = "top" | "center" | "bottom";
type Align = "left" | "center";

interface SlideVariant {
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

// Mirrors RawContentBlock's styles, collapsing image_url/image_parameter into
// one "image" style — both resolve to a plain URL at the INIT boundary (see
// normalizeRawSlide), so nothing downstream needs to know which one it was.
// Order is meaningful: Slide.content renders in array order, and a style may
// repeat (e.g. body, title, body, cta) — templates must not assume a fixed
// title-then-body shape.
// a run of text, or a run resolved from a "{key}" placeholder (e.g.
// "{nama_toko}" inside "hari ini {nama_toko} sangat berprestasi") —
// fromParameter runs render bold so only the dynamic part stands out
export interface TextSegment {
  text: string;
  fromParameter?: boolean;
}

export type SlideBlock =
  | { style: "title"; value: TextSegment[] }
  | { style: "body"; value: TextSegment[] }
  | { style: "image"; value: string } // resolved image URL
  | { style: "cta"; value: { label: string; url: string } };

export interface Slide {
  layout: SlideLayout;
  eyebrow?: string; // our own addition for the sample slides — a real host doesn't send this
  content: SlideBlock[];
  shareable?: boolean; // defaults to true; hides the share button when a slide sets this false
  pointerHint?: string; // the "tap to continue" hint text; hidden entirely when unset
}

export interface InitPayload {
  slides: Slide[];
}

// the shape a real embedding host actually sends (see the ayo-wrapped POC) —
// snake_case, an ordered array of typed content blocks, an opaque template
// id the host doesn't know the meaning of, and no concept of "eyebrow" at
// all. normalizeRawSlide below is what translates this into our internal
// Slide shape.
export type RawContentBlock =
  | { style: "title" | "body"; order: number; value: string }
  // an inline image within the content stack — distinct from the slide-level
  // background_image. image_url's value is a direct URL; image_parameter's
  // value is a "{key}" placeholder resolved against the slide's parameter
  // object into a URL (see resolveParameterPlaceholder below)
  | { style: "image_url" | "image_parameter"; order: number; value: string }
  | { style: "cta"; order: number; value: { label: string; url: string } };

export interface RawSlide {
  // an opaque id the host assigns (e.g. "template_1") — unrelated to our
  // TemplateId strings, so it always falls back to "prose" below. Different
  // host versions send this as either a bare string or a {template, variant}
  // object — both are handled at the INIT boundary in normalizeRawSlide.
  retailer_wrapped_template: string | { template: string; variant?: string };
  background_image?: string;
  shareable?: 0 | 1;
  // the "tap to continue" hint text itself — shown only when non-empty
  pointer?: string;
  content: RawContentBlock[];
  parameter?: Record<string, string>;
}

export interface RawInitPayload {
  slides: RawSlide[];
}

const TEMPLATE_IDS: TemplateId[] = ["prose", "statement", "stat"];

// the host's own variant ids, several of which can mean the same position
const VARIANT_POSITION: Record<string, Position> = {
  "1": "center",
  "2": "center",
  "3": "center",
  "4": "top",
  "5": "center",
  "6": "center",
  "7": "center",
  "8": "center",
};

// image_parameter's value is always exactly one "{key}" placeholder,
// resolved whole against the slide's parameter object into an image URL
function resolveImageParameter(
  value: string,
  parameter?: Record<string, string>,
): string {
  const match = value.match(/^\{(.+)\}$/);
  return match ? (parameter?.[match[1]] ?? "") : value;
}

// title/body values can mix literal text with inline "{key}" placeholders
// (e.g. "hari ini {nama_toko} sangat berprestasi") — each placeholder is
// resolved against the parameter object and split into its own segment, so
// only that resolved run renders bold, not the whole title/body
function parseTextSegments(
  raw: string,
  parameter?: Record<string, string>,
): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /\{([^{}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index) });
    }
    const resolved = parameter?.[match[1]];
    if (resolved) segments.push({ text: resolved, fromParameter: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex) });
  }
  return segments;
}

function normalizeRawSlide(raw: RawSlide): Slide {
  const rawTemplate = raw.retailer_wrapped_template;
  const templateId =
    typeof rawTemplate === "string" ? rawTemplate : rawTemplate.template;
  const variantId =
    typeof rawTemplate === "string" ? undefined : rawTemplate.variant;

  const template = TEMPLATE_IDS.includes(templateId as TemplateId)
    ? (templateId as TemplateId)
    : "prose"; // unrecognized/malformed template id — fall back to prose
  const position = variantId ? VARIANT_POSITION[variantId] : undefined;

  const content: SlideBlock[] = [...raw.content]
    .sort((a, b) => a.order - b.order)
    .flatMap((b): SlideBlock[] => {
      switch (b.style) {
        case "title":
        case "body": {
          const segments = parseTextSegments(b.value, raw.parameter);
          // no segments (e.g. the whole value was one unresolved parameter)
          // renders nothing rather than a blank title/paragraph in its place
          return segments.length ? [{ style: b.style, value: segments }] : [];
        }
        case "image_url":
          return [{ style: "image", value: b.value }];
        case "image_parameter": {
          const resolved = resolveImageParameter(b.value, raw.parameter);
          // an empty/unresolved parameter renders no image rather than a
          // broken <img> in its place
          return resolved ? [{ style: "image", value: resolved }] : [];
        }
        case "cta":
          return [{ style: "cta", value: b.value }];
      }
    });

  return {
    layout: {
      template,
      background: raw.background_image
        ? { imageUrl: raw.background_image }
        : { className: "bg-neutral-900" },
      variant: position ? { position } : undefined,
    },
    content,
    shareable: raw.shareable !== 0,
    pointerHint: raw.pointer || undefined,
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
    content: [
      { style: "title", value: [{ text: "Your year in experiments" }] },
      {
        style: "body",
        value: [{ text: "A quick look back at what shipped in the lab." }],
      },
    ],
    pointerHint: "tap right to continue",
  },
  {
    layout: {
      template: "stat",
      background: {
        className: "bg-gradient-to-b from-emerald-500 to-teal-600",
      },
    },
    eyebrow: "shipped",
    content: [
      { style: "title", value: [{ text: "5" }] },
      {
        style: "body",
        value: [
          {
            text: "Interactive experiments published so far — from counters to iframe testers.",
          },
        ],
      },
    ],
  },
  {
    layout: { template: "prose", background: { className: "bg-neutral-900" } },
    eyebrow: "favorite tag",
    // deliberately body-before-title, to exercise arbitrary block order
    content: [
      {
        style: "body",
        value: [{ text: "Most experiments reach for an island before anything else." }],
      },
      { style: "title", value: [{ text: "“react”" }] },
    ],
  },
  {
    layout: {
      template: "statement",
      background: { className: "bg-[color:var(--accent)]" },
      textColor: "dark",
    },
    eyebrow: "keep building",
    content: [{ style: "title", value: [{ text: "More weird stuff coming" }] }],
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
    content: [
      { style: "title", value: [{ text: "Thanks for playing" }] },
      {
        style: "body",
        value: [
          {
            text: "This player is itself an experiment — swipe, tap, or let it autoplay.",
          },
        ],
      },
      {
        style: "cta",
        value: { label: "View source", url: "https://github.com/fbtwitter/kraft" },
      },
    ],
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
      className={`block w-full rounded-[24px] px-5 py-3 text-center font-['Inter'] text-base font-semibold transition-colors ${
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

// shared across every "title"-style block render (Prose, Statement, Stat's
// numeral) so the design spec's font/size stays in one place
const TITLE_CLASS = "font-['Passion_One'] text-[64px] leading-none font-normal";

// shared across every "image"-style block render
const IMAGE_CLASS = "mx-auto max-h-[280px] max-w-[280px] w-full rounded-lg object-cover";

// caps the content stack's line length regardless of how wide the slide
// itself renders; centered within its parent's position/align flex rules.
// p-4 (16px all sides) is the content wrapper's own padding — templates no
// longer add their own horizontal padding on top of this.
const CONTENT_CLASS = "flex w-full max-w-[380px] flex-col p-4";

// renders a title/body block's segments — only the parameter-resolved runs
// (e.g. "{nama_toko}") are wrapped bold, everything else stays inline text
function renderSegments(segments: TextSegment[]) {
  return segments.map((seg, i) =>
    seg.fromParameter ? (
      <strong key={i} className="font-bold">
        {seg.text}
      </strong>
    ) : (
      seg.text
    ),
  );
}

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

// eyebrow label + an ordered stack of title/body/cta blocks — the standard
// caption/quote slide. Blocks render in whatever order the slide gives them
// (body, title, body, cta — anything), each styled by its own `style`.
function Prose({ slide, slideIndex, containerRef, onSend }: SlideCardProps) {
  const { background, textColor = "light", variant = {} } = slide.layout;
  const { position = "center", align = "center" } = variant;
  const isDark = textColor === "dark";
  const eyebrowClass = isDark ? "text-black/50" : "text-white/50";

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} />
      <div className={`${CONTENT_CLASS} gap-4`}>
        {slide.eyebrow && (
          <p
            className={`font-mono text-xs tracking-wider uppercase ${eyebrowClass}`}
          >
            {slide.eyebrow}
          </p>
        )}
        {slide.content.map((block, i) => {
          switch (block.style) {
            case "title":
              return (
                <h2 key={i} className={`${TITLE_CLASS} text-white`}>
                  {renderSegments(block.value)}
                </h2>
              );
            case "body":
              return (
                <p
                  key={i}
                  className="font-[Inter] text-sm leading-relaxed text-white"
                >
                  {renderSegments(block.value)}
                </p>
              );
            case "image":
              return <img key={i} src={block.value} alt="" className={IMAGE_CLASS} />;
            case "cta":
              return (
                <CTAButton
                  key={i}
                  {...block.value}
                  slideIndex={slideIndex}
                  variant={isDark ? "dark" : "light"}
                  onSend={onSend}
                />
              );
          }
        })}
      </div>
    </div>
  );
}

// large bold headline, no eyebrow rhythm — for a single standalone
// statement. Same ordered-block rendering as Prose, just its own typography.
function Statement({
  slide,
  slideIndex,
  containerRef,
  onSend,
}: SlideCardProps) {
  const { background, textColor = "light", variant = {} } = slide.layout;
  const { position = "center", align = "center" } = variant;
  const isDark = textColor === "dark";

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} />
      <div className={`${CONTENT_CLASS} gap-4`}>
        {slide.content.map((block, i) => {
          switch (block.style) {
            case "title":
              return (
                <h2 key={i} className={`${TITLE_CLASS} text-white`}>
                  {renderSegments(block.value)}
                </h2>
              );
            case "body":
              return (
                <p
                  key={i}
                  className="font-[Inter] text-sm leading-relaxed text-white"
                >
                  {renderSegments(block.value)}
                </p>
              );
            case "image":
              return <img key={i} src={block.value} alt="" className={IMAGE_CLASS} />;
            case "cta":
              return (
                <CTAButton
                  key={i}
                  {...block.value}
                  slideIndex={slideIndex}
                  variant={isDark ? "dark" : "light"}
                  onSend={onSend}
                />
              );
          }
        })}
      </div>
    </div>
  );
}

// giant isolated numeral/word above a caption panel — its own two-region
// gap rhythm, always in this order, so it doesn't take a variant. The first
// "title" block in slide.content is the numeral; everything else (including
// any later title blocks) flows into the panel below, in original order.
function Stat({ slide, slideIndex, containerRef, onSend }: SlideCardProps) {
  const { background } = slide.layout;
  const numeral = slide.content.find(
    (b): b is Extract<SlideBlock, { style: "title" }> => b.style === "title",
  );
  const panelBlocks = numeral
    ? slide.content.filter((b) => b !== numeral)
    : slide.content;

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col">
      <div
        className={`relative flex flex-1 items-center justify-center ${background.imageUrl ? "" : background.className}`}
      >
        <SlideBackdrop background={background} />
        {numeral && (
          <div className={`${CONTENT_CLASS} items-center text-center`}>
            <span className={`${TITLE_CLASS} text-white`}>
              {renderSegments(numeral.value)}
            </span>
          </div>
        )}
      </div>
      <div className="bg-black">
        <div className={`${CONTENT_CLASS} mx-auto gap-4`}>
          {slide.eyebrow && (
            <p className="font-mono text-xs tracking-wider text-white/50 uppercase">
              {slide.eyebrow}
            </p>
          )}
          {panelBlocks.map((block, i) => {
            switch (block.style) {
              // a title block that isn't the numeral (e.g. a second title
              // later in the sequence) reads as a bold caption line here
              case "title":
                return (
                  <p key={i} className="text-base font-semibold text-white">
                    {renderSegments(block.value)}
                  </p>
                );
              case "body":
                return (
                  <p
                    key={i}
                    className="font-[Inter] text-sm leading-relaxed text-white"
                  >
                    {renderSegments(block.value)}
                  </p>
                );
              case "image":
                return (
                  <img key={i} src={block.value} alt="" className={IMAGE_CLASS} />
                );
              case "cta":
                return (
                  <CTAButton
                    key={i}
                    {...block.value}
                    slideIndex={slideIndex}
                    variant="light"
                    onSend={onSend}
                  />
                );
            }
          })}
        </div>
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
        msg.payload.slides.every(
          (s) =>
            Array.isArray(s?.content) &&
            s.content.some(
              (b) => b?.style === "title" && typeof b.value === "string",
            ),
        )
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

        {showHint && slides[activeIndex]?.pointerHint && (
          <div className="pointer-events-none absolute right-4 bottom-10 z-20">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 font-mono text-xs text-white">
              {slides[activeIndex].pointerHint}
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
