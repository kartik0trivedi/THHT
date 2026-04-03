import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

const parser = new MarkdownIt();

export async function GET(context) {
	const posts = await getCollection('writing');
	
	// Create a threshold date (now - 2 days)
	const DELAY_IN_DAYS = 2;
	const thresholdDate = new Date();
	thresholdDate.setDate(thresholdDate.getDate() - DELAY_IN_DAYS);

	// Filter posts to only include those published at least 2 days ago
	const delayedPosts = posts.filter((post) => {
		const pubDate = new Date(post.data.pubDate);
		return pubDate <= thresholdDate;
	});

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: delayedPosts.map((post) => ({
			...post.data,
			link: `/writing/${post.id}/`,
			content: sanitizeHtml(parser.render(post.body || '')),
		})),
	});
}


