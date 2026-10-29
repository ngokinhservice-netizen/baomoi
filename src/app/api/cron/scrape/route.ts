import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runScraperJob } from "@/lib/scraper/engine";
import { syncVnExpressHomepageMirror } from "@/lib/scraper/homepageMirror";
import { cleanupDuplicateArticlesInDb } from "@/lib/dbCleanup";

export async function GET(req: NextRequest) {
  return handleCronScrape(req);
}

export async function POST(req: NextRequest) {
  return handleCronScrape(req);
}

async function handleCronScrape(req: NextRequest) {
  try {
    // Check authorization: Bearer CRON_SECRET or query ?secret=
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const secretQuery = searchParams.get("secret");

    const validSecret = process.env.CRON_SECRET || "nhipsong-cron-secret-token-2026";
    const isLegacySecret = secretQuery === "mtk-cron-secret-token-change-in-production";
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.includes("vercel-cron");

    const isAuthorized =
      isVercelCron ||
      isLegacySecret ||
      (authHeader && authHeader === `Bearer ${validSecret}`) ||
      secretQuery === validSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Không được phép truy cập cron endpoint." }, { status: 401 });
    }

    // 1. Luôn đồng bộ chuẩn xác trang chủ VnExpress ngay lập tức (Hero, Tiêu điểm, Dòng sự kiện)
    try {
      await syncVnExpressHomepageMirror();
    } catch (mErr: any) {
      console.warn("Lỗi sync mirror trang chủ:", mErr.message);
    }

    const now = new Date();

    // Auto-bootstrap categories and news sources if database is freshly created
    let activeSources = await prisma.newsSource.findMany({
      where: { isActive: true },
    });

    if (activeSources.length === 0) {
      // 1. Categories
      const categoriesData = [
        { name: "Thời sự", slug: "thoi-su", description: "Tin tức chính trị, xã hội, sự kiện nổi bật trong nước", sortOrder: 1 },
        { name: "Thế giới", slug: "the-gioi", description: "Thời sự quốc tế, phân tích chiến lược toàn cầu", sortOrder: 2 },
        { name: "Kinh doanh", slug: "kinh-doanh", description: "Kinh tế vĩ mô, thị trường tài chính, chứng khoán", sortOrder: 3 },
        { name: "Công nghệ", slug: "cong-nghe", description: "Trí tuệ nhân tạo, thiết bị số, chuyển đổi số", sortOrder: 4 },
        { name: "Giáo dục", slug: "giao-duc", description: "Chính sách giáo dục, tuyển sinh, hướng nghiệp", sortOrder: 5 },
        { name: "Đời sống", slug: "doi-song", description: "Sức khỏe, gia đình, ẩm thực, du lịch", sortOrder: 6 },
        { name: "Thể thao", slug: "the-thao", description: "Bóng đá Việt Nam, Ngoại hạng Anh, thể thao", sortOrder: 7 },
        { name: "Giải trí", slug: "giai-tri", description: "Điện ảnh, âm nhạc, nghệ thuật và văn hóa", sortOrder: 8 },
      ];

      const catMap: Record<string, string> = {};
      for (const cat of categoriesData) {
        const c = await prisma.category.upsert({
          where: { slug: cat.slug },
          update: {},
          create: { ...cat, isActive: true },
        });
        catMap[cat.slug] = c.id;
      }

      // 2. VnExpress Feeds with AUTO_PUBLISH mode
      const feeds = [
        { name: "VnExpress - Tin nổi bật", feedUrl: "https://vnexpress.net/rss/tin-noi-bat.rss", home: "https://vnexpress.net", slug: "thoi-su" },
        { name: "VnExpress - Thời sự", feedUrl: "https://vnexpress.net/rss/thoi-su.rss", home: "https://vnexpress.net/thoi-su", slug: "thoi-su" },
        { name: "VnExpress - Tin mới nhất", feedUrl: "https://vnexpress.net/rss/tin-moi-nhat.rss", home: "https://vnexpress.net", slug: "thoi-su" },
        { name: "VnExpress - Thế giới", feedUrl: "https://vnexpress.net/rss/the-gioi.rss", home: "https://vnexpress.net/the-gioi", slug: "the-gioi" },
        { name: "VnExpress - Kinh doanh", feedUrl: "https://vnexpress.net/rss/kinh-doanh.rss", home: "https://vnexpress.net/kinh-doanh", slug: "kinh-doanh" },
        { name: "VnExpress - Khoa học Công nghệ", feedUrl: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss", home: "https://vnexpress.net/khoa-hoc-cong-nghe", slug: "cong-nghe" },
        { name: "VnExpress - Giáo dục", feedUrl: "https://vnexpress.net/rss/giao-duc.rss", home: "https://vnexpress.net/giao-duc", slug: "giao-duc" },
        { name: "VnExpress - Đời sống", feedUrl: "https://vnexpress.net/rss/gia-dinh.rss", home: "https://vnexpress.net/gia-dinh", slug: "doi-song" },
        { name: "VnExpress - Thể thao", feedUrl: "https://vnexpress.net/rss/the-thao.rss", home: "https://vnexpress.net/the-thao", slug: "the-thao" },
        { name: "VnExpress - Giải trí", feedUrl: "https://vnexpress.net/rss/giai-tri.rss", home: "https://vnexpress.net/giai-tri", slug: "giai-tri" },
      ];

      for (const f of feeds) {
        if (!catMap[f.slug]) continue;
        await prisma.newsSource.create({
          data: {
            name: f.name,
            homepageUrl: f.home,
            feedUrl: f.feedUrl,
            defaultCategoryId: catMap[f.slug],
            scrapeMode: "AUTO_PUBLISH",
            pollingIntervalMinutes: 15,
            isActive: true,
          },
        });
      }

      activeSources = await prisma.newsSource.findMany({ where: { isActive: true } });
    }

    const force = searchParams.get("force") === "true";
    const sourcesDueForScraping = activeSources.filter((source) => {
      if (force) return true;
      if (!source.lastCheckedAt) return true;
      const elapsedMinutes = (now.getTime() - new Date(source.lastCheckedAt).getTime()) / (1000 * 60);
      return elapsedMinutes >= source.pollingIntervalMinutes;
    });

    const results = [];

    // Process sequentially or with concurrency 2 to avoid overwhelming resources
    for (const source of sourcesDueForScraping) {
      try {
        const res = await runScraperJob(source.id, { maxArticles: 15 });
        results.push({ sourceId: source.id, name: source.name, result: res });
      } catch (err: any) {
        results.push({ sourceId: source.id, name: source.name, error: err.message });
      }
    }

    // Đảm bảo sau khi cào RSS xong, trang chủ luôn soi gương chuẩn xác tuyệt đối theo VnExpress
    try {
      await syncVnExpressHomepageMirror();
    } catch (mErr: any) {
      console.warn("Lỗi sync mirror trang chủ:", mErr.message);
    }

    // Tự động quét dọn toàn bộ bài viết trùng lặp sau mỗi lần cào
    try {
      await cleanupDuplicateArticlesInDb();
    } catch (cErr: any) {
      console.warn("Lỗi cleanup duplicate:", cErr.message);
    }

    return NextResponse.json({
      success: true,
      totalActiveSources: activeSources.length,
      dueSourcesCount: sourcesDueForScraping.length,
      processed: results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi cron" }, { status: 500 });
  }
}
