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
type CTAVariant = "light" | "dark" | "neutral";
type ProgressBarVariant = "light" | "dark";

// Variant = content placement within a template — never a typography
// change. Content *order* isn't a variant concern anymore: it's carried
// directly by the order of Slide.content itself.
type Position = "top" | "center" | "bottom";
type Align = "left" | "center" | "right";

interface FocalPoint {
  x: number;
  y: number;
}

type FocalAnchor =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface SlideVariant {
  position?: Position; // default "center"
  align?: Align; // default "center"
}

interface SlideBackground {
  className?: string; // Tailwind bg-* classes (gradient/solid) — used by our own sample slides
  imageUrl?: string; // a real photo, as a host app actually sends — takes priority over className
  focalPoint?: FocalPoint;
}

interface SlideLayout {
  template: TemplateId;
  background: SlideBackground;
  textColor?: TextColor; // defaults to "light"
  ctaVariant?: CTAVariant;
  progressBarVariant?: ProgressBarVariant;
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
  | { style: "cta"; value: { label: string; url: string } }
  | { style: "pointer"; value: string };

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
  | { style: "title" | "body"; order: number | string; value: string }
  // an inline image within the content stack — distinct from the slide-level
  // background_image. image_url's value is a direct URL; image_parameter's
  // value is a "{key}" placeholder resolved against the slide's parameter
  // object into a URL (see resolveParameterPlaceholder below)
  | {
      style: "image_url" | "image_parameter";
      order: number | string;
      value: string;
      image_lottie?: string;
    }
  | { style: "pointer"; order: number | string; value: string }
  | { style: "cta"; order: number | string; value: { label: string; url: string } };

export interface RawSlide {
  retailer_wrapped_template_id?: string;
  // Local-only override used by the typography sampler preset.
  retailer_wrapped_template?: string | { template: string; variant?: string };
  background_image?: string;
  background_lottie?: string;
  background_animation?: string;
  background_focal_point?: FocalAnchor | FocalPoint;
  cta_variant?: CTAVariant;
  shareable?: 0 | 1;
  pointer?: string;
  content: RawContentBlock[];
  parameter?: Record<string, string> | [];
}

export interface RawInitPayload {
  slides: RawSlide[];
}

function isRawContentBlock(value: unknown): value is RawContentBlock {
  if (!value || typeof value !== "object") return false;

  const block = value as Record<string, unknown>;
  const validOrder =
    typeof block.order === "number" ||
    (typeof block.order === "string" && Number.isFinite(Number(block.order)));

  if (!validOrder) return false;

  switch (block.style) {
    case "title":
    case "body":
    case "image_url":
    case "image_parameter":
    case "pointer":
      return typeof block.value === "string";
    case "cta":
      return (
        !!block.value &&
        typeof block.value === "object" &&
        typeof (block.value as Record<string, unknown>).label === "string" &&
        typeof (block.value as Record<string, unknown>).url === "string"
      );
    default:
      return false;
  }
}

function isRawSlide(value: unknown): value is RawSlide {
  if (!value || typeof value !== "object") return false;

  const slide = value as Record<string, unknown>;
  return (
    Array.isArray(slide.content) &&
    slide.content.length > 0 &&
    slide.content.every(isRawContentBlock)
  );
}

function isRawInitPayload(value: unknown): value is RawInitPayload {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).slides) &&
    (value as { slides: unknown[] }).slides.length > 0 &&
    (value as { slides: unknown[] }).slides.every(isRawSlide)
  );
}

const TEMPLATE_IDS: TemplateId[] = ["prose", "statement", "stat"];

// the host's own variant ids, several of which can mean the same position
interface TemplateVariant {
  position: Position;
  align: Align;
  ctaVariant: CTAVariant;
  textColor: TextColor;
  progressBarVariant: ProgressBarVariant;
}

const TEMPLATE_VARIANTS: Record<string, TemplateVariant> = {
  "1": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "2": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "3": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "4": { position: "top", align: "center", ctaVariant: "dark", textColor: "dark", progressBarVariant: "dark" },
  "5": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "6": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "7": { position: "center", align: "center", ctaVariant: "neutral", textColor: "dark", progressBarVariant: "dark" },
  "8": { position: "center", align: "center", ctaVariant: "light", textColor: "dark", progressBarVariant: "dark" },
};

const FALLBACK_VARIANT: TemplateVariant = {
  position: "center",
  align: "center",
  ctaVariant: "neutral",
  textColor: "light",
  progressBarVariant: "light",
};

