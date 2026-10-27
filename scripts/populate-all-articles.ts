import prisma from "../src/lib/prisma";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function populateAllArticles() {
  console.log("==================================================================");
  console.log("   TOÀN CẢNH 24H — TIẾP TỤC ĐỒNG BỘ NỘI DUNG CHI TIẾT (BATCH 2)   ");
  console.log("==================================================================");

  const articlesToUpdate = await prisma.article.findMany({
    where: {
      sourceUrl: { not: null },
      content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" },
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      excerpt: true,
      featuredImage: true,
    },
  });

  console.log(`\n📦 Còn lại ${articlesToUpdate.length} bài viết cần cập nhật toàn văn...`);
  if (articlesToUpdate.length === 0) {
    console.log("Tất cả bài viết đã có nội dung đầy đủ!");
    return;
  }

  const BATCH_SIZE = 3;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < articlesToUpdate.length; i += BATCH_SIZE) {
    const batch = articlesToUpdate.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (art) => {
        if (!art.sourceUrl) return;
        try {
          const res = await safeFetch(art.sourceUrl, { timeoutMs: 15000 });
          const extracted = extractArticleFromHtml(res.text, art.sourceUrl);

          if (extracted.extractedContent && extracted.extractedContent.length > 150) {
            await prisma.article.update({
              where: { id: art.id },
              data: {
                content: extracted.extractedContent,
                excerpt: extracted.excerpt || art.excerpt,
                featuredImage: extracted.imageUrl || art.featuredImage,
              },
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      })
    );

    await sleep(150);

    const progress = Math.min(i + BATCH_SIZE, articlesToUpdate.length);
    const percent = Math.round((progress / articlesToUpdate.length) * 100);
    process.stdout.write(`\rTiến độ: ${progress}/${articlesToUpdate.length} (${percent}%) | Thành công: ${successCount} | Bỏ qua (404/video): ${failCount}`);
  }

  console.log(`\n\n🎉 Hoàn thành cập nhật: ${successCount} bài thành công, ${failCount} bài bỏ qua.`);
}

populateAllArticles()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
