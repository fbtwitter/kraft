import { SITE_HOST } from "../site.config.mjs";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
const sculpture = readFileSync(
  new URL("../public/kraft-sculpture.png", import.meta.url),
).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0a0c0e"/>
<text x="72" y="100" fill="#80d9ad" font-family="Arial,sans-serif" font-size="28">kraft / an independent interface lab</text>
<g fill="#f3f4ef" font-family="Arial,sans-serif" font-size="76" letter-spacing="-3"><text x="68" y="240">Good ideas</text><text x="68" y="324">get better</text><text x="68" y="408">when you play.</text></g>
<image x="675" y="100" width="480" height="480" xlink:href="data:image/png;base64,${sculpture}"/>
<path d="M72 520H1128" stroke="#293037"/>
<text x="72" y="568" fill="#bac1c8" font-family="Arial,sans-serif" font-size="20">${SITE_HOST}</text>
<text x="1128" y="568" text-anchor="end" fill="#bac1c8" font-family="Arial,sans-serif" font-size="20">by Reza Augusdi</text>
</svg>`;
writeFileSync(
  new URL("../public/og.png", import.meta.url),
  new Resvg(svg).render().asPng(),
);
console.log("Generated Kraft social image from the Blender render.");
