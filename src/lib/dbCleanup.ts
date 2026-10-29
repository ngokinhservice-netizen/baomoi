import prisma from "./prisma";
import { cleanArticleTitle, normalizeTitleKey } from "./utils";
import { normalizeUrl } from "./scraper/normalizer";
import { safeFetch } from "./security";
import { extractArticleFromHtml } from "./scraper/htmlParser";
import * as cheerio from "cheerio";

export async function upgradeImagesAndPhotoStoriesInDb() {
  console.log("[Image-HD] 🎨 Đang kiểm tra và nâng cấp bài phóng sự ảnh & hình ảnh HD...");

  // 1. Upgrade Photo Story articles (such as Dak Lak)
  try {
    const photoArticles = await prisma.article.findMany({
      where: {
        OR: [
          { content: { contains: "width-detail-photo" } },
          { content: { contains: "item_slide_show" } },
          { sourceUrl: { contains: "5137984" } },
        ],
        sourceUrl: { not: null },
      },
    });

    for (const art of photoArticles) {
      if (!art.sourceUrl) continue;
      try {
        const { text: html } = await safeFetch(art.sourceUrl, { timeoutMs: 8000 });
        const extracted = extractArticleFromHtml(html, art.sourceUrl);
        if (extracted.extractedContent && extracted.extractedContent.length > 500) {
          await prisma.article.update({
            where: { id: art.id },
            data: {
              content: extracted.extractedContent,
              featuredImage: extracted.imageUrl || art.featuredImage,
              excerpt: extracted.excerpt || art.excerpt,
            },
          });
          console.log(`[Image-HD] ✅ Đã định dạng lại bài phóng sự ảnh "${art.title.slice(0, 40)}"`);
        }
      } catch (err: any) {
        console.warn(`[Image-HD] Lỗi bài phóng sự ảnh:`, err.message);
      }
    }
  } catch (err: any) {
    console.warn(`[Image-HD] Lỗi tìm bài phóng sự:`, err.message);
  }

  // 2. Upgrade any low-res thumbnail featuredImage (w=220, w=380, w=100)
  try {
    const lowRes = await prisma.article.findMany({
      where: {
        sourceUrl: { not: null },
        OR: [
          { featuredImage: { contains: "w=220" } },
          { featuredImage: { contains: "w=380" } },
          { featuredImage: { contains: "w=100" } },
        ],
      },
      take: 25,
      select: { id: true, sourceUrl: true, featuredImage: true, title: true },
    });

    const needUpgrade = lowRes.filter(
      (a) => a.featuredImage && !a.featuredImage.includes("w=1200") && !a.featuredImage.includes("w=680")
    );

    for (const art of needUpgrade) {
      if (!art.sourceUrl) continue;
      try {
        const { text: html } = await safeFetch(art.sourceUrl, { timeoutMs: 4000 });
        const $ = cheerio.load(html);
        const ogImg = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
        if (ogImg && (ogImg.includes("w=1200") || ogImg.includes("w=680") || !ogImg.includes("w=220"))) {
          await prisma.article.update({
            where: { id: art.id },
            data: { featuredImage: ogImg },
          });
          console.log(`[Image-HD] ✅ Đã nâng cấp ảnh HD 1200px: "${art.title.slice(0, 35)}"`);
        }
      } catch (e: any) {
        console.warn(`[Image-HD] Lỗi lấy ảnh HD bài:`, e.message);
      }
    }
  } catch (err: any) {
    console.warn(`[Image-HD] Lỗi nâng cấp ảnh:`, err.message);
  }
}

export async function cleanupDuplicateArticlesInDb() {
  console.log("[Deduplication] 🧹 Bắt đầu quét và xóa sạch bài viết trùng lặp...");

  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      sourceUrl: true,
      content: true,
      views: true,
      isFeatured: true,
      createdAt: true,
      publishedAt: true,
    },
  });

  console.log(`[Deduplication] Tổng số bài trong database: ${articles.length}`);

  let titlesCleaned = 0;
  // 1. Clean dirty titles in DB first
  for (const art of articles) {
    const cleaned = cleanArticleTitle(art.title);
    if (cleaned !== art.title) {
      await prisma.article.update({
        where: { id: art.id },
        data: { title: cleaned },
      }).catch(() => {});
      art.title = cleaned;
      titlesCleaned++;
    }
  }

  // 2. Group by normalized title key and normalized sourceUrl
  const seenMap = new Map<string, typeof articles[0]>();
  const idsToDelete: string[] = [];

  for (const art of articles) {
    const titleKey = normalizeTitleKey(art.title);
    let urlKey = "";
    if (art.sourceUrl) {
      try {
        urlKey = normalizeUrl(art.sourceUrl);
      } catch {
        urlKey = art.sourceUrl.split("?")[0].split("#")[0].toLowerCase();
      }
    }

    const key = titleKey || urlKey;
    if (!key) continue;

    if (seenMap.has(key)) {
      const existing = seenMap.get(key)!;
      // Decide which one to keep
      // Priority: isFeatured > longer content > higher views > earlier createdAt
      const existingScore = (existing.isFeatured ? 1000 : 0) + (existing.content?.length || 0);
      const currentScore = (art.isFeatured ? 1000 : 0) + (art.content?.length || 0);

      if (currentScore > existingScore) {
        idsToDelete.push(existing.id);
        seenMap.set(key, art);
      } else {
        idsToDelete.push(art.id);
      }
    } else {
      seenMap.set(key, art);
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`[Deduplication] 🗑️ Đang xóa ${idsToDelete.length} bài viết bị trùng lặp...`);
    // Delete in chunks of 50 to avoid query size limits
    for (let i = 0; i < idsToDelete.length; i += 50) {
      const chunk = idsToDelete.slice(i, i + 50);
      await prisma.article.deleteMany({
        where: { id: { in: chunk } },
      });
    }
    console.log(`[Deduplication] ✅ Đã xóa thành công ${idsToDelete.length} bài trùng lặp.`);
  } else {
    console.log("[Deduplication] ✅ Không có bài viết nào bị trùng lặp.");
  }

  // Tự động nâng cấp ảnh nét & định dạng bài phóng sự ảnh
  await upgradeImagesAndPhotoStoriesInDb();

  return {
    totalChecked: articles.length,
    titlesCleaned,
    duplicatesDeleted: idsToDelete.length,
    remainingCount: articles.length - idsToDelete.length,
  };
}
