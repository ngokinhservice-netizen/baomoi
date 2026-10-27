import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, checkPermission, ROLES } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !checkPermission(session.role, ROLES.EDITOR)) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingArticles,
      activeSources,
      totalSources,
      totalScraped,
      pendingScraped,
      duplicateScraped,
      successfulScrapes,
      failedScrapes,
      recentAuditLogs,
      recentArticles,
      categoryStats,
      sourceStats,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { status: "PENDING" } }),
      prisma.newsSource.count({ where: { isActive: true } }),
      prisma.newsSource.count(),
      prisma.scrapedArticle.count(),
      prisma.scrapedArticle.count({ where: { processingStatus: "PENDING" } }),
      prisma.scrapedArticle.count({ where: { processingStatus: "DUPLICATE" } }),
      prisma.scrapeJob.count({ where: { status: "COMPLETED" } }),
      prisma.scrapeJob.count({ where: { status: "FAILED" } }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.article.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { articles: true } },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.newsSource.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { scrapedArticles: true, jobs: true } },
        },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      counts: {
        totalArticles,
        publishedArticles,
        draftArticles,
        pendingArticles,
        activeSources,
        totalSources,
        totalScraped,
        pendingScraped,
        duplicateScraped,
        successfulScrapes,
        failedScrapes,
      },
      recentAuditLogs,
      recentArticles,
      categoryStats,
      sourceStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
