/**
 * [File Path] src/lib/search.ts
 * [Role] Logic for search query normalization and URL state synchronization.
 */
import { Context } from 'hono'

/**
 * Normalize the search query by removing duplicate keywords and extra spaces.
 * Returns a clean string for DB queries and UI display.
 */
export const normalizeQuery = (q: string): string => {
  // Split by whitespace (half-width and full-width), filter out empty strings
  const rawKeywords = q.trim().split(/[\s　]+/).filter(Boolean);
  // Use Set to remove duplicates and join back into a single string
  return [...new Set(rawKeywords)].join(' ');
};

/**
 * Synchronize the browser URL with the normalized query.
 * Only triggers during HTMX requests to keep the address bar clean.
 */
export const syncUrlWithQuery = (c: Context, rawQ: string, cleanQ: string) => {
  const isHtmx = c.req.header('HX-Request');
  
  if (isHtmx && rawQ !== cleanQ) {
    const url = new URL(c.req.url);
    if (cleanQ) {
      url.searchParams.set('q', cleanQ);
    } else {
      url.searchParams.delete('q');
    }
    // Instruct HTMX to update the browser URL
    c.header('HX-Push-Url', url.pathname + url.search);
  }
};