import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { fetchRssFeed } from "@/lib/scraper/rssParser";
import { normalizeUrl, hashContent } from "@/lib/scraper/normalizer";
import { slugify } from "@/lib/utils";
import { safeFetch } from "@/lib/security";
import { extractArticleFromHtml } from "@/lib/scraper/htmlParser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("=== KHỞI TẠO DỮ LIỆU TỰ ĐỘNG CHO TOÀN CẢNH 24H ===");

    // 1. Tạo tài khoản Admin
    const adminPasswordHash = await bcrypt.hash("Admin@ToanCanh24h2026!", 10);
    const admin = await prisma.user.upsert({
      where: { email: "admin@toancanh24h.vn" },
      update: {},
      create: {
        name: "Ban Biên Tập Toàn Cảnh 24h",
        email: "admin@toancanh24h.vn",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    // 2. Tạo 8 danh mục báo chí chuẩn
    const categoriesData = [
      { name: "Thời sự", slug: "thoi-su", description: "Tin tức thời sự trong nước", sortOrder: 1 },
      { name: "Thế giới", slug: "the-gioi", description: "Thời sự quốc tế 24h", sortOrder: 2 },
      { name: "Kinh doanh", slug: "kinh-doanh", description: "Kinh tế, tài chính, thị trường", sortOrder: 3 },
      { name: "Công nghệ", slug: "cong-nghe", description: "Trí tuệ nhân tạo, thiết bị số", sortOrder: 4 },
      { name: "Giáo dục", slug: "giao-duc", description: "Chính sách giáo dục, tuyển sinh", sortOrder: 5 },
      { name: "Đời sống", slug: "doi-song", description: "Sức khỏe, gia đình, phong cách sống", sortOrder: 6 },
      { name: "Thể thao", slug: "the-thao", description: "Bóng đá, thể thao trong nước và quốc tế", sortOrder: 7 },
      { name: "Giải trí", slug: "giai-tri", description: "Văn hóa, nghệ thuật, phim ảnh", sortOrder: 8 },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of categoriesData) {
      const c = await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
        create: { ...cat, isActive: true },
      });
      categoryMap[cat.slug] = c.id;
    }

    // 3. Khởi tạo 9 nguồn tin VnExpress & quét ngay tin mới nhất
    const feeds = [
      { name: "VnExpress - Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss", slug: "thoi-su" },
      { name: "VnExpress - Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss", slug: "the-gioi" },
      { name: "VnExpress - Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss", slug: "kinh-doanh" },
      { name: "VnExpress - Công nghệ", url: "https://vnexpress.net/rss/so-hoa.rss", slug: "cong-nghe" },
      { name: "VnExpress - Thể thao", url: "https://vnexpress.net/rss/the-thao.rss", slug: "the-thao" },
      { name: "VnExpress - Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss", slug: "giai-tri" },
    ];

    let totalImported = 0;

    for (const f of feeds) {
      const categoryId = categoryMap[f.slug];
      if (!categoryId) continue;

      const source = await prisma.newsSource.upsert({
        where: { id: (await prisma.newsSource.findFirst({ where: { feedUrl: f.url } }))?.id || "temp-id" },
        update: { isActive: true, scrapeMode: "AUTO_PUBLISH" },
        create: {
          name: f.name,
          homepageUrl: "https://vnexpress.net",
          feedUrl: f.url,
          defaultCategoryId: categoryId,
          scrapeMode: "AUTO_PUBLISH",
          pollingIntervalMinutes: 15,
          isActive: true,
        },
      });

      // Lấy 4 bài mỗi chuyên mục để lấp đầy giao diện ngay lập tức
      try {
        const items = await fetchRssFeed(f.url);
        for (const item of items.slice(0, 4)) {
          const normalized = normalizeUrl(item.originalUrl);
          const existing = await prisma.article.findFirst({ where: { sourceUrl: normalized } });
          if (existing) continue;

          let fullContent = "";
          let fullExcerpt = item.excerpt;
          let fullImg = item.imageUrl;

          try {
            const res = await safeFetch(normalized, { timeoutMs: 6000 });
            const ext = extractArticleFromHtml(res.text, normalized);
            if (ext.extractedContent && ext.extractedContent.length > 100) {
              fullContent = ext.extractedContent;
            }
            if (ext.excerpt) fullExcerpt = ext.excerpt;
            if (ext.imageUrl) fullImg = ext.imageUrl;
          } catch {
            // fallback
          }

          if (!fullContent) {
            fullContent = `<p class="lead">${item.excerpt || ""}</p>`;
          }

          const uniqueSlug = `${slugify(item.title)}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`;
          await prisma.article.create({
            data: {
              title: item.title,
              slug: uniqueSlug,
              excerpt: fullExcerpt || `Tin tức thời sự từ ${f.name}`,
              content: fullContent,
              featuredImage: fullImg,
              imageCaption: item.title,
              imageSource: "VnExpress",
              categoryId,
              status: "PUBLISHED",
              isFeatured: totalImported < 5, // 5 bài đầu tiên làm tin tiêu điểm nổi bật
              sourceType: "IMPORTED",
              sourceUrl: normalized,
              sourceName: "VnExpress",
              publishedAt: item.sourcePublishedAt || new Date(),
            },
          });

          totalImported++;
        }
      } catch (err: any) {
        console.warn(`Lỗi khi quét ${f.name}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Khởi tạo thành công toàn bộ danh mục và bài báo từ VnExpress!",
      totalArticlesImported: totalImported,
      adminLogin: "admin@toancanh24h.vn / Admin@ToanCanh24h2026!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi khởi tạo" }, { status: 500 });
  }
}
