import prisma from "../src/lib/prisma";

async function main() {
  const countWithPlaceholder = await prisma.article.count({
    where: {
      content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" }
    }
  });

  const countTotal = await prisma.article.count();
  const countWithFullContent = countTotal - countWithPlaceholder;

  console.log(`Tổng số bài viết trong hệ thống: ${countTotal}`);
  console.log(`Số bài viết ĐÃ CÓ TOÀN VĂN CHI TIẾT: ${countWithFullContent}`);
  console.log(`Số bài viết còn placeholder: ${countWithPlaceholder}`);
}

main().finally(() => prisma.$disconnect());
