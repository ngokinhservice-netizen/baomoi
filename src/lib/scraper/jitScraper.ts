import prisma from "@/lib/prisma";
import { fetchRssFeed } from "./rssParser";
import { normalizeUrl } from "./normalizer";
import { slugify, cleanArticleTitle } from "@/lib/utils";
import { safeFetch } from "@/lib/security";
import { extractArticleFromHtml } from "./htmlParser";

let isScrapingActive = false;
let lastScrapeTime = 0;
const SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes throttle

const FEEDS: Array<{ name: string; url: string; slug: string }> = [
  { name: "VnExpress - Tin mới nhất", url: "https://vnexpress.net/rss/tin-moi-nhat.rss", slug: "thoi-su" },
  { name: "VnExpress - Tin nổi bật", url: "https://vnexpress.net/rss/tin-noi-bat.rss", slug: "thoi-su" },
  { name: "VnExpress - Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss", slug: "thoi-su" },
  { name: "VnExpress - Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss", slug: "the-gioi" },
  { name: "VnExpress - Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss", slug: "kinh-doanh" },
  { name: "VnExpress - Thể thao", url: "https://vnexpress.net/rss/the-thao.rss", slug: "the-thao" },
  { name: "VnExpress - Khoa học Công nghệ", url: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss", slug: "cong-nghe" },
  { name: "VnExpress - Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss", slug: "giai-tri" },
  { name: "VnExpress - Đời sống", url: "https://vnexpress.net/rss/gia-dinh.rss", slug: "doi-song" },
  { name: "VnExpress - Giáo dục", url: "https://vnexpress.net/rss/giao-duc.rss", slug: "giao-duc" },
  { name: "VnExpress - Xe", url: "https://vnexpress.net/rss/oto-xe-may.rss", slug: "xe" },
];

/**
 * Triggers background sync non-blockingly whenever visitors view the newspaper.
 * Ensures the news is ALWAYS automatically updated without relying on external cron.
 */
export function checkAndTriggerAutoScrape() {
  // Do NOT run during next build / page compilation
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build") {
    return;
  }

  const now = Date.now();
  if (isScrapingActive || now - lastScrapeTime < SCRAPE_INTERVAL_MS) {
    return; // Already scraping or recently scraped within 10 minutes
  }

  isScrapingActive = true;
  lastScrapeTime = now;

  // Execute in background without awaiting so visitor gets instant page load
  (async () => {
    try {
      console.log("[Auto-Scraper] 🔄 Khởi chạy cập nhật tin tức tự động từ VnExpress...");
      
      const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
      const catMap = new Map<string, string>();
      for (const c of categories) catMap.set(c.slug, c.id);

      let totalNewArticles = 0;

      for (const feed of FEEDS) {
        const categoryId = catMap.get(feed.slug) || Array.from(catMap.values())[0];
        if (!categoryId) continue;

        try {
          // Add small pause between feeds to respect rate limits
          await new Promise((r) => setTimeout(r, 400));
          const items = await fetchRssFeed(feed.url);

          // Check the latest 5 items from each feed
          for (const item of items.slice(0, 5)) {
            const normalizedUrl = normalizeUrl(item.originalUrl);
            const cleanTitle = cleanArticleTitle(item.title);

            const existing = await prisma.article.findFirst({
              where: {
                OR: [
                  { sourceUrl: normalizedUrl },
                  { title: cleanTitle },
                ],
              },
            });

            if (existing) {
              // Self-heal: If existing article content was incompletely scraped, re-fetch full content
              if (!existing.content || existing.content.length < 1200 || (existing.content.match(/<p[ >]/g) || []).length < 2) {
                try {
                  const detailRes = await safeFetch(normalizedUrl, { timeoutMs: 6000 });
                  const extracted = extractArticleFromHtml(detailRes.text, normalizedUrl);
                  if (extracted.extractedContent && extracted.extractedContent.length > (existing.content?.length || 0)) {
                    await prisma.article.update({
                      where: { id: existing.id },
                      data: {
                        content: extracted.extractedContent,
                        featuredImage: extracted.imageUrl || existing.featuredImage,
                        excerpt: extracted.excerpt || existing.excerpt,
                        ...(extracted.sourcePublishedAt ? { publishedAt: extracted.sourcePublishedAt } : {}),
                      },
                    });
                  }
                } catch {
                  // ignore
                }
              }
              continue;
            }

            // Fetch full content from source
            let fullContent = "";
            let fullExcerpt = item.excerpt;
            let fullImg = item.imageUrl;
            let pubDate = item.sourcePublishedAt;

            try {
              const detailRes = await safeFetch(normalizedUrl, { timeoutMs: 6000 });
              const extracted = extractArticleFromHtml(detailRes.text, normalizedUrl);
              if (extracted.extractedContent && extracted.extractedContent.length > 100) {
                fullContent = extracted.extractedContent;
              }
              if (extracted.excerpt) fullExcerpt = extracted.excerpt;
              if (extracted.imageUrl) fullImg = extracted.imageUrl;
              if (extracted.sourcePublishedAt) pubDate = extracted.sourcePublishedAt;
            } catch {
              // fallback
            }

            if (!fullContent) {
              fullContent = `<p class="lead">${item.excerpt || ""}</p>`;
            }

            const uniqueSlug = `${slugify(cleanTitle)}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`;

            let finalPubDate = pubDate || item.sourcePublishedAt;
            if (!finalPubDate) {
              finalPubDate = new Date(Date.now() - 30 * 60 * 1000);
            }
            if (finalPubDate.getTime() > Date.now()) {
              if (finalPubDate.getTime() - Date.now() > 5 * 3600 * 1000) {
                finalPubDate = new Date(finalPubDate.getTime() - 7 * 3600 * 1000);
              } else {
                finalPubDate = new Date(Date.now() - 60 * 1000);
              }
            }

            await prisma.article.create({
              data: {
                title: cleanTitle,
                slug: uniqueSlug,
                excerpt: fullExcerpt || `Tin tức thời sự từ ${feed.name}`,
                content: fullContent,
                featuredImage: fullImg,
                imageCaption: cleanTitle,
                imageSource: "VnExpress",
                categoryId,
                status: "PUBLISHED",
                sourceType: "IMPORTED",
                sourceUrl: normalizedUrl,
                sourceName: "VnExpress",
                isFeatured: false,
                publishedAt: finalPubDate,
              },
            });

            totalNewArticles++;
          }
        } catch (feedErr: any) {
          // ignore single feed error
        }
      }

      // Update sources lastCheckedAt in database
      await prisma.newsSource.updateMany({
        where: { isActive: true },
        data: { lastCheckedAt: new Date() },
      });

      console.log(`[Auto-Scraper] ✅ Hoàn tất cập nhật: Đã xuất bản tự động ${totalNewArticles} bài viết mới từ VnExpress!`);
    } catch (err: any) {
      console.error("[Auto-Scraper] Lỗi:", err.message);
    } finally {
      isScrapingActive = false;
    }
  })();
}
