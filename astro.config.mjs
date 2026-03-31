// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	integrations: [mdx(), sitemap()],
	// Cache must live outside Google Drive to avoid filesystem errors
	cacheDir: '/Users/kartiktrivedi/.cache/thht-astro',
});
