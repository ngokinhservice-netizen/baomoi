import * as cheerio from "cheerio";
import { DiscoveredArticle } from "./types";
import { normalizeUrl } from "./normalizer";

/**
 * Extracts comprehensive article metadata and cleaned content from raw HTML
 */
export function extractArticleFromHtml(
  html: string,
  pageUrl: string,
  customSelectors?: { title?: string; content?: string }
): DiscoveredArticle {
  const $ = cheerio.load(html);

  // 1. Canonical URL
  let canonicalUrl = $('link[rel="canonical"]').attr("href") || undefined;
  if (canonicalUrl) {
    try {
      canonicalUrl = new URL(canonicalUrl, pageUrl).toString();
    } catch {
      canonicalUrl = undefined;
    }
  }

  // 2. Title extraction: Custom selector -> OpenGraph -> Twitter -> Title tag -> h1
  let title = "";
  if (customSelectors?.title) {
    title = $(customSelectors.title).first().text().trim();
  }
  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().split(/[|\-–]/)[0].trim() ||
      "";
  }

  // 3. Excerpt / Description
  const excerpt =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    $(".sapo, .lead, .summary, .description").first().text().trim() ||
    undefined;

  // 4. Featured Image
  let imageUrl =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[itemprop="image"]').attr("content") ||
    undefined;

  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, pageUrl).toString();
    } catch {
      imageUrl = undefined;
    }
  }

  // 5. Author
  const sourceAuthor =
    $('meta[name="author"]').attr("content") ||
    $('meta[property="article:author"]').attr("content") ||
    $(".author, .byline, [rel='author']").first().text().trim() ||
    undefined;

  // 6. Publication Date
  let sourcePublishedAt: Date | undefined;
  const rawDate =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="pubdate"]').attr("content") ||
    $('meta[name="publish_date"]').attr("content") ||
    $("time").attr("datetime") ||
    undefined;

  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) sourcePublishedAt = d;
  }

  // 7. Site Name
  const sourceName =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").text().split(/[|\-–]/).pop()?.trim() ||
    undefined;

  // 8. Content Extraction
  // Clean unwanted elements first
  $("script, style, iframe, noscript, nav, footer, header, form, .ads, .advertisement, .banner, .social-share, .comment-box, .related-posts, .box_social, .box-embed, .inner-article, .list_link, .footer-content").remove();

  let extractedContent = "";
  if (customSelectors?.content) {
    extractedContent = $(customSelectors.content).html() || "";
  }

  if (!extractedContent) {
    // Top Vietnamese newspaper content containers
    const contentSelectors = [
      "article.fck_detail",
      ".fck_detail",
      ".detail-content",
      ".article-body",
      ".detail__content",
      ".content-detail",
      "article .fck_detail",
      "article",
      "main",
      ".entry-content",
      ".post-content",
      ".article-content",
    ];

    for (const sel of contentSelectors) {
      const match = $(sel).first();
      if (match.length > 0 && match.text().trim().length > 80) {
        // Process children to keep clean structured paragraphs, headings and images
        const formattedElements: string[] = [];

        // Check if figure / images are inside
        match.find("img").each((_, imgEl) => {
          const $img = $(imgEl);
          const dataSrc = $img.attr("data-src") || $img.attr("data-original");
          if (dataSrc) {
            $img.attr("src", dataSrc);
          }
        });

        match.children().each((_, el) => {
          const tagName = (el as any).tagName?.toLowerCase();
          const $el = $(el);

          if (tagName === "p") {
            const text = $el.text().trim();
            if (text.length > 0) {
              formattedElements.push(`<p>${$el.html()}</p>`);
            }
          } else if (["h2", "h3", "h4"].includes(tagName)) {
            formattedElements.push(`<${tagName} class="font-bold text-gray-900 mt-6 mb-3">${$el.html()}</${tagName}>`);
          } else if (tagName === "figure") {
            const img = $el.find("img");
            let imgSrc = img.attr("data-src") || img.attr("src") || "";
            const caption = $el.find("figcaption, .desc_cation, p").text().trim();
            if (imgSrc) {
              try {
                imgSrc = new URL(imgSrc, pageUrl).toString();
              } catch {
                // keep as is
              }
              formattedElements.push(`
                <figure class="my-6">
                  <img src="${imgSrc}" alt="${caption}" class="w-full rounded-lg shadow-sm" loading="lazy" />
                  ${caption ? `<figcaption class="text-xs text-gray-500 text-center mt-2 italic">${caption}</figcaption>` : ""}
                </figure>
              `);
            }
          } else if (tagName === "blockquote") {
            formattedElements.push(`<blockquote>${$el.html()}</blockquote>`);
          } else if (tagName === "ul" || tagName === "ol") {
            formattedElements.push(`<${tagName}>${$el.html()}</${tagName}>`);
          }
        });

        if (formattedElements.length > 0) {
          extractedContent = formattedElements.join("\n");
        } else {
          // Fallback to html of the container
          extractedContent = match.html() || "";
        }
        break;
      }
    }
  }

  // Fallback to top-level paragraphs if no container matched
  if (!extractedContent) {
    const paragraphs: string[] = [];
    $("p").each((_, el) => {
      const pText = $(el).text().trim();
      if (pText.length > 30) {
        paragraphs.push(`<p>${$(el).html()}</p>`);
      }
    });
    extractedContent = paragraphs.join("\n");
  }

  return {
    title: title.trim(),
    originalUrl: normalizeUrl(pageUrl),
    canonicalUrl,
    excerpt: excerpt?.trim(),
    extractedContent: extractedContent.trim(),
    imageUrl,
    sourceAuthor,
    sourcePublishedAt,
    sourceName,
  };
}

/**
 * Discovers potential news article links from a homepage or category listing page
 */
export function discoverArticleLinksFromListing(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const foundUrls = new Set<string>();
  const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, "");

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);

      // Only same domain links or subdomains
      const linkDomain = resolved.hostname.replace(/^www\./, "");
      if (!linkDomain.endsWith(baseDomain) && !baseDomain.endsWith(linkDomain)) {
        return;
      }

      // Filter out non-http protocols, anchor tags, static asset extensions
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      if (resolved.pathname.match(/\.(jpg|jpeg|png|gif|svg|pdf|css|js|webp|ico|mp4|zip)$/i)) return;
      if (["/", "/index.html", "/category", "/tag"].includes(resolved.pathname)) return;

      // Heuristic for article links: path has slashes and ends with .html, or has numbers/slug
      const path = resolved.pathname;
      const isLikelyArticle =
        path.endsWith(".html") ||
        path.endsWith(".htm") ||
        /\/[a-z0-9-]+-\d+(\.html)?$/i.test(path) ||
        path.split("/").filter(Boolean).length >= 2;

      if (isLikelyArticle) {
        foundUrls.add(normalizeUrl(resolved.toString()));
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return Array.from(foundUrls);
}
