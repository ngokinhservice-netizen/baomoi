import prisma from "@/lib/prisma";
import { fetchRssFeed } from "./rssParser";
import { normalizeUrl } from "./normalizer";
import { slugify } from "@/lib/utils";
import { safeFetch } from "@/lib/security";
import { extractArticleFromHtml } from "./htmlParser";

let isScrapingActive = false;
let lastScrapeTime = 0;
const SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes throttle

const FEEDS = [
  { name: "VnExpress - Tin mới nhất", url: "https://vnexpress.net/rss/tin-moi-nhat.rss", slug: "thoi-su" },
  { name: "VnExpress - Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss", slug: "thoi-su" },
  { name: "VnExpress - Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss", slug: "the-gioi" },
  { name: "VnExpress - Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss", slug: "kinh-doanh" },
  { name: "VnExpress - Thể thao", url: "https://vnexpress.net/rss/the-thao.rss", slug: "the-thao" },
  { name: "VnExpress - Khoa học Công nghệ", url: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss", slug: "cong-nghe" },
  { name: "VnExpress - Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss", slug: "giai-tri" },
  { name: "VnExpress - Đời sống", url: "https://vnexpress.net/rss/gia-dinh.rss", slug: "doi-song" },
  { name: "VnExpress - Giáo dục", url: "https://vnexpress.net/rss/giao-duc.rss", slug: "giao-duc" },
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

            const existing = await prisma.article.findFirst({
              where: {
                OR: [{ sourceUrl: normalizedUrl }, { title: item.title }],
              },
            });

            if (existing) continue;

            // Fetch full content from source
            let fullContent = "";
            let fullExcerpt = item.excerpt;
            let fullImg = item.imageUrl;

            try {
              const detailRes = await safeFetch(normalizedUrl, { timeoutMs: 6000 });
              const extracted = extractArticleFromHtml(detailRes.text, normalizedUrl);
              if (extracted.extractedContent && extracted.extractedContent.length > 100) {
                fullContent = extracted.extractedContent;
              }
              if (extracted.excerpt) fullExcerpt = extracted.excerpt;
              if (extracted.imageUrl) fullImg = extracted.imageUrl;
            } catch {
              // fallback
            }

            if (!fullContent) {
              fullContent = `<p class="lead">${item.excerpt || ""}</p>`;
            }

            const uniqueSlug = `${slugify(item.title)}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`;

            await prisma.article.create({
              data: {
                title: item.title,
                slug: uniqueSlug,
                excerpt: fullExcerpt || `Tin tức thời sự từ ${feed.name}`,
                content: fullContent,
                featuredImage: fullImg,
                imageCaption: item.title,
                imageSource: "VnExpress",
                categoryId,
                status: "PUBLISHED",
                sourceType: "IMPORTED",
                sourceUrl: normalizedUrl,
                sourceName: "VnExpress",
                publishedAt: item.sourcePublishedAt || new Date(),
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
