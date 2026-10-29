import prisma from "@/lib/prisma";
import * as cheerio from "cheerio";
import { safeFetch } from "../security";
import { extractArticleFromHtml } from "./htmlParser";
import { normalizeUrl } from "./normalizer";
import { slugify, cleanArticleTitle } from "../utils";

let isMirrorSyncActive = false;
let lastMirrorSyncTime = 0;
const MIRROR_INTERVAL_MS = 3 * 60 * 1000; // 3 phút đồng bộ một lần

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
  const { text: html } = await safeFetch("https://vnexpress.net", { timeoutMs: 8000 });
  const $ = cheerio.load(html);

  // 1. Get Categories Map
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catMap = new Map<string, string>();
  for (const c of categories) catMap.set(c.slug, c.id);
  const defaultCatId = catMap.get("thoi-su") || Array.from(catMap.values())[0];

  function detectCategory(url: string): string {
    const u = url.toLowerCase();
    if (u.includes("/the-gioi")) return catMap.get("the-gioi") || defaultCatId;
    if (u.includes("/kinh-doanh") || u.includes("/bat-dong-san")) return catMap.get("kinh-doanh") || defaultCatId;
    if (u.includes("/khoa-hoc") || u.includes("/so-hoa")) return catMap.get("cong-nghe") || defaultCatId;
    if (u.includes("/giao-duc")) return catMap.get("giao-duc") || defaultCatId;
    if (u.includes("/gia-dinh") || u.includes("/suc-khoe") || u.includes("/du-lich")) return catMap.get("doi-song") || defaultCatId;
    if (u.includes("/the-thao")) return catMap.get("the-thao") || defaultCatId;
    if (u.includes("/giai-tri")) return catMap.get("giai-tri") || defaultCatId;
    return defaultCatId;
  }

  // Collect articles from VnExpress Homepage
  const targetArticles: Array<{
    title: string;
    url: string;
    excerpt: string;
    imageUrl?: string;
    isHero: boolean;
    isFeatured: boolean;
    priorityOrder: number;
  }> = [];

  // 2. Extract HERO Article (Tin tiêu điểm lớn nhất đầu trang VnExpress)
  const heroEl = $("article.article-topstory, article.item-news.full-thumb, .wrapper-topstory article").first();
  const heroRawTitle = heroEl.find(".title-news a, h2 a, h3 a").first().text().trim();
  const heroTitle = cleanArticleTitle(heroRawTitle);
  const heroUrl = heroEl.find(".title-news a, h2 a, h3 a").first().attr("href");
  const heroDesc = heroEl.find(".description a, p.description").first().text().trim();
  const heroImg =
    heroEl.find("picture source").attr("srcset")?.split(" ")[0] ||
    heroEl.find("picture img").attr("data-src") ||
    heroEl.find("picture img").attr("src") ||
    heroEl.find("img").attr("data-src") ||
    heroEl.find("img").attr("src");

  if (heroTitle && heroUrl) {
    targetArticles.push({
      title: heroTitle,
      url: heroUrl,
      excerpt: heroDesc,
      imageUrl: heroImg,
      isHero: true,
      isFeatured: true,
      priorityOrder: 0,
    });
  }

  // 3. Extract SUB-TOPSTORIES (Khung tiêu điểm cạnh Hero trên VnExpress)
  $(".wrapper-topstory-folder .col-left article.item-news, .col-left.col-small article.item-news").slice(0, 4).each((i, el) => {
    const rawTitle = $(el).find(".title-news a, h2 a, h3 a").first().text().trim();
    const title = cleanArticleTitle(rawTitle);
    const url = $(el).find(".title-news a, h2 a, h3 a").first().attr("href");
    const desc = $(el).find(".description a, p.description").first().text().trim();
    const img =
      $(el).find("picture source").attr("srcset")?.split(" ")[0] ||
      $(el).find("picture img").attr("data-src") ||
      $(el).find("picture img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      $(el).find("img").attr("src");

    if (title && url && title !== heroTitle && !targetArticles.some((a) => a.title === title || a.url === url)) {
      targetArticles.push({
        title,
        url,
        excerpt: desc,
        imageUrl: img,
        isHero: false,
        isFeatured: true,
        priorityOrder: i + 1,
      });
    }
  });

  // 4. Extract STREAM ARTICLES (Dòng sự kiện mới nhất trên trang chủ VnExpress)
  $("article.item-news").slice(4, 20).each((i, el) => {
    const rawTitle = $(el).find(".title-news a, h2 a, h3 a").first().text().trim();
    const title = cleanArticleTitle(rawTitle);
    const url = $(el).find(".title-news a, h2 a, h3 a").first().attr("href");
    const desc = $(el).find(".description a, p.description").first().text().trim();
    const img =
      $(el).find("picture img").attr("data-src") ||
      $(el).find("picture img").attr("src") ||
      $(el).find("img").attr("data-src") ||
      $(el).find("img").attr("src");

    if (title && url && !targetArticles.some((a) => a.title === title || a.url === url)) {
      targetArticles.push({
        title,
        url,
        excerpt: desc,
        imageUrl: img,
        isHero: false,
        isFeatured: false,
        priorityOrder: i + 10,
      });
    }
  });

  // 5. Reset previous isFeatured flags so ONLY current VnExpress topstories are featured
  await prisma.article.updateMany({
    where: { isFeatured: true },
    data: { isFeatured: false },
  });

  // 6. Process and Upsert each article in order
  const now = Date.now();
  let count = 0;

  for (const item of targetArticles) {
    const normalizedUrl = normalizeUrl(item.url);
    const categoryId = detectCategory(normalizedUrl);
    // Hero has the newest timestamp (now), sub-featured stories are strictly ordered descending
    const simulatedDate = new Date(now - item.priorityOrder * 60 * 1000);

    const existing = await prisma.article.findFirst({
      where: {
        OR: [{ sourceUrl: normalizedUrl }, { title: item.title }],
      },
    });

    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data: {
          isFeatured: item.isFeatured,
          publishedAt: simulatedDate,
          featuredImage: item.imageUrl || existing.featuredImage,
          excerpt: item.excerpt || existing.excerpt,
        },
      });
    } else {
      // For new articles, only fetch full detail page for the HERO story if necessary
      let fullContent = `<p class="lead">${item.excerpt || ""}</p>`;
      let fullExcerpt = item.excerpt;
      let fullImg = item.imageUrl;

      if (item.isHero) {
        try {
          const detailRes = await safeFetch(normalizedUrl, { timeoutMs: 3500 });
          const extracted = extractArticleFromHtml(detailRes.text, normalizedUrl);
          if (extracted.extractedContent && extracted.extractedContent.length > 100) {
            fullContent = extracted.extractedContent;
          }
          if (extracted.excerpt) fullExcerpt = extracted.excerpt;
          if (extracted.imageUrl) fullImg = extracted.imageUrl;
        } catch {
          // Fallback to excerpt
        }
      }

      const uniqueSlug = `${slugify(item.title)}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;

      await prisma.article.create({
        data: {
          title: item.title,
          slug: uniqueSlug,
          excerpt: fullExcerpt || `Tin tức thời sự từ VnExpress`,
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
          publishedAt: simulatedDate,
        },
      });
    }

    count++;
  }

  return count;
}
