import prisma from "../src/lib/prisma";
import { fetchRssFeed } from "../src/lib/scraper/rssParser";
import { normalizeUrl, hashContent } from "../src/lib/scraper/normalizer";
import { slugify } from "../src/lib/utils";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(Date.now() - ONE_WEEK_MS);

interface FeedConfig {
  name: string;
  feedUrl: string;
  homepageUrl: string;
  categorySlug: string;
  isFeatured?: boolean;
}

const VNEXPRESS_FEEDS: FeedConfig[] = [
  {
    name: "VnExpress - Tin nổi bật",
    feedUrl: "https://vnexpress.net/rss/tin-noi-bat.rss",
    homepageUrl: "https://vnexpress.net",
    categorySlug: "thoi-su",
    isFeatured: true,
  },
  {
    name: "VnExpress - Tin mới nhất",
    feedUrl: "https://vnexpress.net/rss/tin-moi-nhat.rss",
    homepageUrl: "https://vnexpress.net",
    categorySlug: "thoi-su",
  },
  {
    name: "VnExpress - Thời sự",
    feedUrl: "https://vnexpress.net/rss/thoi-su.rss",
    homepageUrl: "https://vnexpress.net/thoi-su",
    categorySlug: "thoi-su",
  },
  {
    name: "VnExpress - Thế giới",
    feedUrl: "https://vnexpress.net/rss/the-gioi.rss",
    homepageUrl: "https://vnexpress.net/the-gioi",
    categorySlug: "the-gioi",
  },
  {
    name: "VnExpress - Kinh doanh",
    feedUrl: "https://vnexpress.net/rss/kinh-doanh.rss",
    homepageUrl: "https://vnexpress.net/kinh-doanh",
    categorySlug: "kinh-doanh",
  },
  {
    name: "VnExpress - Khoa học Công nghệ",
    feedUrl: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss",
    homepageUrl: "https://vnexpress.net/khoa-hoc-cong-nghe",
    categorySlug: "cong-nghe",
  },
  {
    name: "VnExpress - Giáo dục",
    feedUrl: "https://vnexpress.net/rss/giao-duc.rss",
    homepageUrl: "https://vnexpress.net/giao-duc",
    categorySlug: "giao-duc",
  },
  {
    name: "VnExpress - Đời sống",
    feedUrl: "https://vnexpress.net/rss/gia-dinh.rss",
    homepageUrl: "https://vnexpress.net/gia-dinh",
    categorySlug: "doi-song",
  },
  {
    name: "VnExpress - Thể thao",
    feedUrl: "https://vnexpress.net/rss/the-thao.rss",
    homepageUrl: "https://vnexpress.net/the-thao",
    categorySlug: "the-thao",
  },
  {
    name: "VnExpress - Giải trí",
    feedUrl: "https://vnexpress.net/rss/giai-tri.rss",
    homepageUrl: "https://vnexpress.net/giai-tri",
    categorySlug: "giai-tri",
  },
];

