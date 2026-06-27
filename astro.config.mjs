// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://kraft.gingerinc.dev',
  integrations: [
    icon({
      include: {
        lucide: ['moon', 'sun', 'arrow-left', 'arrow-up-right'],
      },
    }),
    mdx(),
    react(),
  ],
  adapter: vercel(),
  fonts: [
    {
      name: 'Newsreader',
      cssVariable: '--font-display',
      provider: fontProviders.google(),
      weights: ['300 700'],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'serif'],
      optimizedFallbacks: true,
    },
    {
      name: 'Geist',
      cssVariable: '--font-body',
      provider: fontProviders.google(),
      weights: [300, 400, 500, 600],
      styles: ['normal'],
      fallbacks: ['system-ui', 'sans-serif'],
      optimizedFallbacks: true,
    },
    {
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.google(),
      weights: [400, 500],
      styles: ['normal'],
      fallbacks: ['ui-monospace', 'monospace'],
      optimizedFallbacks: true,
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
