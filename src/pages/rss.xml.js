import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const parser = new MarkdownIt();

export async function GET(context) {
	const posts = await getCollection('writing');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/writing/${post.id}/`,
			// Note: The new Content Layer entries have a 'body' property 
			// if and only if you're using Markdown/MDX files.
			content: sanitizeHtml(parser.render(post.body || '')),
		})),
	});
}