async function syncVnExpress() {
  console.log("==================================================================");
  console.log("    MTK NEWS — ĐỒNG BỘ TOÀN DIỆN VNEXPRESS (1 TUẦN QUA -> HIỆN TẠI)   ");
  console.log("==================================================================");
  console.log(`Mốc thời gian lấy tin: từ ${cutoffDate.toLocaleDateString("vi-VN")} đến nay.\n`);

  // 1. Get categories map
  const categories = await prisma.category.findMany();
  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.slug, c.id);
  }

  let totalDiscovered = 0;
  let totalImported = 0;
  let totalSkippedDup = 0;
  let totalOlder = 0;

  for (const cfg of VNEXPRESS_FEEDS) {
    const categoryId = categoryMap.get(cfg.categorySlug);
    if (!categoryId) {
      console.warn(`[Cảnh báo] Không tìm thấy category cho slug: ${cfg.categorySlug}`);
      continue;
    }

    // 2. Upsert NewsSource in database configured to AUTO_PUBLISH
    const source = await prisma.newsSource.upsert({
      where: { id: (await prisma.newsSource.findFirst({ where: { feedUrl: cfg.feedUrl } }))?.id || "temp-id" },
      update: {
        name: cfg.name,
        scrapeMode: "AUTO_PUBLISH", // Tự động xuất bản lên web khi có bài mới!
        pollingIntervalMinutes: 15,  // Quét mỗi 15 phút
        isActive: true,
        defaultCategoryId: categoryId,
      },
      create: {
        name: cfg.name,
        homepageUrl: cfg.homepageUrl,
        feedUrl: cfg.feedUrl,
        defaultCategoryId: categoryId,
        scrapeMode: "AUTO_PUBLISH",
        pollingIntervalMinutes: 15,
        isActive: true,
      },
    });

    console.log(`\n📡 Đang quét nguồn: "${cfg.name}" (${cfg.feedUrl})...`);

    try {
      const items = await fetchRssFeed(cfg.feedUrl);
      totalDiscovered += items.length;
      console.log(`   -> Tìm thấy ${items.length} bài viết trong RSS feed.`);

      let feedImported = 0;

      for (const item of items) {
        // Date check: skip if older than 1 week (if pubDate is available)
        if (item.sourcePublishedAt && item.sourcePublishedAt < cutoffDate) {
          totalOlder++;
          continue;
        }

        const normalizedUrl = normalizeUrl(item.originalUrl);

        // Deduplication check
        const existingScraped = await prisma.scrapedArticle.findFirst({
          where: {
            OR: [{ originalUrl: normalizedUrl }, { canonicalUrl: normalizedUrl }],
          },
        });

        const existingArticle = await prisma.article.findFirst({
          where: { sourceUrl: normalizedUrl },
        });

        if (existingScraped || existingArticle) {
          totalSkippedDup++;
          if (cfg.isFeatured) {
            const artId = existingArticle?.id || existingScraped?.linkedArticleId;
            if (artId) {
              await prisma.article.update({
                where: { id: artId },
                data: { isFeatured: true, publishedAt: item.sourcePublishedAt || new Date() },
              }).catch(() => {});
            }
          }
          continue;
        }

        const contentHash = item.excerpt ? hashContent(item.excerpt) : undefined;
        const slugBase = slugify(item.title);
        const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`;

        // Fetch full article HTML body from source
        let fullContent = "";
        let fullExcerpt = item.excerpt;
        let fullImage = item.imageUrl;

        try {
          const detailRes = await safeFetch(normalizedUrl, { timeoutMs: 8000 });
          const extracted = extractArticleFromHtml(detailRes.text, normalizedUrl);
          if (extracted.extractedContent && extracted.extractedContent.length > 100) {
            fullContent = extracted.extractedContent;
          }
          if (extracted.excerpt) fullExcerpt = extracted.excerpt;
          if (extracted.imageUrl) fullImage = extracted.imageUrl;
        } catch {
          // Fallback if detail fetch times out
        }

        if (!fullContent) {
          fullContent = `<p class="lead">${item.excerpt || ""}</p>`;
        }

        // Create Article in TOÀN CẢNH 24H
        const createdArticle = await prisma.article.create({
          data: {
            title: item.title,
            slug: uniqueSlug,
            excerpt: fullExcerpt || `Tin tức tổng hợp từ ${cfg.name}`,
            content: fullContent,
            featuredImage: fullImage,
            imageCaption: item.title,
            imageSource: "VnExpress",
            categoryId,
            status: "PUBLISHED",
            isFeatured: cfg.isFeatured || false,
            sourceType: "IMPORTED",
            sourceUrl: normalizedUrl,
            sourceName: "VnExpress",
            publishedAt: item.sourcePublishedAt || new Date(),
          },
        });

        // Record in ScrapedArticle
        await prisma.scrapedArticle.create({
          data: {
            sourceId: source.id,
            originalUrl: normalizedUrl,
            title: item.title,
            excerpt: item.excerpt,
            sourcePublishedAt: item.sourcePublishedAt,
            imageUrl: item.imageUrl,
            contentHash,
            processingStatus: "PUBLISHED",
            permissionStatus: "VERIFIED",
            linkedArticleId: createdArticle.id,
            processedAt: new Date(),
          },
        });

        feedImported++;
        totalImported++;
      }

      console.log(`   ✅ Đã nhập & tự động xuất bản: ${feedImported} bài mới.`);

      // Update source status
      await prisma.newsSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          lastError: null,
        },
      });
    } catch (err: any) {
      console.error(`   ❌ Lỗi khi quét ${cfg.name}:`, err.message);
    }
  }

  console.log("\n==================================================================");
  console.log("                      KẾT QUẢ ĐỒNG BỘ VNEXPRESS                   ");
  console.log("==================================================================");
  console.log(`• Tổng số bài phát hiện từ VnExpress:   ${totalDiscovered}`);
  console.log(`• Số bài mới đã TỰ ĐỘNG XUẤT BẢN:       ${totalImported}`);
  console.log(`• Số bài bị trùng (Deduplicated):        ${totalSkippedDup}`);
  console.log(`• Số bài quá 7 ngày bỏ qua:              ${totalOlder}`);
  console.log(`• Tất cả các nguồn VnExpress đã chuyển sang chế độ: AUTO_PUBLISH (Quét tự động mỗi 15 phút)`);
  console.log("==================================================================\n");
}

syncVnExpress()
  .catch((e) => {
    console.error("Lỗi đồng bộ:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
