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
	postType: z.enum(['standard', 'longform']).default('standard'),
});

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a shared post schema.
	schema: ({ image }) => basePostSchema.extend({
		heroImage: z.optional(image()),
	}),
});

const drafts = defineCollection({
	// Drafts are type-checked but do not get site routes unless promoted into `blog/`.
	loader: glob({ base: './src/content/drafts', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) => basePostSchema.extend({
		heroImage: z.optional(image()),
	}),
});

export const collections = { blog, drafts };
