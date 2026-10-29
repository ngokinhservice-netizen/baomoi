import prisma from "./prisma";
import { cleanArticleTitle, normalizeTitleKey } from "./utils";
import { normalizeUrl } from "./scraper/normalizer";

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

  return {
    totalChecked: articles.length,
    titlesCleaned,
    duplicatesDeleted: idsToDelete.length,
    remainingCount: articles.length - idsToDelete.length,
  };
}
