import prisma from "../src/lib/prisma";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";

async function populateFullContent() {
  console.log("==================================================================");
  console.log("   MTK NEWS — ĐIỀN TOÀN BỘ NỘI DUNG CHI TIẾT VÀO BÀI VIẾT (FULL BODY)   ");
  console.log("==================================================================");

  // 1. First, find and update the Carrick article requested by user
  const carrickArticle = await prisma.article.findFirst({
    where: { title: { contains: "Carrick" } },
  });

  if (carrickArticle && carrickArticle.sourceUrl) {
    console.log(`\n🎯 Đang lấy toàn văn bài viết: "${carrickArticle.title}"...`);
    try {
      const fetched = await safeFetch(carrickArticle.sourceUrl);
      const extracted = extractArticleFromHtml(fetched.text, carrickArticle.sourceUrl);

      if (extracted.extractedContent && extracted.extractedContent.length > 200) {
        await prisma.article.update({
          where: { id: carrickArticle.id },
          data: {
            content: extracted.extractedContent,
            excerpt: extracted.excerpt || carrickArticle.excerpt,
            featuredImage: extracted.imageUrl || carrickArticle.featuredImage,
          },
        });
        console.log(`✅ Đã cập nhật toàn văn bài viết Carrick (${extracted.extractedContent.length} ký tự)!`);
      }
    } catch (err: any) {
      console.error("Lỗi khi cập nhật bài Carrick:", err.message);
    }
  }

  // 2. Query articles that still have the short placeholder content
  const placeholderArticles = await prisma.article.findMany({
    where: {
      sourceUrl: { not: null },
      OR: [
        { content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" } },
        { content: { contains: "Tin tổng hợp dẫn nguồn" } },
      ],
    },
    take: 60, // Update the top 60 recent articles immediately
  });

  console.log(`\n🔄 Tìm thấy ${placeholderArticles.length} bài viết cần điền nội dung chi tiết...`);

  let updatedCount = 0;
  for (const art of placeholderArticles) {
    if (!art.sourceUrl) continue;
    try {
      const fetched = await safeFetch(art.sourceUrl, { timeoutMs: 10000 });
      const extracted = extractArticleFromHtml(fetched.text, art.sourceUrl);

      if (extracted.extractedContent && extracted.extractedContent.length > 200) {
        await prisma.article.update({
          where: { id: art.id },
          data: {
            content: extracted.extractedContent,
            excerpt: extracted.excerpt || art.excerpt,
            featuredImage: extracted.imageUrl || art.featuredImage,
          },
        });
        updatedCount++;
        process.stdout.write(`.` );
      }
    } catch {
      // Continue next if single article fetch fails
    }
  }

  console.log(`\n\n🎉 Hoàn tất! Đã điền đầy đủ toàn văn nội dung cho ${updatedCount} bài viết.`);
}

populateFullContent()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