const FOCAL_ANCHORS: Record<FocalAnchor, FocalPoint> = {
  center: { x: 50, y: 50 },
  top: { x: 50, y: 0 },
  bottom: { x: 50, y: 100 },
  left: { x: 0, y: 50 },
  right: { x: 100, y: 50 },
  "top-left": { x: 0, y: 0 },
  "top-right": { x: 100, y: 0 },
  "bottom-left": { x: 0, y: 100 },
  "bottom-right": { x: 100, y: 100 },
};

const resolveFocalPoint = (
  raw: RawSlide["background_focal_point"],
): FocalPoint | undefined => {
  if (!raw) return undefined;
  if (typeof raw === "string") return FOCAL_ANCHORS[raw];
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return undefined;
  return {
    x: Math.min(100, Math.max(0, raw.x)),
    y: Math.min(100, Math.max(0, raw.y)),
  };
};

// image_parameter's value is always exactly one "{key}" placeholder,
// resolved whole against the slide's parameter object into an image URL
function resolveImageParameter(
  value: string,
  parameter?: Record<string, string>,
): { value: string; missing: boolean } {
  const match = value.match(/^\{(.+)\}$/);
  if (!match) return { value, missing: false };
  const resolved = parameter?.[match[1]];
  return { value: resolved ?? "", missing: !resolved };
}

// title/body values can mix literal text with inline "{key}" placeholders
// (e.g. "hari ini {nama_toko} sangat berprestasi") — each placeholder is
// resolved against the parameter object and split into its own segment, so
// only that resolved run renders bold, not the whole title/body
function parseTextSegments(
  raw: string,
  parameter?: Record<string, string>,
): { segments: TextSegment[]; missing: boolean } {
  const segments: TextSegment[] = [];
  let missing = false;
  const pattern = /\{([^{}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index) });
    }
    const resolved = parameter?.[match[1]];
    if (resolved) segments.push({ text: resolved, fromParameter: true });
    else missing = true;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex) });
  }
  return { segments, missing };
}

