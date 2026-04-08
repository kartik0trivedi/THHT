// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import { remarkReadingTime } from './src/utils/remark-reading-time.mjs';
import { remarkSidenotes } from './src/utils/remark-sidenotes.mjs';

import vercel from '@astrojs/vercel';

const SIDENOTE_PLUGIN_VERSION = '2';

// https://astro.build/config
export default defineConfig({
  site: 'https://thht.in',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm, [remarkSidenotes, { version: SIDENOTE_PLUGIN_VERSION }], remarkReadingTime],
  },
  adapter: vercel(),
});
