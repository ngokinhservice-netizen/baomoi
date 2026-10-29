import prisma from "./prisma";
import { normalizeTitleKey } from "./utils";

export function deduplicateArticles<T extends { id: string; title: string; sourceUrl?: string | null }>(articles: T[]): T[] {
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  const result: T[] = [];

  for (const art of articles) {
    const titleKey = normalizeTitleKey(art.title);
    const urlKey = art.sourceUrl ? art.sourceUrl.split("?")[0].split("#")[0].toLowerCase() : "";

    if (titleKey && seenTitles.has(titleKey)) continue;
    if (urlKey && seenUrls.has(urlKey)) continue;

    if (titleKey) seenTitles.add(titleKey);
    if (urlKey) seenUrls.add(urlKey);
    result.push(art);
  }

  return result;
}

export async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, description: true },
    });
  } catch {
    return [];
  }
}

export async function getFeaturedArticles(limit: number = 5) {
  try {
    // 1. Kiểm tra danh sách thứ tự tiêu điểm trang chủ soi gương chuẩn từ VnExpress
    const spotlightSetting = await prisma.siteSetting
      .findUnique({
        where: { key: "homepage_spotlight_article_ids" },
      })
      .catch(() => null);

    if (spotlightSetting?.value) {
      try {
        const spotlightIds: string[] = JSON.parse(spotlightSetting.value);
        if (Array.isArray(spotlightIds) && spotlightIds.length > 0) {
          const articles = await prisma.article.findMany({
            where: { id: { in: spotlightIds }, status: "PUBLISHED" },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              author: { select: { name: true } },
            },
          });

          const map = new Map(articles.map((a) => [a.id, a]));
          const sorted = spotlightIds.map((id) => map.get(id)).filter(Boolean) as typeof articles;
          const deduped = deduplicateArticles(sorted);
          if (deduped.length >= limit) {
            return deduped.slice(0, limit);
          }
          if (deduped.length > 0) {
            const existingIds = new Set(deduped.map((a) => a.id));
            const fillers = await prisma.article.findMany({
              where: {
                status: "PUBLISHED",
                isFeatured: true,
                id: { notIn: Array.from(existingIds) },
              },
              include: {
                category: { select: { id: true, name: true, slug: true } },
                author: { select: { name: true } },
              },
              orderBy: { publishedAt: "desc" },
              take: limit - deduped.length,
            });
            return deduplicateArticles([...deduped, ...fillers]).slice(0, limit);
          }
        }
      } catch {
        // Fallback bên dưới
      }
    }

    const featured = await prisma.article.findMany({
      where: { status: "PUBLISHED", isFeatured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit * 2,
    });

    const dedupedFeatured = deduplicateArticles(featured);
    if (dedupedFeatured.length >= limit) {
      return dedupedFeatured.slice(0, limit);
    }

    const featuredIds = dedupedFeatured.map((a) => a.id);
    const fillers = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        id: { notIn: featuredIds },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: (limit - dedupedFeatured.length) * 2,
    });

    return deduplicateArticles([...dedupedFeatured, ...fillers]).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLatestArticles(limit: number = 10) {
  try {
    const raw = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit * 2,
    });
    return deduplicateArticles(raw).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getMostReadArticles(limit: number = 5) {
  try {
    const raw = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
      take: limit * 2,
    });
    return deduplicateArticles(raw).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getArticlesByCategory(categorySlug: string, limit: number = 6) {
  try {
    const raw = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { slug: categorySlug },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit * 2,
    });
    return deduplicateArticles(raw).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string) {
  try {
    return await prisma.article.findUnique({
      where: { slug },
      include: {
        category: true,
        author: { select: { name: true, email: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function getRelatedArticles(categoryId: string, excludeId: string, limit: number = 4) {
  try {
    return await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        categoryId,
        NOT: { id: excludeId },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}
