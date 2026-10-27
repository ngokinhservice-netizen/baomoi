import prisma from "./prisma";
import fs from "fs";
import path from "path";

export async function syncAllLocalDataToDatabase() {
  console.log("=== BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TỪ LOCAL SANG VERCEL DATABASE ===");

  const dataPath = path.join(process.cwd(), "prisma/initial-data.json");
  if (!fs.existsSync(dataPath)) {
    console.warn("Không tìm thấy initial-data.json tại:", dataPath);
    return 0;
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(raw);

  // 1. Categories
  const catMap = new Map<string, string>();
  for (const cat of data.categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: { ...cat },
    });
    catMap.set(cat.slug, record.id);
  }

  // 2. Sources
  for (const src of data.newsSources) {
    const categoryId = catMap.get(src.categorySlug);
    if (!categoryId) continue;

    const existing = await prisma.newsSource.findFirst({ where: { feedUrl: src.feedUrl } });
    if (existing) {
      await prisma.newsSource.update({
        where: { id: existing.id },
        data: { isActive: true, scrapeMode: "AUTO_PUBLISH", pollingIntervalMinutes: 15 },
      });
    } else {
      await prisma.newsSource.create({
        data: {
          name: src.name,
          homepageUrl: src.homepageUrl,
          feedUrl: src.feedUrl,
          defaultCategoryId: categoryId,
          pollingIntervalMinutes: 15,
          scrapeMode: "AUTO_PUBLISH",
          isActive: true,
        },
      });
    }
  }

  // 3. Articles (Batch insert using createMany - fast in < 1 second)
  let importedCount = 0;
  const articles = data.articles || [];
  const defaultCatId = Array.from(catMap.values())[0];

  const articlePayloads = articles.map((art: any) => ({
    title: art.title,
    subtitle: art.subtitle,
    slug: art.slug,
    excerpt: art.excerpt,
    content: art.content,
    featuredImage: art.featuredImage,
    imageCaption: art.imageCaption,
    imageSource: art.imageSource,
    categoryId: catMap.get(art.categorySlug) || defaultCatId,
    status: art.status || "PUBLISHED",
    isFeatured: art.isFeatured || false,
    sourceType: art.sourceType || "IMPORTED",
    sourceUrl: art.sourceUrl,
    sourceName: art.sourceName || "VnExpress",
    publishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
  }));

  for (let i = 0; i < articlePayloads.length; i += 100) {
    const chunk = articlePayloads.slice(i, i + 100);
    try {
      const res = await prisma.article.createMany({
        data: chunk,
        // @ts-ignore
        skipDuplicates: true,
      });
      importedCount += res.count;
    } catch {
      // If error on chunk, insert individually to maximize successes
      for (const item of chunk) {
        try {
          await prisma.article.create({ data: item });
          importedCount++;
        } catch {}
      }
    }
  }

  console.log(`🎉 HOÀN THÀNH: Đã đồng bộ ${importedCount} bài báo vào database.`);
  return importedCount;
}
