# Thinking Hard / Hardly Thinking (THHT)

A personal static blog built with [Astro](https://astro.build). Hosted on Google Drive for portability.

---

## Prerequisites

Before you can run this project on a new machine, make sure you have:

- **Node.js ≥ 22.12.0** — check with `node -v`
  - Install via [nodejs.org](https://nodejs.org) or a version manager like [nvm](https://github.com/nvm-sh/nvm)
- **npm** — comes with Node, check with `npm -v`
- **Google Drive** syncing this folder to your local machine

---

## First-time Setup on a New Computer

```sh
# 1. Navigate into the project folder (adjust path as needed)
cd ~/Library/CloudStorage/GoogleDrive-kartik0trivedi@gmail.com/My\ Drive/THHT

# 2. Install dependencies (node_modules is not synced via Drive)
npm install

# 3. Create the local cache directory (required — see note below)
mkdir -p ~/.cache/thht-astro

# 4. Start the dev server
npm run dev
```

> **Why `mkdir ~/.cache/thht-astro`?**
> The project lives on Google Drive, whose virtual filesystem doesn't support
> atomic file writes. Astro's content cache is pointed to a local directory
> to avoid `UnknownFilesystemError` on startup. This is configured in
> `astro.config.mjs` via `cacheDir`.

The site will be available at **http://localhost:4321**.

---

## Daily Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview the production build locally |

Stop the dev server with **Ctrl + C**.

---

## Writing a New Post

Create a new `.md` file in `src/content/blog/`:

```
src/content/blog/your-post-slug.md
```

Minimum required frontmatter:

```yaml
---
title: "Your Post Title"
description: "A one-sentence summary shown in listings."
pubDate: "2026-04-01"
tags: ["ideas", "writing"]   # optional — freeform, any strings
---

Your post content here in Markdown.
```

The post will appear at `/blog/your-post-slug/` automatically.

---

## Project Structure

```
THHT/
├── public/              # Static assets (favicon, fonts)
├── src/
│   ├── assets/          # Images used in posts
│   ├── components/      # Reusable UI components
│   │   ├── BaseHead.astro    # <head> with SEO + Google Analytics
│   │   ├── Header.astro      # Sticky nav header
│   │   ├── Footer.astro      # Footer
│   │   ├── HeaderLink.astro  # Nav link with active state
│   │   ├── FormattedDate.astro
│   │   └── TagList.astro     # Tag pill component
│   ├── content/
│   │   └── blog/        # ← Your posts live here (.md or .mdx)
│   ├── layouts/
│   │   └── BlogPost.astro    # Post page layout
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   ├── about.astro       # About page
│   │   ├── blog/
│   │   │   ├── index.astro   # Full post archive
│   │   │   └── [...slug].astro
│   │   ├── tags/
│   │   │   ├── index.astro   # All tags
│   │   │   └── [tag].astro   # Posts by tag
│   │   └── rss.xml.js        # RSS feed
│   ├── styles/
│   │   └── global.css        # All global styles
│   └── consts.ts             # Site title, description, GA ID
├── astro.config.mjs     # Astro config (cacheDir set to ~/.cache/thht-astro)
├── package.json
└── tsconfig.json
```

---

## Configuration

All key settings live in `src/consts.ts`:

```ts
export const SITE_TITLE = 'Thinking Hard/Hardly Thinking';
export const SITE_DESCRIPTION = '...';
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // ← replace with your real GA4 ID
```

The `astro.config.mjs` also contains the site URL — update before deploying:

```js
site: 'https://your-domain.com',
```

---

## Google Analytics

GA4 is wired up and **only fires in production** (not during local dev).
To activate it:

1. Go to [analytics.google.com](https://analytics.google.com)
2. Create a property → Data Stream → copy the **Measurement ID** (`G-XXXXXXXXXX`)
3. Paste it into `src/consts.ts` as `GA_MEASUREMENT_ID`

---

## Tags / Topics

Tags are freeform — just add them to any post's frontmatter:

```yaml
tags: ["institutions", "ideas"]
```

- All tags are browsable at `/tags`
- Each tag has its own page at `/tags/tag-name`
- No registration needed — new tags appear automatically

---

## Deploying

Run `npm run build` to generate a static site in `./dist/`. That folder can be
uploaded to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

For Netlify / Vercel, connect your repo and set the build command to `npm run build`
and the output directory to `dist`.
