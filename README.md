# kraft

A public lab of interactive experiments at https://kraft.rzaugusdi.xyz.

## Domain configuration

Edit `SITE_URL` in `site.config.mjs` to change the canonical domain, and `PERSONAL_SITE_URL` for the portfolio link. Run `bun --bun run build` to regenerate metadata and the social image, then deploy. Connect the new domain and configure its DNS separately in Vercel and the authoritative DNS provider.

## Development

`bun install`, then `bun --bun run dev`. Build with `bun --bun run build`; run browser tests with `bun run test`.
