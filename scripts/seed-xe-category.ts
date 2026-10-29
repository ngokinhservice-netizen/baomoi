import prisma from "../src/lib/prisma";
import { fetchRssFeed } from "../src/lib/scraper/rssParser";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";
import { slugify, cleanArticleTitle } from "../src/lib/utils";
import { normalizeUrl } from "../src/lib/scraper/normalizer";

async function main() {
  console.log("=== 1. TẠO HOẶC CẬP NHẬT CHUYÊN MỤC 'XE' ===");
  const category = await prisma.category.upsert({
    where: { slug: "xe" },
    update: {
      name: "Xe",
      isActive: true,
      sortOrder: 9,
      description: "Thị trường ô tô, xe máy, xe điện, đánh giá xe, văn hóa giao thông",
    },
    create: {
      name: "Xe",
      slug: "xe",
      isActive: true,
      sortOrder: 9,
      description: "Thị trường ô tô, xe máy, xe điện, đánh giá xe, văn hóa giao thông",
    },
  });
  console.log("Category Xe ID:", category.id);

  console.log("\n=== 2. THU THẬP BÀI BÁO TỪ VNEXPRESS OTO-XE-MAY ===");
  const items = await fetchRssFeed("https://vnexpress.net/rss/oto-xe-may.rss");
  console.log(`Tìm thấy ${items.length} bài viết từ RSS Xe.`);

  let imported = 0;
  for (const item of items.slice(0, 8)) {
    const cleanTitle = cleanArticleTitle(item.title);
    const normUrl = normalizeUrl(item.originalUrl);

    const existing = await prisma.article.findFirst({
      where: {
        OR: [{ sourceUrl: normUrl }, { title: cleanTitle }],
      },
    });

    if (existing) {
      if (existing.categoryId !== category.id) {
        await prisma.article.update({
          where: { id: existing.id },
          data: { categoryId: category.id },
        });
      }
      continue;
    }

    let fullContent = "";
    let fullExcerpt = item.excerpt;
    let fullImg = item.imageUrl;
    let pubDate = item.sourcePublishedAt;

    try {
      const detailRes = await safeFetch(normUrl, { timeoutMs: 5000 });
      const extracted = extractArticleFromHtml(detailRes.text, normUrl);
      if (extracted.extractedContent) fullContent = extracted.extractedContent;
      if (extracted.imageUrl) fullImg = extracted.imageUrl;
      if (extracted.sourcePublishedAt) pubDate = extracted.sourcePublishedAt;
      if (extracted.excerpt) fullExcerpt = extracted.excerpt;
    } catch {
      // fallback
    }

    const uniqueSlug = `${slugify(cleanTitle)}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    await prisma.article.create({
      data: {
        title: cleanTitle,
        slug: uniqueSlug,
        excerpt: fullExcerpt || "Tin tức chuyên mục Xe từ VnExpress",
        content: fullContent || `<p class="lead">${fullExcerpt || ""}</p>`,
        featuredImage: fullImg,
        imageCaption: cleanTitle,
        imageSource: "VnExpress Xe",
        categoryId: category.id,
        status: "PUBLISHED",
        sourceType: "IMPORTED",
        sourceUrl: normUrl,
        sourceName: "VnExpress",
        publishedAt: pubDate || new Date(),
      },
    });
    imported++;
    console.log(`[Đã nhập] ${cleanTitle}`);
  }

  console.log(`Hoàn tất! Đã thêm mới ${imported} bài viết mục Xe.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
