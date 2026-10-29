import prisma from "@/lib/prisma";
import * as cheerio from "cheerio";
import { safeFetch } from "../security";
import { extractArticleFromHtml } from "./htmlParser";
import { fetchRssFeed } from "./rssParser";
import { normalizeUrl } from "./normalizer";
import { slugify, cleanArticleTitle } from "../utils";

let isMirrorSyncActive = false;
let lastMirrorSyncTime = 0;
const MIRROR_INTERVAL_MS = 2 * 60 * 1000; // 2 phút đồng bộ một lần

export async function checkAndSyncHomepageMirror() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }

  const now = Date.now();
  if (isMirrorSyncActive || now - lastMirrorSyncTime < MIRROR_INTERVAL_MS) {
    return;
  }

  isMirrorSyncActive = true;
  lastMirrorSyncTime = now;

  try {
    console.log("[Homepage-Mirror] 🔄 Đang tự động soi gương trang chủ VnExpress...");
    await syncVnExpressHomepageMirror();
    console.log("[Homepage-Mirror] ✅ Hoàn tất cập nhật đồng nhất trang chủ theo VnExpress!");
  } catch (err: any) {
    console.warn("[Homepage-Mirror] Cảnh báo lỗi:", err.message);
  } finally {
    isMirrorSyncActive = false;
  }
}

