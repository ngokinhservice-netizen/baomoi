import prisma from "./prisma";

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
    return await prisma.article.findMany({
      where: { status: "PUBLISHED", isFeatured: true },
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

export async function getLatestArticles(limit: number = 10) {
  try {
    return await prisma.article.findMany({
      where: { status: "PUBLISHED" },
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

export async function getMostReadArticles(limit: number = 5) {
  try {
    return await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function getArticlesByCategory(categorySlug: string, limit: number = 6) {
  try {
    return await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { slug: categorySlug },
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
