import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * The only function any route should call to read the blog collection.
 * Drafts are excluded in dev as well as production.
 */
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', (entry) => entry.data.draft !== true);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** "N min read", 200wpm, minimum 1 minute. */
export function readingTime(body: string): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}
