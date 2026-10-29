import prisma from "../src/lib/prisma";

async function check() {
  const count = await prisma.article.count();
  console.log(`Tổng số bài viết trong database: ${count}`);

  const latest = await prisma.article.findMany({
    orderBy: { publishedAt: "desc" },
    take: 8,
    select: { title: true, publishedAt: true, sourceName: true, createdAt: true },
  });
  console.log("\nTop 8 bài viết mới nhất:");
  for (const a of latest) {
    console.log(`- [${a.publishedAt?.toISOString()}] ${a.title} (${a.sourceName})`);
  }

  const sources = await prisma.newsSource.findMany({
    select: { name: true, lastCheckedAt: true, scrapeMode: true, isActive: true, pollingIntervalMinutes: true },
  });
  console.log("\nTrạng thái các nguồn cào tin:");
  for (const s of sources) {
    console.log(`- ${s.name}: Mode=${s.scrapeMode}, Active=${s.isActive}, LastChecked=${s.lastCheckedAt?.toISOString() || "Chưa quét"}`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
