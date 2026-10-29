import * as cheerio from "cheerio";
import { DiscoveredArticle } from "./types";
import { normalizeUrl } from "./normalizer";
import { cleanArticleTitle } from "../utils";

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

  // 2. Title extraction: h1/twitter (cleanest) -> Custom selector -> OpenGraph -> Title tag
  let title = "";
  if (customSelectors?.title) {
    title = $(customSelectors.title).first().text().trim();
  }
  if (!title) {
    title =
      $("h1.title-detail, h1.title-news, h1").first().text().trim() ||
      $('meta[name="twitter:title"]').attr("content") ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().split(/[|\-–]/)[0].trim() ||
      "";
  }
  title = cleanArticleTitle(title);

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

  // 6. Publication Date (Trích xuất chuẩn xác thời gian đăng bài từ VnExpress và báo chí)
  let sourcePublishedAt: Date | undefined;

  // 6.1 Check primary meta tags (VnExpress uses meta[name="pubdate"] in ISO-8601 with +07:00)
  const metaDateStr =
    $('meta[name="pubdate"]').attr("content") ||
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="publish_date"]').attr("content") ||
    $('meta[name="cXenseParse:recs:publishtime"]').attr("content") ||
    $('meta[property="og:updated_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    undefined;

  if (metaDateStr) {
    const d = new Date(metaDateStr);
    if (!isNaN(d.getTime())) sourcePublishedAt = d;
  }

  // 6.2 Check Unix epoch seconds meta tag (VnExpress its_publication)
  if (!sourcePublishedAt) {
    const itsPub = $('meta[name="its_publication"]').attr("content");
    if (itsPub) {
      const sec = Number(itsPub);
      if (!isNaN(sec) && sec > 1000000000) {
        sourcePublishedAt = new Date(sec * 1000);
      }
    }
  }

  // 6.3 Fallback: Parse Vietnamese date string in DOM (e.g. "Thứ năm, 29/10/2026, 18:19 (GMT+7)")
  if (!sourcePublishedAt) {
    const rawDateText = $(".header-content .date, span.date, .date-time, span.time, .article__meta time, .author-time .time").first().text().trim();
    if (rawDateText) {
      // Pattern: DD/MM/YYYY ... HH:mm
      const m1 = rawDateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[^\d]+(\d{1,2}):(\d{2})/);
      if (m1) {
        const [, day, month, year, hour, min] = m1;
        const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${min.padStart(2, "0")}:00+07:00`;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) sourcePublishedAt = d;
      } else {
        // Pattern: HH:mm ... DD/MM/YYYY
        const m2 = rawDateText.match(/(\d{1,2}):(\d{2})[^\d]+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m2) {
          const [, hour, min, day, month, year] = m2;
          const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${min.padStart(2, "0")}:00+07:00`;
          const d = new Date(iso);
          if (!isNaN(d.getTime())) sourcePublishedAt = d;
        }
      }
    }
  }

  // 7. Site Name
  const sourceName =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").text().split(/[|\-–]/).pop()?.trim() ||
    undefined;

  // 8. Content Extraction
  // Clean unwanted elements first
  $("script, style, iframe, noscript, nav, footer, header, form, .ads, .advertisement, .banner, .social-share, .comment-box, .related-posts, .box_social, .box-embed, .inner-article, .list_link, .footer-content").remove();
  $(".neo-pin, .topbar-sticky, .nav-sticky, .social_pin, .social_left, .action_thumb, .width_common.social-com, .title-detail, .myvne_save_for_later").remove();

  let extractedContent = "";
  if (customSelectors?.content) {
    extractedContent = $(customSelectors.content).html() || "";
  }

  // Check if article has substantial paragraphs in standard containers
  const hasStandardParagraphs = $("article.fck_detail p.Normal, .fck_detail p.Normal, article.fck_detail p, .fck_detail p, .detail-content p, .article-body p").length >= 2;

  // Check if article is a dedicated Photo Story / Slideshow (e.g. VnExpress Phóng sự ảnh / Photo story) with minimal or no body text
  if (!extractedContent && !hasStandardParagraphs && $(".item_slide_show, .block_thumb_slide_show, .width-detail-photo").length > 0) {
    const formattedElements: string[] = [];
    const leadText = $(".description, p.description, .width-detail-photo .description").first().text().trim();
    if (leadText) {
      formattedElements.push(`<p class="text-lg font-medium text-gray-700 leading-relaxed mb-6">${leadText}</p>`);
    }

    const seenImages = new Set<string>();
    $(".item_slide_show").each((_, el) => {
      const $slide = $(el);
      let imgSrc = "";

      const srcset = $slide.find("picture source").attr("data-srcset") || $slide.find("picture source").attr("srcset");
      if (srcset) {
        const parts = srcset.split(",").map((s) => s.trim().split(" ")[0]);
        imgSrc = parts.find((p) => p.includes("w=1200")) || parts[0];
      }

      if (!imgSrc) {
        const img = $slide.find("img");
        imgSrc = img.attr("data-src") || img.attr("src") || "";
      }

      if (!imgSrc || imgSrc.includes("data:image") || seenImages.has(imgSrc)) return;
      seenImages.add(imgSrc);

      let caption = $slide.find(".desc_cation, figcaption, p.Normal").first().text().trim();
      caption = caption.replace(/\s+/g, " ").trim();

      formattedElements.push(`
<figure class="my-8">
  <img src="${imgSrc}" alt="${caption || "Hình ảnh bài viết"}" class="w-full rounded-xl shadow-md border border-gray-100 object-cover" loading="lazy" referrerpolicy="no-referrer" />
  ${caption ? `<figcaption class="text-sm text-gray-600 text-center mt-2.5 italic font-sans bg-gray-50 p-2.5 rounded-lg border border-gray-100">${caption}</figcaption>` : ""}
</figure>`);
    });

    if (formattedElements.length > 0) {
      extractedContent = formattedElements.join("\n");
    }
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

        const candidateElements: cheerio.Cheerio<any>[] = [];
        const directBlocks = match.children("p, figure, h2, h3, h4, blockquote, ul, ol");
        const allParagraphs = match.find("p");

        if (directBlocks.length >= 3 || allParagraphs.length <= directBlocks.length) {
          match.children().each((_, el) => {
            candidateElements.push($(el));
          });
        } else {
          match.find("p, figure, table.tplCaption, div.fig-picture, .item_slide_show, h2, h3, h4, blockquote, ul, ol").each((_, el) => {
            const $item = $(el);
            if ($item.is("p") && $item.closest("figure, figcaption, table").length) return;
            candidateElements.push($item);
          });
        }

        candidateElements.forEach(($el) => {
          const tagName = ($el[0] as any).tagName?.toLowerCase();

          if (tagName === "p") {
            const text = $el.text().trim();
            if (text.length > 0) {
              // Avoid duplicate sapo paragraph if it exactly matches the excerpt
              if (excerpt && (text === excerpt.trim() || text.replace(/\s+/g, " ") === excerpt.trim().replace(/\s+/g, " "))) {
                return;
              }
              formattedElements.push(`<p>${$el.html()}</p>`);
            }
          } else if (["h2", "h3", "h4"].includes(tagName)) {
            formattedElements.push(`<${tagName} class="font-bold text-gray-900 mt-6 mb-3">${$el.html()}</${tagName}>`);
          } else if (tagName === "figure" || (tagName === "table" && $el.hasClass("tplCaption")) || $el.hasClass("fig-picture") || $el.hasClass("item_slide_show")) {
            let imgSrc = "";
            const srcset = $el.find("picture source").attr("data-srcset") || $el.find("picture source").attr("srcset");
            if (srcset) {
              const parts = srcset.split(",").map((s) => s.trim().split(" ")[0]);
              imgSrc = parts.find((p) => p.includes("w=1200")) || parts[parts.length - 1];
            }
            if (!imgSrc) {
              const img = $el.find("img");
              imgSrc = img.attr("data-src") || img.attr("data-original") || img.attr("src") || "";
            }
            const caption = ($el.find("figcaption, .desc_cation").first().text() || $el.find(".Image, p").first().text() || "").trim().replace(/\s+/g, " ");
            if (imgSrc) {
              try {
                imgSrc = new URL(imgSrc, pageUrl).toString();
              } catch {
                // keep as is
              }
              const isVideo = $el.find("video, .box_embed_video_parent, [data-vid], .thumb-above-video").length > 0;
              formattedElements.push(`
                <figure class="my-6">
                  <div class="relative overflow-hidden rounded-xl shadow-md border border-gray-100 bg-black">
                    <img src="${imgSrc}" alt="${caption || "Hình ảnh bài viết"}" class="w-full object-cover max-h-[550px]" loading="lazy" referrerpolicy="no-referrer" />
                    ${isVideo ? `
                      <div class="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div class="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg">
                          <svg class="w-7 h-7 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    ` : ""}
                  </div>
                  ${caption ? `<figcaption class="text-xs sm:text-sm text-gray-600 text-center mt-2.5 italic font-sans bg-gray-50 p-2.5 rounded-lg border border-gray-100">${caption}</figcaption>` : ""}
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
