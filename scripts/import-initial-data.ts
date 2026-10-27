import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

export async function importInitialData() {
  console.log("=== BẮT ĐẦU ĐỒNG BỘ 525 BÀI BÁO TỪ LOCAL SANG DATABASE ===");
  const dataPath = path.join(__dirname, "../prisma/initial-data.json");
  if (!fs.existsSync(dataPath)) {
    console.log("Không tìm thấy file initial-data.json");
    return;
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
  console.log(`✅ Đã đồng bộ ${catMap.size} chuyên mục.`);

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
  console.log(`✅ Đã đồng bộ ${data.newsSources.length} nguồn cào tin VnExpress.`);

  // 3. Articles (Batch insert or loop)
  let importedCount = 0;
  const articles = data.articles || [];

  for (const art of articles) {
    const categoryId = catMap.get(art.categorySlug) || Array.from(catMap.values())[0];
    if (!categoryId) continue;

    const existing = await prisma.article.findFirst({
      where: {
        OR: [
          { slug: art.slug },
          ...(art.sourceUrl ? [{ sourceUrl: art.sourceUrl }] : [])
        ]
      }
    });

    if (existing) {
      continue;
    }

    await prisma.article.create({
      data: {
        title: art.title,
        subtitle: art.subtitle,
        slug: art.slug,
        excerpt: art.excerpt,
        content: art.content,
        featuredImage: art.featuredImage,
        imageCaption: art.imageCaption,
        imageSource: art.imageSource,
        categoryId,
        status: art.status || "PUBLISHED",
        isFeatured: art.isFeatured || false,
        sourceType: art.sourceType || "IMPORTED",
        sourceUrl: art.sourceUrl,
        sourceName: art.sourceName || "VnExpress",
        publishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
      }
    });

    importedCount++;
  }

  console.log(`🎉 HOÀN THÀNH: Đã đồng bộ thành công ${importedCount} bài báo mới!`);
  return importedCount;
}

if (require.main === module) {
  importInitialData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
