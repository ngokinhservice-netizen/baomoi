import { XMLParser } from "fast-xml-parser";
import { safeFetch } from "../security";
import { DiscoveredArticle } from "./types";
import { normalizeUrl } from "./normalizer";
import { cleanArticleTitle } from "../utils";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

/**
 * Parses an RSS or Atom XML string into a structured list of DiscoveredArticles
 */
export function parseRssOrAtomXml(xmlText: string, baseUrl: string): DiscoveredArticle[] {
  const result = xmlParser.parse(xmlText);
  const articles: DiscoveredArticle[] = [];

  // 1. Standard RSS 2.0 (<rss><channel><item>...</item></channel></rss>)
  if (result.rss?.channel) {
    const channel = result.rss.channel;
    const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

    for (const item of rawItems) {
      const rawTitle = item.title ? String(item.title).replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() : "";
      const title = cleanArticleTitle(rawTitle);
      let link = "";

      if (typeof item.link === "string") {
        link = item.link;
      } else if (item.link?.["#text"]) {
        link = item.link["#text"];
      } else if (item.guid && typeof item.guid === "string" && item.guid.startsWith("http")) {
        link = item.guid;
      }

      if (!title || !link) continue;

      // Extract description / summary / content
      const description =
        item.description || item["content:encoded"] || item.summary || "";
      const cleanExcerpt = typeof description === "string"
        ? description.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().slice(0, 300)
        : "";

      // Extract image: enclosure, media:content, or from description HTML
      let imageUrl: string | undefined;
      if (item.enclosure && item.enclosure["@_url"]) {
        imageUrl = item.enclosure["@_url"];
      } else if (item["media:content"] && item["media:content"]["@_url"]) {
        imageUrl = item["media:content"]["@_url"];
      } else if (item["media:thumbnail"] && item["media:thumbnail"]["@_url"]) {
        imageUrl = item["media:thumbnail"]["@_url"];
      } else if (typeof description === "string") {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }
      }

      // Extract pubDate
      let publishedAt: Date | undefined;
      if (item.pubDate) {
        const d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) publishedAt = d;
      }

      const author = item["dc:creator"] || item.author || channel.title;

      articles.push({
        title,
        originalUrl: normalizeUrl(link),
        excerpt: cleanExcerpt,
        imageUrl,
        sourceAuthor: typeof author === "string" ? author.trim() : undefined,
        sourcePublishedAt: publishedAt,
        sourceName: typeof channel.title === "string" ? channel.title : undefined,
      });
    }

    return articles;
  }

  // 2. Atom feed (<feed><entry>...</entry></feed>)
  if (result.feed?.entry) {
    const feed = result.feed;
    const rawEntries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

    for (const entry of rawEntries) {
      const rawTitle = entry.title ? (typeof entry.title === "string" ? entry.title : entry.title["#text"]) : "";
      const title = cleanArticleTitle(rawTitle);
      let link = "";

      if (Array.isArray(entry.link)) {
        const altLink = entry.link.find((l: any) => l["@_rel"] === "alternate" || !l["@_rel"]);
        link = altLink?.["@_href"] || entry.link[0]?.["@_href"] || "";
      } else if (entry.link?.["@_href"]) {
        link = entry.link["@_href"];
      }

      if (!title || !link) continue;

      const summary = entry.summary || entry.content || "";
      const cleanExcerpt = typeof summary === "string"
        ? summary.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().slice(0, 300)
        : "";

      let publishedAt: Date | undefined;
      const dateStr = entry.published || entry.updated;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) publishedAt = d;
      }

      articles.push({
        title: String(title).trim(),
        originalUrl: normalizeUrl(link),
        excerpt: cleanExcerpt,
        sourceAuthor: entry.author?.name ? String(entry.author.name) : undefined,
        sourcePublishedAt: publishedAt,
        sourceName: typeof feed.title === "string" ? feed.title : undefined,
      });
    }

    return articles;
  }

  return [];
}

/**
 * Tries to fetch and parse an RSS feed URL directly
 */
export async function fetchRssFeed(feedUrl: string): Promise<DiscoveredArticle[]> {
  const { text } = await safeFetch(feedUrl, { timeoutMs: 12000 });
  return parseRssOrAtomXml(text, feedUrl);
}

/**
 * Searches an HTML page for autodiscovery RSS / Atom feed tags:
 * <link rel="alternate" type="application/rss+xml" href="..." />
 */
export function findFeedUrlsInHtml(html: string, baseUrl: string): string[] {
  const feedUrls: string[] = [];
  const linkMatches = Array.from(html.matchAll(/<link\s+[^>]*rel=["']alternate["'][^>]*>/gi));

  for (const match of linkMatches) {
    const tag = match[0];
    const isRssOrAtom = /type=["'](application\/(rss\+xml|atom\+xml)|text\/xml)["']/i.test(tag);
    if (isRssOrAtom) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        try {
          const resolved = new URL(hrefMatch[1], baseUrl).toString();
          feedUrls.push(resolved);
        } catch {
          // ignore invalid
        }
      }
    }
  }

  return feedUrls;
}
