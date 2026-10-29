import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Đang khởi tạo dữ liệu chuẩn cho NHỊP SỐNG 247...");

  // 1. Tạo tài khoản Quản trị viên & Biên tập viên
  const adminPasswordHash = await bcrypt.hash("Admin@NhipSong247Password!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nhipsong247.vn" },
    update: {},
    create: {
      name: "Ban Biên Tập NHỊP SỐNG 247",
      email: "admin@nhipsong247.vn",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Đã tạo tài khoản quản trị NHỊP SỐNG 247:");
  console.log("   - Admin: admin@nhipsong247.vn / Admin@NhipSong247Password!");

  // 2. Tạo 8 danh mục báo chí chuẩn mực
  const categoriesData = [
    { name: "Thời sự", slug: "thoi-su", description: "Tin tức chính trị, xã hội, sự kiện nổi bật trong nước", sortOrder: 1 },
    { name: "Thế giới", slug: "the-gioi", description: "Thời sự quốc tế, phân tích chiến lược toàn cầu", sortOrder: 2 },
    { name: "Kinh doanh", slug: "kinh-doanh", description: "Kinh tế vĩ mô, thị trường tài chính, chứng khoán, bất động sản", sortOrder: 3 },
    { name: "Công nghệ", slug: "cong-nghe", description: "Trí tuệ nhân tạo, thiết bị số, chuyển đổi số, an ninh mạng", sortOrder: 4 },
    { name: "Giáo dục", slug: "giao-duc", description: "Chính sách giáo dục, tuyển sinh, hướng nghiệp, học đường", sortOrder: 5 },
    { name: "Đời sống", slug: "doi-song", description: "Sức khỏe, gia đình, ẩm thực, du lịch và phong cách sống", sortOrder: 6 },
    { name: "Thể thao", slug: "the-thao", description: "Bóng đá Việt Nam, Ngoại hạng Anh, thể thao trong nước và quốc tế", sortOrder: 7 },
    { name: "Giải trí", slug: "giai-tri", description: "Điện ảnh, âm nhạc, nghệ thuật và văn hóa đại chúng", sortOrder: 8 },
  ];

  const catMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: { ...cat, isActive: true },
    });
    catMap[cat.slug] = record.id;
  }
  console.log("✅ Đã khởi tạo 8 chuyên mục tin tức báo chí.");

  // 3. Khởi tạo 9 Nguồn tin tự động cập nhật liên tục từ VnExpress (AUTO_PUBLISH)
  const vnExpressFeeds = [
    { name: "VnExpress - Tin mới nhất", feedUrl: "https://vnexpress.net/rss/tin-moi-nhat.rss", home: "https://vnexpress.net", slug: "thoi-su" },
    { name: "VnExpress - Thời sự", feedUrl: "https://vnexpress.net/rss/thoi-su.rss", home: "https://vnexpress.net/thoi-su", slug: "thoi-su" },
    { name: "VnExpress - Thế giới", feedUrl: "https://vnexpress.net/rss/the-gioi.rss", home: "https://vnexpress.net/the-gioi", slug: "the-gioi" },
    { name: "VnExpress - Kinh doanh", feedUrl: "https://vnexpress.net/rss/kinh-doanh.rss", home: "https://vnexpress.net/kinh-doanh", slug: "kinh-doanh" },
    { name: "VnExpress - Khoa học Công nghệ", feedUrl: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss", home: "https://vnexpress.net/khoa-hoc-cong-nghe", slug: "cong-nghe" },
    { name: "VnExpress - Giáo dục", feedUrl: "https://vnexpress.net/rss/giao-duc.rss", home: "https://vnexpress.net/giao-duc", slug: "giao-duc" },
    { name: "VnExpress - Đời sống", feedUrl: "https://vnexpress.net/rss/gia-dinh.rss", home: "https://vnexpress.net/gia-dinh", slug: "doi-song" },
    { name: "VnExpress - Thể thao", feedUrl: "https://vnexpress.net/rss/the-thao.rss", home: "https://vnexpress.net/the-thao", slug: "the-thao" },
    { name: "VnExpress - Giải trí", feedUrl: "https://vnexpress.net/rss/giai-tri.rss", home: "https://vnexpress.net/giai-tri", slug: "giai-tri" },
  ];

  for (const feed of vnExpressFeeds) {
    const categoryId = catMap[feed.slug] || Object.values(catMap)[0];
    const existing = await prisma.newsSource.findFirst({ where: { feedUrl: feed.feedUrl } });
    if (existing) {
      await prisma.newsSource.update({
        where: { id: existing.id },
        data: {
          scrapeMode: "AUTO_PUBLISH",
          pollingIntervalMinutes: 15,
          isActive: true,
        },
      });
    } else {
      await prisma.newsSource.create({
        data: {
          name: feed.name,
          homepageUrl: feed.home,
          feedUrl: feed.feedUrl,
          defaultCategoryId: categoryId,
          scrapeMode: "AUTO_PUBLISH",
          pollingIntervalMinutes: 15,
          isActive: true,
        },
      });
    }
  }
  console.log("✅ Đã thiết lập 9 luồng quét tự động VnExpress (AUTO_PUBLISH).");

  // 4. Nạp toàn bộ dữ liệu bài báo thực tế từ initial-data.json (700+ bài)
  const initialDataPath = path.join(__dirname, "initial-data.json");
  if (fs.existsSync(initialDataPath)) {
    console.log("📦 Tìm thấy initial-data.json. Bắt đầu nạp bài báo thực tế...");
    try {
      const raw = fs.readFileSync(initialDataPath, "utf-8");
      const data = JSON.parse(raw);
      const articles = data.articles || [];
      const defaultCatId = Object.values(catMap)[0];

      let insertedCount = 0;
      const CHUNK_SIZE = 50;

      for (let i = 0; i < articles.length; i += CHUNK_SIZE) {
        const chunk = articles.slice(i, i + CHUNK_SIZE);
        const payloads = chunk.map((art: any) => ({
          title: art.title,
          subtitle: art.subtitle || null,
          slug: art.slug,
          excerpt: art.excerpt || "",
          content: art.content || "",
          featuredImage: art.featuredImage || null,
          imageCaption: art.imageCaption || null,
          imageSource: art.imageSource || null,
          categoryId: catMap[art.categorySlug] || defaultCatId,
          status: art.status || "PUBLISHED",
          isFeatured: art.isFeatured || false,
          sourceName: art.sourceName || "VnExpress",
          sourceUrl: art.sourceUrl || null,
          sourceAuthor: art.sourceAuthor || null,
          viewsCount: art.viewsCount || Math.floor(Math.random() * 800) + 120,
          sharesCount: art.sharesCount || Math.floor(Math.random() * 50) + 5,
          publishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
          createdAt: art.createdAt ? new Date(art.createdAt) : new Date(),
          updatedAt: art.updatedAt ? new Date(art.updatedAt) : new Date(),
        }));

        try {
          const res = await (prisma.article as any).createMany({
            data: payloads,
            skipDuplicates: true,
          });
          insertedCount += res.count;
        } catch {
          // If batch insert fails (e.g. SQLite doesn't support skipDuplicates in older engines), fallback upsert
          for (const p of payloads) {
            try {
              await prisma.article.upsert({
                where: { slug: p.slug },
                update: {},
                create: p,
              });
              insertedCount++;
            } catch {}
          }
        }
      }

      console.log(`✅ Đã nạp thành công ${insertedCount} bài báo vào cơ sở dữ liệu!`);
    } catch (e: any) {
      console.warn("⚠️ Gặp lỗi khi nạp initial-data.json:", e.message);
    }
  }

  // 5. Cấu hình Site Settings NHỊP SỐNG 247
  const defaultSettings = [
    { key: "siteName", value: "NHỊP SỐNG 247" },
    { key: "siteDescription", value: "Báo điện tử tin tức thời sự hàng đầu Việt Nam và Quốc tế - Cập nhật liên tục 24/7" },
    { key: "contactEmail", value: "toasoan@nhipsong247.vn" },
    { key: "footerText", value: "© 2026 NHỊP SỐNG 247. Cơ quan ngôn luận và xuất bản tin tức điện tử." },
    { key: "articlesPerPage", value: "12" },
  ];

  for (const set of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { key: set.key },
      update: { value: set.value },
      create: set,
    });
  }
  console.log("✅ Đã khởi tạo cấu hình hệ thống NHỊP SỐNG 247.");
  console.log("🎉 Hoàn tất nạp dữ liệu hoàn chỉnh!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
