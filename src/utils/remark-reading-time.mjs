import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // astro.frontmatter is passed down and accessible later
    data.astro.frontmatter.readingTime = readingTime.text;
  };
}
