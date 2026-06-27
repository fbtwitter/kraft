// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kraft.reza.gingerinc.xyz',
  integrations: [mdx(), react()],
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