function normalizeRawSlide(raw: RawSlide): Slide | null {
  const localTemplate = raw.retailer_wrapped_template;
  const localTemplateId =
    typeof localTemplate === "string" ? localTemplate : localTemplate?.template;
  const variantId =
    (typeof localTemplate === "object" ? localTemplate.variant : undefined) ??
    raw.retailer_wrapped_template_id;
  const variant = TEMPLATE_VARIANTS[variantId ?? ""] ?? FALLBACK_VARIANT;
  const template = TEMPLATE_IDS.includes(localTemplateId as TemplateId)
    ? (localTemplateId as TemplateId)
    : "prose";
  const parameter = Array.isArray(raw.parameter) ? undefined : raw.parameter;
  let missingParameter = false;
  let pointerHint = raw.pointer;

  const content: SlideBlock[] = [...raw.content]
    .sort((a, b) => Number(a.order) - Number(b.order))
    .flatMap((block): SlideBlock[] => {
      switch (block.style) {
        case "title":
        case "body": {
          const parsed = parseTextSegments(block.value, parameter);
          missingParameter ||= parsed.missing;
          return parsed.segments.length
            ? [{ style: block.style, value: parsed.segments }]
            : [];
        }
        case "image_url":
          return [{ style: "image", value: block.value }];
        case "image_parameter": {
          const resolved = resolveImageParameter(block.value, parameter);
          missingParameter ||= resolved.missing;
          return resolved.value ? [{ style: "image", value: resolved.value }] : [];
        }
        case "cta":
          return [{
            style: "cta",
            value: {
              ...block.value,
              label: block.value.label
                .replace(/<br\s*\/?\s*>/gi, " ")
                .replace(/<[^>]+>/g, "")
                .replace(/&nbsp;/gi, " ")
                .trim(),
            },
          }];
        case "pointer":
          return [{ style: "pointer", value: block.value }];
      }
    });

  if (missingParameter) return null;
  const focalPoint = resolveFocalPoint(raw.background_focal_point);

  return {
    layout: {
      template,
      background: raw.background_image
        ? { imageUrl: raw.background_image, focalPoint }
        : { className: "bg-neutral-900" },
      textColor: variant.textColor,
      ctaVariant: raw.cta_variant ?? variant.ctaVariant,
      progressBarVariant: variant.progressBarVariant,
      variant: { position: variant.position, align: variant.align },
    },
    content,
    shareable: raw.shareable !== 0,
    pointerHint:
      pointerHint && !content.some((block) => block.style === "pointer")
        ? pointerHint
        : undefined,
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
    eyebrow: "sample recap",
    content: [
      { style: "title", value: [{ text: "Your year in review" }] },
      {
        style: "body",
        value: [{ text: "A short look back at the moments worth keeping." }],
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
    eyebrow: "little wins",
    content: [
      { style: "title", value: [{ text: "5" }] },
      {
        style: "body",
        value: [
          {
            text: "Good finds and small wins made this year memorable.",
          },
        ],
      },
    ],
  },
  {
    layout: { template: "prose", background: { className: "bg-neutral-900" } },
    eyebrow: "favorite moment",
    // deliberately body-before-title, to exercise arbitrary block order
    content: [
      {
        style: "body",
        value: [
          {
            text: "Some discoveries stay with you long after the day ends.",
          },
        ],
      },
      { style: "title", value: [{ text: "The one you loved most" }] },
    ],
  },
  {
    layout: {
      template: "statement",
      background: { className: "bg-[color:var(--accent)]" },
      textColor: "dark",
    },
    eyebrow: "keep exploring",
    content: [{ style: "title", value: [{ text: "More good things ahead" }] }],
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
    eyebrow: "sample recap",
    content: [
      { style: "title", value: [{ text: "Thanks for being part of it" }] },
      {
        style: "body",
        value: [
          {
            text: "Here's to another year of moments worth remembering.",
          },
        ],
      },
      {
        style: "cta",
        value: {
          label: "See the highlights",
          url: "https://example.com",
        },
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
  variant?: CTAVariant;
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
          : variant === "neutral"
            ? "bg-[#d23f32] text-white hover:bg-[#d23f32]/80"
            : "bg-white text-[#d23f32] hover:bg-white/85"
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
  right: "items-end text-right",
};

// shared across every "title"-style block render (Prose, Statement, Stat's
// numeral) so the design spec's font/size stays in one place
const TITLE_CLASS = "font-['Passion_One'] text-[4rem] leading-none font-normal";

// shared across every "image"-style block render
const IMAGE_CLASS =
  "mx-auto max-h-[280px] max-w-[280px] w-full rounded-lg object-cover";

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

function PointerBlock({
  value,
  textColor,
}: {
  value: string;
  textColor: TextColor;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 font-[Inter] text-sm ${textColor === "dark" ? "text-black/70" : "text-white/80"}`}
    >
      <span>{value}</span>
      <ChevronIcon />
    </div>
  );
}

// a real photo (host-provided) draws over the frame with a scrim for text
// legibility; className backgrounds (our own sample slides) don't need one
function SlideBackdrop({
  background,
  textColor,
}: {
  background: SlideBackground;
  textColor: TextColor;
}) {
  if (!background.imageUrl) return null;
  const scrim =
    textColor === "dark"
      ? "bg-gradient-to-t from-white/50 via-white/15 to-white/5"
      : "bg-gradient-to-t from-black/70 via-black/20 to-black/10";
  return (
    <>
      <img
        src={background.imageUrl}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        style={
          background.focalPoint
            ? { objectPosition: `${background.focalPoint.x}% ${background.focalPoint.y}%` }
            : undefined
        }
      />
      <div className={`absolute inset-0 -z-10 ${scrim}`} />
    </>
  );
}

// eyebrow label + an ordered stack of title/body/cta blocks — the standard
// caption/quote slide. Blocks render in whatever order the slide gives them
// (body, title, body, cta — anything), each styled by its own `style`.
function Prose({ slide, slideIndex, containerRef, onSend }: SlideCardProps) {
  const {
    background,
    textColor = "light",
    ctaVariant: layoutCtaVariant,
    variant = {},
  } = slide.layout;
  const { position = "center", align = "center" } = variant;
  const isDark = textColor === "dark";
  const textClass = isDark ? "text-black" : "text-white";
  const softTextClass = isDark ? "text-black/80" : "text-white";
  const eyebrowClass = isDark ? "text-black/55" : "text-white/60";
  const ctaVariant = layoutCtaVariant ?? (isDark ? "dark" : "light");

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} textColor={textColor} />
      <div className={`${CONTENT_CLASS} gap-4`}>
        {slide.eyebrow && (
          <p
            className={`font-mono text-sm tracking-wider uppercase ${eyebrowClass}`}
          >
            {slide.eyebrow}
          </p>
        )}
        {slide.content.map((block, i) => {
          switch (block.style) {
            case "title":
              return (
                <h2 key={i} className={`${TITLE_CLASS} ${textClass}`}>
                  {renderSegments(block.value)}
                </h2>
              );
            case "body":
              return (
                <p
                  key={i}
                  className={`font-[Inter] text-base leading-relaxed ${softTextClass}`}
                >
                  {renderSegments(block.value)}
                </p>
              );
            case "image":
              return (
                <img key={i} src={block.value} alt="" className={IMAGE_CLASS} />
              );
            case "pointer":
              return (
                <PointerBlock
                  key={i}
                  value={block.value}
                  textColor={textColor}
                />
              );
            case "cta":
              return (
                <CTAButton
                  key={i}
                  {...block.value}
                  slideIndex={slideIndex}
                  variant={ctaVariant}
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
  const {
    background,
    textColor = "light",
    ctaVariant: layoutCtaVariant,
    variant = {},
  } = slide.layout;
  const { position = "center", align = "center" } = variant;
  const isDark = textColor === "dark";
  const textClass = isDark ? "text-black" : "text-white";
  const softTextClass = isDark ? "text-black/80" : "text-white";
  const ctaVariant = layoutCtaVariant ?? (isDark ? "dark" : "light");

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full flex-col ${background.imageUrl ? "" : background.className} ${POSITION_CLASS[position]} ${ALIGN_CLASS[align]}`}
    >
      <SlideBackdrop background={background} textColor={textColor} />
      <div className={`${CONTENT_CLASS} gap-4`}>
        {slide.content.map((block, i) => {
          switch (block.style) {
            case "title":
              return (
                <h2 key={i} className={`${TITLE_CLASS} ${textClass}`}>
                  {renderSegments(block.value)}
                </h2>
              );
            case "body":
              return (
                <p
                  key={i}
                  className={`font-[Inter] text-base leading-relaxed ${softTextClass}`}
                >
                  {renderSegments(block.value)}
                </p>
              );
            case "image":
              return (
                <img key={i} src={block.value} alt="" className={IMAGE_CLASS} />
              );
            case "pointer":
              return (
                <PointerBlock
                  key={i}
                  value={block.value}
                  textColor={textColor}
                />
              );
            case "cta":
              return (
                <CTAButton
                  key={i}
                  {...block.value}
                  slideIndex={slideIndex}
                  variant={ctaVariant}
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
  const { background, textColor = "light" } = slide.layout;
  const numeralClass = textColor === "dark" ? "text-black" : "text-white";
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
        <SlideBackdrop background={background} textColor={textColor} />
        {numeral && (
          <div className={`${CONTENT_CLASS} items-center text-center`}>
            <span className={`${TITLE_CLASS} ${numeralClass}`}>
              {renderSegments(numeral.value)}
            </span>
          </div>
        )}
      </div>
      <div className="bg-black">
        <div className={`${CONTENT_CLASS} mx-auto gap-4`}>
          {slide.eyebrow && (
            <p className="font-mono text-sm tracking-wider text-white/50 uppercase">
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
                    className="font-[Inter] text-base leading-relaxed text-white"
                  >
                    {renderSegments(block.value)}
                  </p>
                );
              case "image":
                return (
                  <img
                    key={i}
                    src={block.value}
                    alt=""
                    className={IMAGE_CLASS}
                  />
                );
              case "pointer":
                return (
                  <PointerBlock
                    key={i}
                    value={block.value}
                    textColor="light"
                  />
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
        fill="currentColor"
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
        fill="currentColor"
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
      className="max-h-48 overflow-y-auto rounded-lg bg-black/90 p-3 font-mono text-sm leading-relaxed text-white"
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
  const [paused, setPaused] = useState(false);
  const [shareError, setShareError] = useState("");
  const swiperRef = useRef<SwiperType | null>(null);
  // isEmbedded() reads window.parent, which doesn't exist during SSR — this
  // is set after mount so the close button only ever renders client-side
  const [embedded, setEmbedded] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slideStartRef = useRef(Date.now());
  const activeIndexRef = useRef(0);
  const logIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) return;
    if (paused || closed) swiper.autoplay.stop();
    else swiper.autoplay.start();
  }, [paused, closed, slidesSource]);

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
      const msg = event.data as { type?: unknown; payload?: unknown };

      if (msg?.type === "INIT" && isRawInitPayload(msg.payload)) {
        const normalizedSlides = msg.payload.slides
          .map(normalizeRawSlide)
          .filter((slide): slide is Slide => slide !== null);

        if (normalizedSlides.length > 0) {
          clearTimeout(timer);
          setSlides(normalizedSlides);
          setSlidesSource("init");
          setActiveIndex(0);
          setFillPercent(0);
          return;
        }
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
    setPaused(true);
    setShareError("");
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
          await navigator.share({ files: [file], title: "Kilas Balik" });
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
    } catch {
      setShareError("Could not share this slide. Please try again.");
    } finally {
      setCapturing(false);
    }
  }, [activeIndex, emit]);

  function replay() {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.autoplay.stop();
    swiper.slideTo(0);
    setFillPercent(0);
    setPaused(false);
    swiper.autoplay.start();
  }

  const progressVariant =
    slides[activeIndex]?.layout.progressBarVariant ?? "light";
  const headerTextClass =
    progressVariant === "dark" ? "text-black" : "text-white";
  const progressTrackClass =
    progressVariant === "dark" ? "bg-black/20" : "bg-white/30";
  const progressFillClass =
    progressVariant === "dark" ? "bg-black" : "bg-white";

  return (
    <div
      className="mx-auto flex w-full max-w-[430px] flex-col gap-3 font-[Inter]"
      role="region"
      aria-label="Story player"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input, select, textarea"))
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (closed) return;
          if (event.key === "ArrowLeft") swiperRef.current?.slidePrev();
          else swiperRef.current?.slideNext();
        } else if (
          event.key === " " &&
          event.target === event.currentTarget &&
          !closed
        ) {
          event.preventDefault();
          setPaused((value) => !value);
        }
      }}
    >
      <div className="relative mx-auto aspect-430/853 w-full overflow-hidden rounded-2xl bg-black select-none">
        <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 pt-3">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              {embedded ? (
                <button
                  onClick={handleCloseRequest}
                  aria-label="Close"
                  className={`flex h-11 w-11 items-center justify-center ${headerTextClass}`}
                >
                  <CloseIcon />
                </button>
              ) : (
                <div className="h-7 w-7" />
              )}
              <span className={`font-[Inter] text-base font-semibold ${headerTextClass}`}>
                Kilas Balik
              </span>
            </div>
            {(slides[activeIndex]?.shareable ?? true) ? (
              <button
                onClick={handleShare}
                disabled={capturing}
                aria-label="Share current slide as image"
                className={`flex h-11 w-11 items-center justify-center ${headerTextClass} disabled:opacity-40`}
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
                className={`h-0.5 flex-1 overflow-hidden rounded-full ${progressTrackClass}`}
              >
                <div
                  className={`h-full rounded-full ${progressFillClass} transition-none`}
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
          autoplay={{
            delay: AUTOPLAY_DELAY,
            disableOnInteraction: false,
            stopOnLastSlide: true,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            if (paused || closed) swiper.autoplay.stop();
          }}
          onBeforeDestroy={(swiper) => {
            if (swiperRef.current === swiper) swiperRef.current = null;
          }}
          onAutoplayStop={(swiper) => {
            if (swiperRef.current === swiper && swiper.isEnd) setPaused(true);
          }}
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
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 font-mono text-sm text-white">
              {slides[activeIndex].pointerHint}
              <ChevronIcon />
            </div>
          </div>
        )}

        {closed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 font-mono text-sm tracking-wider text-white/70 uppercase">
            player closed
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <button
          type="button"
          aria-label="Previous slide"
          disabled={closed || activeIndex === 0}
          onClick={() => swiperRef.current?.slidePrev()}
          className="min-h-11 rounded-lg border border-current/30 px-3 disabled:opacity-40"
        >
          ←
        </button>
        <button
          type="button"
          disabled={closed}
          onClick={() => setPaused((value) => !value)}
          className="min-h-11 min-w-24 rounded-lg border border-current/30 px-3 disabled:opacity-40"
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          aria-label="Next slide"
          disabled={closed || activeIndex === slides.length - 1}
          onClick={() => swiperRef.current?.slideNext()}
          className="min-h-11 rounded-lg border border-current/30 px-3 disabled:opacity-40"
        >
          →
        </button>
        <button
          type="button"
          disabled={closed}
          onClick={replay}
          className="min-h-11 rounded-lg border border-current/30 px-3 disabled:opacity-40"
        >
          Replay
        </button>
      </div>
      <p className="text-center text-sm opacity-80" aria-live="polite">
        Slide {activeIndex + 1} of {slides.length} ·{" "}
        {closed ? "Closed" : paused ? "Paused" : "Playing"}
      </p>
      <p className="text-center text-sm opacity-80">
        Swipe or tap either side. Use arrow keys when focused.
      </p>
      {shareError && (
        <p role="alert" className="text-center text-sm">
          {shareError}
        </p>
      )}
      {!embedded && (
        <details className="rounded-lg border border-current/30 p-3 text-sm">
          <summary className="cursor-pointer py-2">Inspect messages</summary>
          <PostMessageConsole log={log} logRef={logRef} />
        </details>
      )}
    </div>
  );
}
