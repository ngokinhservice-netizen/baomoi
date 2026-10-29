import prisma from "../src/lib/prisma";
import { syncVnExpressHomepageMirror } from "../src/lib/scraper/homepageMirror";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";
import { safeFetch } from "../src/lib/security";

async function main() {
  console.log("=== 1. ĐỒNG BỘ TRANG CHỦ THEO VNEXPRESS ===");
  const count = await syncVnExpressHomepageMirror();
  console.log(`Đã xử lý và đồng bộ ${count} bài viết từ VnExpress.`);

  console.log("\n=== 2. KIỂM TRA VÀ CẬP NHẬT THỜI GIAN ĐĂNG CHUẨN XÁC CHO TOÀN BỘ BÀI VIẾT ===");
  const articles = await prisma.article.findMany({
    where: {
      sourceUrl: { contains: "vnexpress.net" },
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      publishedAt: true,
      isFeatured: true,
    },
    take: 50,
  });

  console.log(`Tìm thấy ${articles.length} bài viết từ VnExpress trong cơ sở dữ liệu.`);

  let updatedCount = 0;
  for (const art of articles) {
    if (!art.sourceUrl) continue;
    try {
      const res = await safeFetch(art.sourceUrl, { timeoutMs: 3500 });
      const extracted = extractArticleFromHtml(res.text, art.sourceUrl);
      if (extracted.sourcePublishedAt) {
        const curTime = art.publishedAt?.getTime();
        const realTime = extracted.sourcePublishedAt.getTime();

        if (curTime !== realTime) {
          await prisma.article.update({
            where: { id: art.id },
            data: {
              publishedAt: extracted.sourcePublishedAt,
              featuredImage: extracted.imageUrl || undefined,
            },
          });
          updatedCount++;
          console.log(`[Cập nhật ngày chuẩn] "${art.title.slice(0, 35)}..." => ${extracted.sourcePublishedAt.toISOString()}`);
        }
      }
    } catch (e: any) {
      // Bỏ qua lỗi kết nối đơn lẻ
    }
  }

  console.log(`\nHoàn tất! Đã cập nhật ngày giờ chuẩn cho ${updatedCount} bài viết.`);

  console.log("\n=== 3. XEM 10 BÀI VIẾT MỚI NHẤT TRÊN WEBSITE SAU KHI ĐỒNG BỘ ===");
  const top10 = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      isFeatured: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  for (const a of top10) {
    console.log(`[${a.isFeatured ? "TIÊU ĐIỂM" : "BÌNH THƯỜNG"}] "${a.title.slice(0, 45)}..." => ${a.publishedAt?.toISOString()}`);
  }

  const spotlightSetting = await prisma.siteSetting.findUnique({
    where: { key: "homepage_spotlight_article_ids" },
  });
  console.log("\nSpotlight IDs in SiteSetting:", spotlightSetting?.value);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
