import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "../public/og.png");

const W = 1200;
const H = 630;

// Langit-inspired kraft palette
const BG = "#f7f7f5";
const SURFACE = "#ffffff";
const INK = "#1a1d2e";
const INK2 = "#5a5f78";
const INK3 = "#8a8fa8";
const ACCENT = "#1a8a52"; // kraft green
const RULE = "#dde0e8";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}" />

  <!-- Top border accent -->
  <rect x="0" y="0" width="${W}" height="4" fill="${ACCENT}" />

  <!-- Card -->
  <rect x="80" y="80" width="${W - 160}" height="${H - 160}" fill="${SURFACE}" stroke="${RULE}" stroke-width="1" />

  <!-- Left accent bar -->
  <rect x="80" y="80" width="4" height="${H - 160}" fill="${ACCENT}" />

  <!-- Meta label -->
  <text x="124" y="160" font-family="ui-monospace, monospace" font-size="18" font-weight="400" fill="${INK3}" letter-spacing="3">GINGERINC / LAB</text>

  <!-- kraft wordmark -->
  <text x="120" y="320" font-family="Georgia, serif" font-size="148" font-weight="400" fill="${INK}" letter-spacing="-4">kraft</text>

  <!-- Dot accent -->
  <circle cx="756" cy="240" r="10" fill="${ACCENT}" />

  <!-- Tagline -->
  <text x="124" y="390" font-family="ui-monospace, monospace" font-size="22" fill="${INK2}" letter-spacing="0.5">A public lab of interactive demos and UI experiments.</text>

  <!-- Bottom rule -->
  <line x1="124" y1="460" x2="${W - 124}" y2="460" stroke="${RULE}" stroke-width="1" />

  <!-- URL -->
  <text x="124" y="496" font-family="ui-monospace, monospace" font-size="16" fill="${INK3}" letter-spacing="1">kraft-rzaugusdi.vercel.app</text>

  <!-- Author -->
  <text x="${W - 124}" y="496" font-family="ui-monospace, monospace" font-size="16" fill="${INK3}" letter-spacing="1" text-anchor="end">by Reza Augusdi</text>
</svg>
`.trim();

const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
const png = resvg.render().asPng();
writeFileSync(OUT, png);
console.log(`✓ og.png written to public/og.png (${png.byteLength} bytes)`);
