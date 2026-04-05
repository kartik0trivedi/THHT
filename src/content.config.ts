import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const basePostSchema = z.object({
	title: z.string(),
	description: z.string(),
	// Transform string to Date object
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	tags: z.array(z.string()).optional(),
	toc: z.boolean().default(false),
});

const writing = defineCollection({
	// Load Markdown and MDX files in the `src/content/writing/` directory.
	loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a shared post schema.
	schema: ({ image }) => basePostSchema.extend({
		heroImage: z.optional(image()),
	}),
});

const drafts = defineCollection({
	// Drafts are type-checked but do not get site routes unless promoted into `writing/`.
	loader: glob({ base: './src/content/drafts', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) => basePostSchema.extend({
		heroImage: z.optional(image()),
	}),
});

export const collections = { writing, drafts };
