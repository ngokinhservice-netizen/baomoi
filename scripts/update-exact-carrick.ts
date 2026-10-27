import prisma from "../src/lib/prisma";
import { safeFetch } from "../src/lib/security";
import { extractArticleFromHtml } from "../src/lib/scraper/htmlParser";

async function main() {
  console.log("=== CẬP NHẬT CHÍNH XÁC BÀI VIẾT CARRICK TRONG ẢNH CỦA USER ===");
  const targetId = "cmvqdzkcu0121110j5zvjcxxh";
  const carrickArt = await prisma.article.findUnique({ where: { id: targetId } });
  
  if (carrickArt && carrickArt.sourceUrl) {
    console.log(`Đang cào toàn văn bài gốc: ${carrickArt.sourceUrl}`);
    const res = await safeFetch(carrickArt.sourceUrl);
    const extracted = extractArticleFromHtml(res.text, carrickArt.sourceUrl);
    
    console.log(`Tiêu đề: ${extracted.title}`);
    console.log(`Độ dài nội dung trích xuất: ${extracted.extractedContent?.length} ký tự`);
    console.log(`Nội dung preview:\n${extracted.extractedContent?.slice(0, 400)}...\n`);
    
    await prisma.article.update({
      where: { id: targetId },
      data: {
        title: "Carrick tiếp tục dẫn dắt Man Utd sau cuộc họp khẩn",
        content: extracted.extractedContent,
        excerpt: extracted.excerpt || carrickArt.excerpt,
        featuredImage: extracted.imageUrl || carrickArt.featuredImage,
      }
    });
    console.log("✅ ĐÃ CẬP NHẬT XONG BÀI VIẾT CARRICK CỦA USER!");
  }

  // Restore the other article title if needed
  const otherArticle = await prisma.article.findUnique({ where: { id: "cmvqdz9t90095110jaa54lspz" } });
  if (otherArticle && otherArticle.sourceUrl) {
    const res = await safeFetch(otherArticle.sourceUrl);
    const extracted = extractArticleFromHtml(res.text, otherArticle.sourceUrl);
    await prisma.article.update({
      where: { id: "cmvqdz9t90095110jaa54lspz" },
      data: {
        title: extracted.title || "Vì sao cầu thủ Man Utd không còn nghe lời Carrick?",
        content: extracted.extractedContent || otherArticle.content,
      }
    });
  }

  // Count remaining placeholder articles
  const remaining = await prisma.article.count({
    where: {
      content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" }
    }
  });
  console.log(`\nSố bài viết còn lại có đoạn text tạm: ${remaining}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
