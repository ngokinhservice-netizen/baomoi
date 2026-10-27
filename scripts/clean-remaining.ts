import prisma from "../src/lib/prisma";

async function main() {
  const remaining = await prisma.article.findMany({
    where: {
      content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" }
    }
  });

  console.log(`Cleaning ${remaining.length} remaining articles...`);
  for (const art of remaining) {
    // If it has excerpt, make it a clean, nicely formatted brief summary article with credit
    const cleanContent = `
      <p class="text-lg font-medium leading-relaxed mb-4 text-gray-800">${art.excerpt || art.title}</p>
      <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 mt-6">
        <p class="font-semibold text-gray-800 mb-1">Thông tin sự kiện / Đa phương tiện</p>
        <p>Bản tin tổng hợp ghi nhận từ chuyên mục ${art.sourceName || "VnExpress"}. Bạn đọc có thể xem thêm tư liệu và video gốc tại liên kết nguồn đính kèm bên dưới.</p>
      </div>
    `.trim();

    await prisma.article.update({
      where: { id: art.id },
      data: { content: cleanContent }
    });
  }

  const finalCheck = await prisma.article.count({
    where: {
      content: { contains: "Nội dung chi tiết được cập nhật từ VnExpress" }
    }
  });

  console.log(`Hoàn tất! Số bài còn placeholder cũ: ${finalCheck}`);
}

main().finally(() => prisma.$disconnect());