export async function syncVnExpressHomepageMirror() {
  // 1. Tải song song HTML trang chủ VnExpress và các RSS feed chính để lấy thời gian xuất bản chuẩn xác nhất
  const [homeRes, latestRss, topRss, thoiSuRss, kinhDoanhRss, xeRss] = await Promise.all([
    safeFetch("https://vnexpress.net", { timeoutMs: 8000 }),
    fetchRssFeed("https://vnexpress.net/rss/tin-moi-nhat.rss").catch(() => []),
    fetchRssFeed("https://vnexpress.net/rss/tin-noi-bat.rss").catch(() => []),
    fetchRssFeed("https://vnexpress.net/rss/thoi-su.rss").catch(() => []),
    fetchRssFeed("https://vnexpress.net/rss/kinh-doanh.rss").catch(() => []),
    fetchRssFeed("https://vnexpress.net/rss/oto-xe-may.rss").catch(() => []),
  ]);
  const $ = cheerio.load(homeRes.text);

  // Xây dựng bản đồ thời gian xuất bản chuẩn xác từ RSS của VnExpress
  const rssDateMap = new Map<string, Date>();
  for (const item of [...latestRss, ...topRss, ...thoiSuRss, ...kinhDoanhRss, ...xeRss]) {
    if (item.sourcePublishedAt) {
      if (item.originalUrl) rssDateMap.set(normalizeUrl(item.originalUrl), item.sourcePublishedAt);
      if (item.title) rssDateMap.set(cleanArticleTitle(item.title).toLowerCase(), item.sourcePublishedAt);
    }
  }

  // 2. Lấy ánh xạ chuyên mục trong database
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catMap = new Map<string, string>();
  for (const c of categories) catMap.set(c.slug, c.id);
  const defaultCatId = catMap.get("thoi-su") || Array.from(catMap.values())[0];

  function detectCategory(url: string, extraContext: string = ""): string {
    const u = (url + " " + extraContext).toLowerCase();
    if (u.includes("thế giới") || u.includes("/the-gioi")) return catMap.get("the-gioi") || defaultCatId;
    if (u.includes("kinh doanh") || u.includes("bất động sản") || u.includes("/kinh-doanh") || u.includes("/bat-dong-san")) return catMap.get("kinh-doanh") || defaultCatId;
    if (u.includes("khoa học") || u.includes("số hóa") || u.includes("công nghệ") || u.includes("/khoa-hoc") || u.includes("/so-hoa")) return catMap.get("cong-nghe") || defaultCatId;
    if (u.includes("giáo dục") || u.includes("/giao-duc")) return catMap.get("giao-duc") || defaultCatId;
    if (u.includes("gia đình") || u.includes("sức khỏe") || u.includes("du lịch") || u.includes("đời sống") || u.includes("/gia-dinh") || u.includes("/suc-khoe") || u.includes("/du-lich")) return catMap.get("doi-song") || defaultCatId;
    if (u.includes("thể thao") || u.includes("/the-thao")) return catMap.get("the-thao") || defaultCatId;
    if (u.includes("giải trí") || u.includes("/giai-tri")) return catMap.get("giai-tri") || defaultCatId;
    if (u.includes("xe") || u.includes("ô tô") || u.includes("/oto-xe-may")) return catMap.get("xe") || defaultCatId;
    return defaultCatId;
  }

  function extractBestImage($container: cheerio.Cheerio<any>): string | undefined {
    const srcset = $container.find("picture source").attr("data-srcset") || $container.find("picture source").attr("srcset");
    if (srcset) {
      const parts = srcset.split(",").map((s) => s.trim().split(" ")[0]);
      const high = parts.find((p) => p.includes("w=1200")) || parts.find((p) => p.includes("w=680")) || parts[parts.length - 1];
      if (high) return high;
    }
    return (
      $container.find("picture img").attr("data-src") ||
      $container.find("picture img").attr("src") ||
      $container.find("img").attr("data-src") ||
      $container.find("img").attr("src")
    );
  }

  // 3. Thu thập danh sách bài viết từ trang chủ VnExpress
  const targetArticles: Array<{
    title: string;
    url: string;
    excerpt: string;
    imageUrl?: string;
    isHero: boolean;
    isFeatured: boolean;
    priorityOrder: number;
    rssPublishedAt?: Date;
  }> = [];

  // 3.1 HERO ARTICLE (Tin tiêu điểm lớn nhất vị trí top trang chủ VnExpress)
  const heroEl = $("article.article-topstory, article.item-news.full-thumb, .wrapper-topstory article").first();
  const heroRawTitle = heroEl.find(".title-news a, h2 a, h3 a").first().text().trim();
  const heroTitle = cleanArticleTitle(heroRawTitle);
  const heroUrl = heroEl.find(".title-news a, h2 a, h3 a").first().attr("href");
  const heroDesc = heroEl.find(".description a, p.description").first().text().trim();
  const heroImg = extractBestImage(heroEl);

  if (heroTitle && heroUrl) {
    const heroNormUrl = normalizeUrl(heroUrl);
    const heroDate = rssDateMap.get(heroNormUrl) || rssDateMap.get(heroTitle.toLowerCase());
    targetArticles.push({
      title: heroTitle,
      url: heroUrl,
      excerpt: heroDesc,
      imageUrl: heroImg,
      isHero: true,
      isFeatured: true,
      priorityOrder: 0,
      rssPublishedAt: heroDate,
    });
  }

  // 3.2 SUB-TOPSTORIES (Khung tiêu điểm cạnh Hero trên VnExpress)
  $(".wrapper-topstory-folder .col-left article.item-news, .col-left.col-small article.item-news").slice(0, 4).each((i, el) => {
    const rawTitle = $(el).find(".title-news a, h2 a, h3 a").first().text().trim();
    const title = cleanArticleTitle(rawTitle);
    const url = $(el).find(".title-news a, h2 a, h3 a").first().attr("href");
    const desc = $(el).find(".description a, p.description").first().text().trim();
    const img = extractBestImage($(el));

    if (title && url && title !== heroTitle && !targetArticles.some((a) => a.title === title || a.url === url)) {
      const normU = normalizeUrl(url);
      const dPub = rssDateMap.get(normU) || rssDateMap.get(title.toLowerCase());
      targetArticles.push({
        title,
        url,
        excerpt: desc,
        imageUrl: img,
        isHero: false,
        isFeatured: true,
        priorityOrder: i + 1,
        rssPublishedAt: dPub,
      });
    }
  });

  // 3.3 STREAM ARTICLES (Dòng sự kiện mới nhất trên trang chủ VnExpress)
  $("article.item-news").slice(4, 25).each((i, el) => {
    const rawTitle = $(el).find(".title-news a, h2 a, h3 a").first().text().trim();
    const title = cleanArticleTitle(rawTitle);
    const url = $(el).find(".title-news a, h2 a, h3 a").first().attr("href");
    const desc = $(el).find(".description a, p.description").first().text().trim();
    const img = extractBestImage($(el));

    if (title && url && !targetArticles.some((a) => a.title === title || a.url === url)) {
      const normU = normalizeUrl(url);
      const dPub = rssDateMap.get(normU) || rssDateMap.get(title.toLowerCase());
      targetArticles.push({
        title,
        url,
        excerpt: desc,
        imageUrl: img,
        isHero: false,
        isFeatured: false,
        priorityOrder: i + 10,
        rssPublishedAt: dPub,
      });
    }
  });

  // 3.4 Lấy thêm các bài vừa mới xuất bản từ RSS Tin mới nhất và RSS Xe để không bỏ sót bài vừa lên
  for (const item of [...latestRss.slice(0, 8), ...xeRss.slice(0, 6)]) {
    if (item.title && item.originalUrl && !targetArticles.some((a) => a.title === item.title || a.url === item.originalUrl)) {
      targetArticles.push({
        title: cleanArticleTitle(item.title),
        url: item.originalUrl,
        excerpt: item.excerpt || "",
        imageUrl: item.imageUrl,
        isHero: false,
        isFeatured: false,
        priorityOrder: 50,
        rssPublishedAt: item.sourcePublishedAt,
      });
    }
  }

  // 4. Lấy chi tiết song song theo từng đợt (chunks) để trích xuất ngày giờ chuẩn và nội dung HD
  const detailedMap = new Map<
    string,
    {
      sourcePublishedAt?: Date;
      imageUrl?: string;
      extractedContent?: string;
      excerpt?: string;
      categoryBreadcrumb?: string;
    }
  >();

  const chunkSize = 4;
  for (let i = 0; i < targetArticles.length; i += chunkSize) {
    const chunk = targetArticles.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (item) => {
        const normUrl = normalizeUrl(item.url);
        try {
          const detailRes = await safeFetch(normUrl, { timeoutMs: 6000 });
          const $detail = cheerio.load(detailRes.text);
          const breadcrumbText = $detail(".breadcrumb li a, .parent_cate, .breadcrumb a")
            .map((_, el) => $detail(el).text().trim())
            .get()
            .join(" ");

          const extracted = extractArticleFromHtml(detailRes.text, normUrl);
          detailedMap.set(normUrl, {
            sourcePublishedAt: extracted.sourcePublishedAt || item.rssPublishedAt,
            imageUrl: extracted.imageUrl,
            extractedContent: extracted.extractedContent,
            excerpt: extracted.excerpt,
            categoryBreadcrumb: breadcrumbText,
          });
        } catch {
          // Dùng dữ liệu cơ bản đã thu thập từ danh sách
          if (item.rssPublishedAt) {
            detailedMap.set(normUrl, { sourcePublishedAt: item.rssPublishedAt });
          }
        }
      })
    );
  }

  // 5. Cập nhật và lưu trữ vào Database
  const spotlightIds: string[] = [];
  let count = 0;

  for (const item of targetArticles) {
    const normalizedUrl = normalizeUrl(item.url);
    const detail = detailedMap.get(normalizedUrl);
    const categoryId = detectCategory(normalizedUrl, detail?.categoryBreadcrumb);

    const existing = await prisma.article.findFirst({
      where: {
        OR: [{ sourceUrl: normalizedUrl }, { title: item.title }],
      },
    });

    const fullImg = detail?.imageUrl || item.imageUrl || existing?.featuredImage;
    const fullContent = detail?.extractedContent || existing?.content || `<p class="lead">${item.excerpt || ""}</p>`;
    const fullExcerpt = detail?.excerpt || item.excerpt || existing?.excerpt || "Tin tức từ VnExpress";
    let realPublishedAt = detail?.sourcePublishedAt || item.rssPublishedAt || existing?.publishedAt;
    if (!realPublishedAt) {
      realPublishedAt = new Date(Date.now() - 30 * 60 * 1000);
    }
    // Prevent future dates caused by timezone offset mismatches
    if (realPublishedAt.getTime() > Date.now()) {
      if (realPublishedAt.getTime() - Date.now() > 5 * 3600 * 1000) {
        realPublishedAt = new Date(realPublishedAt.getTime() - 7 * 3600 * 1000);
      } else {
        realPublishedAt = new Date(Date.now() - 60 * 1000);
      }
    }

    let articleId = existing?.id;

    if (existing) {
      let finalPublishedAt = detail?.sourcePublishedAt || item.rssPublishedAt || existing.publishedAt;
      if (finalPublishedAt && finalPublishedAt.getTime() > Date.now()) {
        if (finalPublishedAt.getTime() - Date.now() > 5 * 3600 * 1000) {
          finalPublishedAt = new Date(finalPublishedAt.getTime() - 7 * 3600 * 1000);
        } else {
          finalPublishedAt = new Date(Date.now() - 60 * 1000);
        }
      }
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data: {
          isFeatured: item.isFeatured,
          publishedAt: finalPublishedAt,
          featuredImage: fullImg,
          content: fullContent,
          excerpt: fullExcerpt,
          categoryId,
        },
      });
      articleId = updated.id;
    } else {
      const uniqueSlug = `${slugify(item.title)}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
      const created = await prisma.article.create({
        data: {
          title: item.title,
          slug: uniqueSlug,
          excerpt: fullExcerpt,
          content: fullContent,
          featuredImage: fullImg,
          imageCaption: item.title,
          imageSource: "VnExpress",
          categoryId,
          status: "PUBLISHED",
          isFeatured: item.isFeatured,
          sourceType: "IMPORTED",
          sourceUrl: normalizedUrl,
          sourceName: "VnExpress",
          publishedAt: realPublishedAt,
        },
      });
      articleId = created.id;
    }

    if (item.isFeatured && articleId) {
      spotlightIds.push(articleId);
    }

    count++;
  }

  // 6. Ghi nhớ danh sách ID tiêu điểm trang chủ theo đúng thứ tự VnExpress (Hero đầu tiên, tiếp theo là tiêu điểm)
  if (spotlightIds.length > 0) {
    await prisma.siteSetting.upsert({
      where: { key: "homepage_spotlight_article_ids" },
      update: { value: JSON.stringify(spotlightIds) },
      create: {
        key: "homepage_spotlight_article_ids",
        value: JSON.stringify(spotlightIds),
      },
    });

    // Bỏ cờ isFeatured của những bài cũ không còn nằm trong tiêu điểm hiện tại
    await prisma.article.updateMany({
      where: {
        isFeatured: true,
        id: { notIn: spotlightIds },
      },
      data: { isFeatured: false },
    });
  }

  return count;
}
