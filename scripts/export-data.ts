import prisma from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("=== EXPORT TOÀN BỘ DỮ LIỆU ĐỂ ĐỒNG BỘ LÊN VERCEL ===");

  const categories = await prisma.category.findMany();
  const newsSources = await prisma.newsSource.findMany();
  const articles = await prisma.article.findMany({
    include: {
      category: { select: { slug: true } }
    },
    orderBy: { publishedAt: "desc" }
  });

  console.log(`- Categories: ${categories.length}`);
  console.log(`- News Sources: ${newsSources.length}`);
  console.log(`- Articles: ${articles.length}`);

  const exportData = {
    exportedAt: new Date().toISOString(),
    categories: categories.map(c => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      sortOrder: c.sortOrder,
      isActive: c.isActive
    })),
    newsSources: newsSources.map(s => ({
      name: s.name,
      homepageUrl: s.homepageUrl,
      feedUrl: s.feedUrl,
      categorySlug: categories.find(c => c.id === s.defaultCategoryId)?.slug || "thoi-su",
      pollingIntervalMinutes: s.pollingIntervalMinutes,
      scrapeMode: s.scrapeMode,
      isActive: s.isActive
    })),
    articles: articles.map(a => ({
      title: a.title,
      subtitle: a.subtitle,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content,
      featuredImage: a.featuredImage,
      imageCaption: a.imageCaption,
      imageSource: a.imageSource,
      categorySlug: a.category?.slug || "thoi-su",
      status: a.status,
      isFeatured: a.isFeatured,
      sourceType: a.sourceType,
      sourceUrl: a.sourceUrl,
      sourceName: a.sourceName,
      publishedAt: a.publishedAt?.toISOString() || new Date().toISOString(),
    }))
  };

  const outputPath = path.join(__dirname, "../prisma/initial-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf8");

  const stat = fs.statSync(outputPath);
  console.log(`✅ Đã xuất dữ liệu ra file: ${outputPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
