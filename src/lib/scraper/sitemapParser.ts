import { XMLParser } from "fast-xml-parser";
import { safeFetch } from "../security";
import { normalizeUrl } from "./normalizer";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: Date;
  changefreq?: string;
  priority?: number;
}

/**
 * Parses XML sitemap (both urlset and sitemapindex)
 */
export function parseSitemapXml(xmlText: string): { urls: SitemapUrlEntry[]; childSitemaps: string[] } {
  const result = xmlParser.parse(xmlText);
  const urls: SitemapUrlEntry[] = [];
  const childSitemaps: string[] = [];

  // Check if sitemapindex
  if (result.sitemapindex?.sitemap) {
    const list = Array.isArray(result.sitemapindex.sitemap)
      ? result.sitemapindex.sitemap
      : [result.sitemapindex.sitemap];

    for (const sm of list) {
      if (sm.loc && typeof sm.loc === "string") {
        childSitemaps.push(sm.loc.trim());
      }
    }
  }

  // Check if urlset
  if (result.urlset?.url) {
    const list = Array.isArray(result.urlset.url) ? result.urlset.url : [result.urlset.url];

    for (const entry of list) {
      if (entry.loc && typeof entry.loc === "string") {
        let lastmod: Date | undefined;
        if (entry.lastmod) {
          const d = new Date(entry.lastmod);
          if (!isNaN(d.getTime())) lastmod = d;
        }

        urls.push({
          loc: normalizeUrl(entry.loc),
          lastmod,
          changefreq: entry.changefreq,
          priority: entry.priority ? parseFloat(entry.priority) : undefined,
        });
      }
    }
  }

  return { urls, childSitemaps };
}

/**
 * Fetches and resolves a sitemap URL, recursively resolving the latest child sitemap if index is found
 */
export async function fetchSitemap(sitemapUrl: string, maxDepth: number = 1): Promise<SitemapUrlEntry[]> {
  const { text } = await safeFetch(sitemapUrl, { timeoutMs: 12000 });
  const parsed = parseSitemapXml(text);

  if (parsed.urls.length > 0) {
    return parsed.urls;
  }

  // If it's a sitemapindex and maxDepth > 0, fetch the first/latest child sitemap
  if (parsed.childSitemaps.length > 0 && maxDepth > 0) {
    // Pick the last one (usually latest in chronological news sitemaps)
    const childUrl = parsed.childSitemaps[parsed.childSitemaps.length - 1];
    return fetchSitemap(childUrl, maxDepth - 1);
  }

  return [];
}
